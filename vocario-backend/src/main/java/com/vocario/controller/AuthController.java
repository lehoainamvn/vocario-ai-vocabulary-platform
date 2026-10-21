package com.vocario.controller;

import com.vocario.dto.AuthDto;
import com.vocario.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "1. Authentication", description = "API Đăng ký, Đăng nhập và xác thực người dùng")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo tài khoản học viên mới với email và mật khẩu.")
    public ResponseEntity<AuthDto.AuthResponse> register(@Valid @RequestBody AuthDto.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Đăng nhập bằng username hoặc email để lấy Token truy cập.")
    public ResponseEntity<AuthDto.AuthResponse> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy hồ sơ người dùng hiện tại", description = "Truy vấn bảng users theo ID người dùng hoặc tài khoản demo.")
    public ResponseEntity<com.vocario.entity.User> getCurrentUser(@RequestParam(required = false) java.util.UUID userId) {
        return ResponseEntity.ok(authService.getUserProfile(userId));
    }

    @PutMapping("/profile")
    @Operation(summary = "Cập nhật hồ sơ học viên", description = "Cập nhật họ tên, mục tiêu cấp độ và số từ mục tiêu mỗi ngày.")
    public ResponseEntity<com.vocario.entity.User> updateProfile(
            @RequestParam java.util.UUID userId,
            @RequestBody AuthDto.UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(authService.updateProfile(userId, request));
    }

    @PostMapping("/level-up")
    @Operation(summary = "Thăng cấp trình độ học viên", description = "Tự động nâng targetLevel của học viên lên cấp độ CEFR tiếp theo khi hoàn thành chỉ tiêu.")
    public ResponseEntity<com.vocario.entity.User> levelUp(@RequestParam(required = false) java.util.UUID userId) {
        return ResponseEntity.ok(authService.levelUp(userId));
    }
}
