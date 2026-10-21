package com.vocario.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public class AuthDto {

    @Schema(description = "Yêu cầu đăng ký tài khoản")
    public static class RegisterRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Schema(example = "learner@vocario.com")
        public String email;

        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Schema(example = "vocario_user")
        public String username;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Schema(example = "Password123@")
        public String password;

        @Schema(example = "Nguyễn Văn A")
        public String fullName;
    }

    @Schema(description = "Yêu cầu đăng nhập")
    public static class LoginRequest {
        @NotBlank(message = "Tài khoản không được để trống")
        @Schema(example = "vocario_user")
        public String usernameOrEmail;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Schema(example = "Password123@")
        public String password;
    }

    @Schema(description = "Thông tin phản hồi đăng nhập")
    public static class AuthResponse {
        public UUID userId;
        public String email;
        public String username;
        public String fullName;
        public String token;
        public Integer streakCount;
        public String role;

        public AuthResponse(UUID userId, String email, String username, String fullName, String token, Integer streakCount, String role) {
            this.userId = userId;
            this.email = email;
            this.username = username;
            this.fullName = fullName;
            this.token = token;
            this.streakCount = streakCount;
            this.role = role != null ? role : "STUDENT";
        }

        public AuthResponse(UUID userId, String email, String username, String fullName, String token, Integer streakCount) {
            this(userId, email, username, fullName, token, streakCount, "STUDENT");
        }
    }

    @Schema(description = "Yêu cầu cập nhật hồ sơ người dùng")
    public static class UpdateProfileRequest {
        public String fullName;
        public String targetLevel;
        public Integer dailyGoal;
    }
}
