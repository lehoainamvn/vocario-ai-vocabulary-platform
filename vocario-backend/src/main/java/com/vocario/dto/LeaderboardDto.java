package com.vocario.dto;

import java.util.List;
import java.util.UUID;

public class LeaderboardDto {

    public static class LeaderboardEntry {
        public int rank;
        public UUID userId;
        public String username;
        public String fullName;
        public String avatarUrl;
        public String targetLevel;
        public int streakCount;
        public long masteredWords;
        public long totalReviews;
        public long totalCaptures;
        public long xp;
        public boolean isCurrentUser;

        public LeaderboardEntry() {}

        public LeaderboardEntry(int rank, UUID userId, String username, String fullName,
                                String avatarUrl, String targetLevel, int streakCount,
                                long masteredWords, long totalReviews, long totalCaptures,
                                long xp, boolean isCurrentUser) {
            this.rank = rank;
            this.userId = userId;
            this.username = username;
            this.fullName = fullName;
            this.avatarUrl = avatarUrl;
            this.targetLevel = targetLevel;
            this.streakCount = streakCount;
            this.masteredWords = masteredWords;
            this.totalReviews = totalReviews;
            this.totalCaptures = totalCaptures;
            this.xp = xp;
            this.isCurrentUser = isCurrentUser;
        }
    }

    public static class LeaderboardTargetInfo {
        public String targetUsername;
        public int targetRank;
        public long xpDiff;
        public String suggestion;

        public LeaderboardTargetInfo() {}

        public LeaderboardTargetInfo(String targetUsername, int targetRank, long xpDiff, String suggestion) {
            this.targetUsername = targetUsername;
            this.targetRank = targetRank;
            this.xpDiff = xpDiff;
            this.suggestion = suggestion;
        }
    }

    public static class LeaderboardResponse {
        public String period;
        public String level;
        public List<LeaderboardEntry> podium;        // Top 3 học viên cao nhất cho bục vinh danh
        public List<LeaderboardEntry> topUsers;      // Danh sách học viên thuộc trang hiện tại
        public LeaderboardEntry currentUserRank;     // Thứ hạng riêng của người dùng
        public LeaderboardTargetInfo nextTarget;     // Gợi ý vượt hạng
        public int page;                             // Trang hiện tại (0-indexed)
        public int size;                             // Kích thước trang
        public long totalElements;                   // Tổng số học viên
        public int totalPages;                       // Tổng số trang
        public boolean isFirst;
        public boolean isLast;

        public LeaderboardResponse() {}

        public LeaderboardResponse(String period, String level, List<LeaderboardEntry> podium,
                                   List<LeaderboardEntry> topUsers, LeaderboardEntry currentUserRank,
                                   LeaderboardTargetInfo nextTarget, int page, int size,
                                   long totalElements, int totalPages, boolean isFirst, boolean isLast) {
            this.period = period;
            this.level = level;
            this.podium = podium;
            this.topUsers = topUsers;
            this.currentUserRank = currentUserRank;
            this.nextTarget = nextTarget;
            this.page = page;
            this.size = size;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.isFirst = isFirst;
            this.isLast = isLast;
        }
    }
}
