package com.vocario.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(description = "Cấu trúc phản hồi lỗi chuẩn của hệ thống")
public class ErrorResponse {

    @Schema(example = "2026-09-23T22:35:00+07:00")
    public OffsetDateTime timestamp;

    @Schema(example = "400")
    public int status;

    @Schema(example = "Bad Request")
    public String error;

    @Schema(example = "Email 'student@vocario.edu.vn' đã tồn tại trong hệ thống")
    public String message;

    @Schema(example = "/api/auth/register")
    public String path;

    public ErrorResponse() {}

    public ErrorResponse(int status, String error, String message, String path) {
        this.timestamp = OffsetDateTime.now();
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }
}
