package com.vocario.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public class ReviewDto {

    @Schema(description = "Yêu cầu đánh giá thẻ từ vựng theo thuật toán SM-2")
    public static class ReviewRequest {
        @Schema(description = "ID của tiến trình từ vựng cần ôn tập (UUID hoặc ID tạm thời)")
        public String progressId;

        @Schema(description = "Từ vựng tiếng Anh (nếu từ chưa có tiến trình học)", example = "wall")
        public String wordText;

        @NotNull(message = "ratingGrade không được để trống")
        @Min(value = 0, message = "Điểm đánh giá tối thiểu là 0")
        @Max(value = 5, message = "Điểm đánh giá tối đa là 5")
        @Schema(description = "Điểm đánh giá SM-2 (0: Quên sạch, 1: Nhớ mang máng, 2: Sai nhưng nhớ lại ngay, 3: Đúng khá khó khăn, 4: Đúng sau đắn đo, 5: Nhớ hoàn hảo)", example = "4")
        public Integer ratingGrade;

        @Schema(description = "Loại bài tập ôn tập", example = "FLASHCARD")
        public String reviewType = "FLASHCARD";

        @Schema(description = "Điểm chấm phát âm nếu làm bài luyện nói (thang 0-100)", example = "88.5")
        public Double speechScore;

        @Schema(description = "Thời gian suy nghĩ (mili-giây)", example = "2500")
        public Integer responseTimeMs;
    }

    @Schema(description = "Kết quả sau khi thuật toán SM-2 tính toán chu kỳ mới")
    public static class ReviewResponse {
        public UUID progressId;
        public String word;
        public Integer repetitionNumber;
        public Double easinessFactor;
        public Integer intervalDays;
        public OffsetDateTime nextReviewDate;
        public String message;

        @Schema(description = "Chuỗi ngày học liên tục (Streak) hiện tại của học viên", example = "6")
        public Integer streakCount;

        @Schema(description = "Cờ báo hiệu chuỗi streak có vừa được tăng thêm 1 ngày trong phiên học này hay không", example = "true")
        public Boolean streakIncremented;

        @Schema(description = "Thông điệp chúc mừng / khích lệ chuỗi streak", example = "🔥 Tuyệt vời! Bạn đã nâng chuỗi lên 6 ngày học liên tiếp!")
        public String streakMessage;

        public ReviewResponse() {}

        public ReviewResponse(UUID progressId, String word, Integer repetitionNumber, Double easinessFactor, Integer intervalDays, OffsetDateTime nextReviewDate, String message) {
            this.progressId = progressId;
            this.word = word;
            this.repetitionNumber = repetitionNumber;
            this.easinessFactor = easinessFactor;
            this.intervalDays = intervalDays;
            this.nextReviewDate = nextReviewDate;
            this.message = message;
        }

        public ReviewResponse(UUID progressId, String word, Integer repetitionNumber, Double easinessFactor, Integer intervalDays, OffsetDateTime nextReviewDate, String message, Integer streakCount, Boolean streakIncremented, String streakMessage) {
            this(progressId, word, repetitionNumber, easinessFactor, intervalDays, nextReviewDate, message);
            this.streakCount = streakCount;
            this.streakIncremented = streakIncremented;
            this.streakMessage = streakMessage;
        }
    }
}
