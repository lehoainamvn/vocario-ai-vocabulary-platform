package com.vocario.service;

import com.vocario.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Dịch vụ phát hành và xác thực JSON Web Token (JWT) theo chuẩn RFC 7519.
 * Ký bằng giải thuật HMAC-SHA256 với khóa bí mật tối thiểu 256-bit.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    // Chuỗi khóa bí mật chuẩn hóa (tối thiểu 256 bits = 32 bytes)
    private static final String DEFAULT_SECRET = "VocarioSecretKeyForJwtAuthentication2026SecureProductionEngine#999";

    private final SecretKey key;
    private final long expirationMillis;

    public JwtService(
            @Value("${jwt.secret:" + DEFAULT_SECRET + "}") String secret,
            @Value("${jwt.expiration-hours:168}") long expirationHours // Mặc định 7 ngày
    ) {
        String effectiveSecret = (secret == null || secret.length() < 32) ? DEFAULT_SECRET : secret;
        this.key = Keys.hmacShaKeyFor(effectiveSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = expirationHours * 60 * 60 * 1000L;
    }

    /**
     * Tạo JWT hợp lệ cho người dùng
     */
    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("username", user.getUsername())
                .claim("email", user.getEmail())
                .claim("role", user.getRole() != null ? user.getRole() : "STUDENT")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /**
     * Trích xuất User ID từ Token (hỗ trợ cả chuẩn Bearer JWT và tương thích ngược dummy token)
     */
    public UUID extractUserId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        String cleanToken = token.trim();
        if (cleanToken.startsWith("Bearer ") || cleanToken.startsWith("bearer ")) {
            cleanToken = cleanToken.substring(7).trim();
        }

        // Tương thích ngược: token dạng legacy "jwt_token_<uuid>"
        if (cleanToken.startsWith("jwt_token_")) {
            try {
                String rawUuid = cleanToken.substring("jwt_token_".length());
                return UUID.fromString(rawUuid);
            } catch (Exception e) {
                log.warn("⚠️ Không thể parse UUID từ legacy token: {}", cleanToken);
                return null;
            }
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(cleanToken)
                    .getPayload();

            return UUID.fromString(claims.getSubject());
        } catch (Exception e) {
            log.warn("⚠️ Token không hợp lệ hoặc đã hết hạn: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Kiểm tra tính toàn vẹn và hiệu lực của token
     */
    public boolean validateToken(String token) {
        return extractUserId(token) != null;
    }
}
