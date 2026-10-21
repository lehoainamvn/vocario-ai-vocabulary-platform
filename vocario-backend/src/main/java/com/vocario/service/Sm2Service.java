package com.vocario.service;

import com.vocario.dto.AdminDto;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;

/**
 * THUẬT TOÁN SUPERMEMO 2 (SM-2) BẰNG JAVA
 * Chịu trách nhiệm tính toán chu kỳ lặp lại ngắt quãng (Spaced Repetition)
 */
@Service
public class Sm2Service {

    public static class Sm2CalculationResult {
        private final int repetitionNumber;
        private final double easinessFactor;
        private final int intervalDays;
        private final OffsetDateTime nextReviewDate;

        public Sm2CalculationResult(int repetitionNumber, double easinessFactor, int intervalDays, OffsetDateTime nextReviewDate) {
            this.repetitionNumber = repetitionNumber;
            this.easinessFactor = easinessFactor;
            this.intervalDays = intervalDays;
            this.nextReviewDate = nextReviewDate;
        }

        public int getRepetitionNumber() { return repetitionNumber; }
        public double getEasinessFactor() { return easinessFactor; }
        public int getIntervalDays() { return intervalDays; }
        public OffsetDateTime getNextReviewDate() { return nextReviewDate; }
    }

    /**
     * Tính toán các chỉ số chu kỳ tiếp theo dựa trên đánh giá của người học và cấu hình hệ thống:
     * @param ratingGrade 0-5 (0: quên sạch, 5: nhớ hoàn hảo)
     * @param currentRepetition Số lần lặp đúng liên tiếp hiện tại (n)
     * @param currentEf Hệ số dễ nhớ hiện tại (EF)
     * @param currentInterval Khoảng cách ngày lần trước (I)
     * @param reviewTime Thời điểm ôn tập
     * @param settings Cấu hình tham số thuật toán từ Quản Trị Viên (Admin)
     */
    public Sm2CalculationResult calculate(int ratingGrade, int currentRepetition, double currentEf, int currentInterval, OffsetDateTime reviewTime, AdminDto.SystemSettingsDto settings) {
        if (reviewTime == null) {
            reviewTime = OffsetDateTime.now();
        }

        double minEf = settings != null ? settings.minEasinessFactor : 1.30;
        int i1 = settings != null ? Math.max(1, settings.interval1Days) : 1;
        int i2 = settings != null ? Math.max(i1, settings.interval2Days) : 6;
        boolean strict = settings != null && settings.strictGrading;

        // 1. Giới hạn thang điểm 0 - 5
        int q = Math.max(0, Math.min(5, ratingGrade));

        // 2. Tính hệ số dễ nhớ mới: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        double newEf = currentEf + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (newEf < minEf) {
            newEf = minEf; // Ngưỡng sàn tối thiểu theo cấu hình Quản Trị
        }

        int newRepetition;
        int newInterval;

        // 3. Tính toán chu kỳ ngày ôn tập (Interval)
        if (q >= 3) {
            // Nhớ thành công (Pass)
            if (currentRepetition == 0) {
                newInterval = i1;
                newRepetition = 1;
            } else if (currentRepetition == 1) {
                newInterval = (strict && q == 3) ? Math.min(i2, i1 + 1) : i2;
                newRepetition = 2;
            } else {
                int calculated = (int) Math.round(currentInterval * newEf);
                newInterval = (strict && q == 3) ? Math.max(currentInterval + 1, (int) Math.round(currentInterval * 1.1)) : calculated;
                newRepetition = currentRepetition + 1;
            }
        } else {
            // Trả lời sai / Quên (Fail) -> Reset chu kỳ về bước 1
            newRepetition = 0;
            newInterval = i1;
        }

        OffsetDateTime nextReview = reviewTime.plusDays(newInterval);

        return new Sm2CalculationResult(newRepetition, newEf, newInterval, nextReview);
    }

    public Sm2CalculationResult calculate(int ratingGrade, int currentRepetition, double currentEf, int currentInterval, OffsetDateTime reviewTime) {
        return calculate(ratingGrade, currentRepetition, currentEf, currentInterval, reviewTime, null);
    }
}
