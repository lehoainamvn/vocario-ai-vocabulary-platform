package com.vocario.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Thông tin tiến độ mục tiêu CEFR và điều kiện thăng cấp")
public class TargetProgressDto {

    @Schema(description = "Cấp độ mục tiêu hiện tại của người học", example = "A2")
    public String currentLevel;

    @Schema(description = "Cấp độ tiếp theo khi đủ điều kiện thăng cấp", example = "B1")
    public String nextLevel;

    @Schema(description = "Tổng số từ học viên đã lưu ở cấp độ hiện tại", example = "8")
    public long totalWordsAtLevel;

    @Schema(description = "Số từ học viên đã thành thạo (MASTERED, lặp >= 5 lần) ở cấp độ hiện tại", example = "5")
    public long masteredWordsAtLevel;

    @Schema(description = "Số từ đang học hoặc đang ôn tập ở cấp độ hiện tại", example = "3")
    public long learningWordsAtLevel;

    @Schema(description = "Tỷ lệ phần trăm hoàn thành cấp độ hiện tại (0 - 100%)", example = "100")
    public int completionPercentage;

    @Schema(description = "Ngưỡng số từ thành thạo cần đạt để kích hoạt thăng cấp", example = "5")
    public int masteryThreshold;

    @Schema(description = "Cờ báo hiệu đã đủ điều kiện để thăng cấp lên level tiếp theo", example = "true")
    public boolean canLevelUp;

    @Schema(description = "Lời khuyên sư phạm cá nhân hóa từ hệ thống")
    public String recommendation;

    @Schema(description = "Phân bổ thống kê chi tiết theo từng cấp độ CEFR")
    public List<LevelBreakdown> levelBreakdowns;

    public TargetProgressDto() {}

    public TargetProgressDto(
            String currentLevel,
            String nextLevel,
            long totalWordsAtLevel,
            long masteredWordsAtLevel,
            long learningWordsAtLevel,
            int completionPercentage,
            int masteryThreshold,
            boolean canLevelUp,
            String recommendation,
            List<LevelBreakdown> levelBreakdowns
    ) {
        this.currentLevel = currentLevel;
        this.nextLevel = nextLevel;
        this.totalWordsAtLevel = totalWordsAtLevel;
        this.masteredWordsAtLevel = masteredWordsAtLevel;
        this.learningWordsAtLevel = learningWordsAtLevel;
        this.completionPercentage = completionPercentage;
        this.masteryThreshold = masteryThreshold;
        this.canLevelUp = canLevelUp;
        this.recommendation = recommendation;
        this.levelBreakdowns = levelBreakdowns;
    }

    public static class LevelBreakdown {
        public String level;
        public long totalCount;
        public long masteredCount;

        public LevelBreakdown() {}

        public LevelBreakdown(String level, long totalCount, long masteredCount) {
            this.level = level;
            this.totalCount = totalCount;
            this.masteredCount = masteredCount;
        }
    }
}
