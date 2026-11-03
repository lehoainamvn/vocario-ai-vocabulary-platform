package com.vocario.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bộ lọc kiểm soát tần suất truy cập (Rate Limiting Filter) theo thuật toán Cửa sổ trượt (Sliding Window).
 * Ngăn chặn tấn công DoS, brute-force mật khẩu và botnet spam tràn CSDL trên môi trường Cloud Render.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    // Cấu hình hạn mức tối đa (Lượt gọi / phút)
    private static final int AUTH_LIMIT_PER_MINUTE = 10;        // Đăng nhập, Đăng ký
    private static final int UPLOAD_LIMIT_PER_MINUTE = 15;      // Tải ảnh bối cảnh, Tạo lớp học
    private static final int GLOBAL_LIMIT_PER_MINUTE = 120;     // Các API truy vấn thông thường

    private static final long ONE_MINUTE_MILLIS = 60 * 1000L;

    // Bộ nhớ đệm lưu vết các mốc thời gian gọi API theo khóa (IP + Loại API)
    private final Map<String, Deque<Long>> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        // Bỏ qua các endpoint tĩnh hoặc tài liệu Swagger/OpenAPI
        if (!uri.startsWith("/api") || uri.startsWith("/v3/api-docs") || uri.startsWith("/swagger-ui")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = extractClientIp(request);
        String category = determineCategory(uri);
        int maxAllowed = getLimitForCategory(category);
        String rateLimitKey = clientIp + ":" + category;

        long now = System.currentTimeMillis();

        boolean allowed = checkRateLimit(rateLimitKey, now, maxAllowed);

        if (!allowed) {
            log.warn("🚨 [RATE LIMIT BLOCKED] IP {} đã vượt quá hạn ngạch gọi API '{}' ({}/phút)!", 
                    clientIp, uri, maxAllowed);

            response.setStatus(429); // 429 Too Many Requests
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(String.format(
                    "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Tần suất gửi yêu cầu quá nhanh (%d lượt/phút). Vui lòng thử lại sau 60 giây để đảm bảo an toàn hệ thống.\"}",
                    maxAllowed
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private synchronized boolean checkRateLimit(String key, long now, int maxAllowed) {
        Deque<Long> timestamps = requestCounts.computeIfAbsent(key, k -> new ArrayDeque<>());

        // Loại bỏ các mốc thời gian ngoài cửa sổ 60 giây
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > ONE_MINUTE_MILLIS) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxAllowed) {
            return false;
        }

        timestamps.addLast(now);

        // Định kỳ dọn dẹp các IP đã hết phiên nếu bộ đệm quá lớn
        if (requestCounts.size() > 5000) {
            requestCounts.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        }

        return true;
    }

    private String determineCategory(String uri) {
        if (uri.contains("/auth/login") || uri.contains("/auth/register")) {
            return "AUTH";
        }
        if (uri.contains("/save-capture") || uri.contains("/classrooms/create") || uri.contains("/words/save-custom")) {
            return "HEAVY_WRITE";
        }
        return "GENERAL";
    }

    private int getLimitForCategory(String category) {
        return switch (category) {
            case "AUTH" -> AUTH_LIMIT_PER_MINUTE;
            case "HEAVY_WRITE" -> UPLOAD_LIMIT_PER_MINUTE;
            default -> GLOBAL_LIMIT_PER_MINUTE;
        };
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }
}
