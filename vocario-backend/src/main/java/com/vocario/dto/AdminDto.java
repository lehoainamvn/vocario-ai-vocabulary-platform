package com.vocario.dto;

import com.vocario.entity.Word;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;


public class AdminDto {

    @Schema(description = "Thống kê tổng quan Cổng Quản Trị (Admin Dashboard KPI)")
    public static class AdminStats {
        public long totalUsers;
        public long totalWords;
        public long totalCaptures;
        public long totalReviews;
        public long masteredWords;
        public long learningWords;
        public double masteryRate;
        public List<CefrCount> cefrDistribution;
        public List<AdminActivity> recentActivities;

        public AdminStats() {}

        public AdminStats(long totalUsers, long totalWords, long totalCaptures, long totalReviews,
                          long masteredWords, long learningWords, double masteryRate,
                          List<CefrCount> cefrDistribution, List<AdminActivity> recentActivities) {
            this.totalUsers = totalUsers;
            this.totalWords = totalWords;
            this.totalCaptures = totalCaptures;
            this.totalReviews = totalReviews;
            this.masteredWords = masteredWords;
            this.learningWords = learningWords;
            this.masteryRate = masteryRate;
            this.cefrDistribution = cefrDistribution;
            this.recentActivities = recentActivities;
        }
    }

    public static class CefrCount {
        public String level;
        public long count;
        public double percentage;

        public CefrCount() {}

        public CefrCount(String level, long count, double percentage) {
            this.level = level;
            this.count = count;
            this.percentage = percentage;
        }
    }

    public static class AdminActivity {
        public String id;
        public String type; // CAPTURE, REVIEW, LEVEL_UP, REGISTER
        public String title;
        public String description;
        public String userName;
        public String timeAgo;
        public OffsetDateTime timestamp;

        public AdminActivity() {}

        public AdminActivity(String id, String type, String title, String description,
                             String userName, String timeAgo, OffsetDateTime timestamp) {
            this.id = id;
            this.type = type;
            this.title = title;
            this.description = description;
            this.userName = userName;
            this.timeAgo = timeAgo;
            this.timestamp = timestamp;
        }
    }

    @Schema(description = "Yêu cầu tạo mới hoặc cập nhật từ vựng CEFR")
    public static class WordRequest {
        public String word;
        public String partOfSpeech;
        public String phoneticIpa;
        public String vietnameseMeaning;
        public String definitionEn;
        public String cefrLevel;
        public String audioUrl;
        public String exampleSentenceEn;
        public String exampleSentenceVi;
        public String category;
    }

    @Schema(description = "Chi tiết mục từ trong kho từ điển Admin")
    public static class WordItemResponse {
        public UUID id;
        public String word;
        public String partOfSpeech;
        public String phoneticIpa;
        public String vietnameseMeaning;
        public String definitionEn;
        public String cefrLevel;
        public String audioUrl;
        public String exampleSentenceEn;
        public String exampleSentenceVi;
        public String category;
        public OffsetDateTime createdAt;
        public long activeLearnersCount;

        public WordItemResponse() {}

        public WordItemResponse(Word w, long activeLearnersCount) {
            this.id = w.getId();
            this.word = w.getWord();
            this.partOfSpeech = w.getPartOfSpeech();
            this.phoneticIpa = w.getPhoneticIpa();
            this.vietnameseMeaning = w.getVietnameseMeaning();
            this.definitionEn = w.getDefinitionEn();
            this.cefrLevel = w.getCefrLevel();
            this.audioUrl = w.getAudioUrl();
            this.exampleSentenceEn = w.getExampleSentenceEn();
            this.exampleSentenceVi = w.getExampleSentenceVi();
            this.category = w.getCategory();
            this.createdAt = w.getCreatedAt();
            this.activeLearnersCount = activeLearnersCount;
        }
    }

    @Schema(description = "Phản hồi phân trang danh sách từ vựng")
    public static class WordPageResponse {
        public List<WordItemResponse> content;
        public int page;
        public int size;
        public long totalElements;
        public int totalPages;
        public boolean first;
        public boolean last;

        public WordPageResponse() {}

        public WordPageResponse(List<WordItemResponse> content, int page, int size,
                                long totalElements, int totalPages, boolean first, boolean last) {
            this.content = content;
            this.page = page;
            this.size = size;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.first = first;
            this.last = last;
        }
    }

    @Schema(description = "Kết quả nạp từ vựng hàng loạt")
    public static class BulkWordResult {
        public int totalProcessed;
        public int successCount;
        public int skippedDuplicates;
        public List<String> errorMessages;

        public BulkWordResult() {}

        public BulkWordResult(int totalProcessed, int successCount, int skippedDuplicates, List<String> errorMessages) {
            this.totalProcessed = totalProcessed;
            this.successCount = successCount;
            this.skippedDuplicates = skippedDuplicates;
            this.errorMessages = errorMessages;
        }
    }

    // ==================== QUẢN LÝ HỌC VIÊN ====================

    @Schema(description = "Tổng quan số liệu học viên")
    public static class UserOverviewStats {
        public long totalUsers;
        public long totalStudents;
        public long totalAdmins;
        public long activeToday;
        public double avgStreak;
        public long totalMasteredWords;

        public UserOverviewStats() {}

        public UserOverviewStats(long totalUsers, long totalStudents, long totalAdmins,
                                 long activeToday, double avgStreak, long totalMasteredWords) {
            this.totalUsers = totalUsers;
            this.totalStudents = totalStudents;
            this.totalAdmins = totalAdmins;
            this.activeToday = activeToday;
            this.avgStreak = avgStreak;
            this.totalMasteredWords = totalMasteredWords;
        }
    }

    @Schema(description = "Thông tin tóm tắt một học viên trong danh sách")
    public static class UserItemResponse {
        public UUID id;
        public String fullName;
        public String email;
        public String username;
        public String avatarUrl;
        public String targetLevel;
        public Integer dailyGoal;
        public Integer streakCount;
        public String role;
        public OffsetDateTime lastActiveAt;
        public OffsetDateTime createdAt;
        public long totalWords;
        public long masteredWords;
        public long reviewingWords;
        public long learningWords;
        public long newWords;
        public long totalCaptures;
        public long totalReviews;

        public UserItemResponse() {}
    }

    @Schema(description = "Phản hồi phân trang danh sách học viên")
    public static class UserPageResponse {
        public List<UserItemResponse> content;
        public int page;
        public int size;
        public long totalElements;
        public int totalPages;
        public boolean first;
        public boolean last;

        public UserPageResponse() {}

        public UserPageResponse(List<UserItemResponse> content, int page, int size,
                                long totalElements, int totalPages, boolean first, boolean last) {
            this.content = content;
            this.page = page;
            this.size = size;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.first = first;
            this.last = last;
        }
    }

    @Schema(description = "Chi tiết học lực & phân tích SM-2 của học viên")
    public static class UserAnalyticsResponse {
        public UserItemResponse user;
        public double averageEasinessFactor;
        public List<UserCaptureSummary> recentCaptures;
        public List<UserReviewSummary> recentReviews;

        public UserAnalyticsResponse() {}
    }

    public static class UserCaptureSummary {
        public UUID id;
        public String imageUrl;
        public String sceneTheme;
        public String detectedObjects;
        public OffsetDateTime createdAt;

        public UserCaptureSummary() {}
        public UserCaptureSummary(UUID id, String imageUrl, String sceneTheme, String detectedObjects, OffsetDateTime createdAt) {
            this.id = id;
            this.imageUrl = imageUrl;
            this.sceneTheme = sceneTheme;
            this.detectedObjects = detectedObjects;
            this.createdAt = createdAt;
        }
    }

    public static class UserReviewSummary {
        public UUID id;
        public String word;
        public String partOfSpeech;
        public String vietnameseMeaning;
        public Integer ratingGrade;
        public String reviewType;
        public Double speechScore;
        public Integer responseTimeMs;
        public OffsetDateTime reviewedAt;

        public UserReviewSummary() {}
    }

    @Schema(description = "Yêu cầu cập nhật thông tin học viên")
    public static class UserUpdateRequest {
        public String fullName;
        public String targetLevel;
        public Integer dailyGoal;
        public String role;
    }

    @Schema(description = "Yêu cầu tạo học viên mới từ phía Quản trị viên")
    public static class CreateUserRequest {
        public String username;
        public String email;
        public String password;
        public String fullName;
        public String targetLevel;
        public Integer dailyGoal;
        public String role;
    }

    // ==================== KIỂM DUYỆT AI VISION DTOs ====================

    @Schema(description = "Thống kê tổng quan Phân Hệ AI Vision")
    public static class VisionOverviewStats {
        public long totalCaptures;
        public long totalDetectedObjects;
        public long totalThemes;
        public String topTheme;
        public List<SceneDistributionItem> sceneDistribution;
        public List<TopDetectedWordItem> topDetectedWords;

        public VisionOverviewStats() {}

        public VisionOverviewStats(long totalCaptures, long totalDetectedObjects, long totalThemes,
                                   String topTheme, List<SceneDistributionItem> sceneDistribution,
                                   List<TopDetectedWordItem> topDetectedWords) {
            this.totalCaptures = totalCaptures;
            this.totalDetectedObjects = totalDetectedObjects;
            this.totalThemes = totalThemes;
            this.topTheme = topTheme;
            this.sceneDistribution = sceneDistribution;
            this.topDetectedWords = topDetectedWords;
        }
    }

    public static class SceneDistributionItem {
        public String theme;
        public long count;
        public double percentage;

        public SceneDistributionItem() {}
        public SceneDistributionItem(String theme, long count, double percentage) {
            this.theme = theme;
            this.count = count;
            this.percentage = percentage;
        }
    }

    public static class TopDetectedWordItem {
        public String word;
        public String vietnamese;
        public long count;

        public TopDetectedWordItem() {}
        public TopDetectedWordItem(String word, String vietnamese, long count) {
            this.word = word;
            this.vietnamese = vietnamese;
            this.count = count;
        }
    }

    @Schema(description = "Chi tiết một bức ảnh bối cảnh thực tế đã được AI quét")
    public static class CaptureItemResponse {
        public UUID id;
        public UUID userId;
        public String userName;
        public String userEmail;
        public String imageUrl;
        public String sceneTheme;
        public String detectedObjectsJson;
        public int detectedCount;
        public List<String> objectLabels;
        public OffsetDateTime createdAt;
        public String timeAgo;

        public CaptureItemResponse() {}
    }

    @Schema(description = "Phản hồi phân trang danh sách ảnh bối cảnh AI")
    public static class CapturePageResponse {
        public List<CaptureItemResponse> content;
        public int page;
        public int size;
        public long totalElements;
        public int totalPages;
        public boolean first;
        public boolean last;

        public CapturePageResponse() {}
        public CapturePageResponse(List<CaptureItemResponse> content, int page, int size,
                                   long totalElements, int totalPages, boolean first, boolean last) {
            this.content = content;
            this.page = page;
            this.size = size;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.first = first;
            this.last = last;
        }
    }

    @Schema(description = "Yêu cầu duyệt nhãn vật thể AI thành từ vựng hệ thống")
    public static class PromoteWordRequest {
        public String word;
        public String partOfSpeech;
        public String phoneticIpa;
        public String vietnameseMeaning;
        public String definitionEn;
        public String cefrLevel;
        public String exampleSentenceEn;
        public String exampleSentenceVi;
        public String category;
    }

    // ==================== CẤU HÌNH THUẬT TOÁN SM-2 & HỆ THỐNG ====================

    @Schema(description = "Thông số cấu hình thuật toán SM-2 và Hệ thống")
    public static class SystemSettingsDto {
        public double initialEasinessFactor = 2.50;
        public double minEasinessFactor = 1.30;
        public int interval1Days = 1;
        public int interval2Days = 6;
        public double aiVisionConfidenceThreshold = 0.45;
        public int dailyNewWordLimit = 20;
        public String targetCefrLevelDefault = "A2";
        public boolean strictGrading = false;
        public boolean enableAutoAudioPronunciation = true;
        public OffsetDateTime lastUpdated = OffsetDateTime.now();

        public SystemSettingsDto() {}
    }

    // ==================== PHÂN HỆ 6: PHÂN TÍCH PHÁT ÂM AI ====================

    @Schema(description = "Thống kê tổng quan Phân Hệ Phân Tích Luyện Phát Âm AI")
    public static class SpeechAnalyticsResponse {
        public double averageScore;
        public long totalSessions;
        public long passedCount;
        public double passRate;
        public long activeLearnersCount;

        // Phân bố phổ điểm
        public long nativeCount;         // >= 90
        public long fluentCount;         // 75 - 89
        public long goodEffortCount;     // 55 - 74
        public long needImprovementCount;// < 55

        public List<HardestWordItem> hardestWords;
        public List<SpeechLogItem> recentLogs;
        public int totalPages;
        public long totalElements;
        public int currentPage;

        public SpeechAnalyticsResponse() {}
    }

    public static class HardestWordItem {
        public String word;
        public String ipa;
        public String vietnamese;
        public String cefrLevel;
        public double averageScore;
        public long practiceCount;
        public String commonMistakeHint;

        public HardestWordItem() {}

        public HardestWordItem(String word, String ipa, String vietnamese, String cefrLevel, double averageScore, long practiceCount, String commonMistakeHint) {
            this.word = word;
            this.ipa = ipa;
            this.vietnamese = vietnamese;
            this.cefrLevel = cefrLevel;
            this.averageScore = averageScore;
            this.practiceCount = practiceCount;
            this.commonMistakeHint = commonMistakeHint;
        }
    }

    public static class SpeechLogItem {
        public String id;
        public String userName;
        public String userEmail;
        public String word;
        public String ipa;
        public String vietnamese;
        public double speechScore;
        public int ratingGrade;
        public String ratingLabel;
        public Integer responseTimeMs;
        public OffsetDateTime reviewedAt;
        public String timeAgo;

        public SpeechLogItem() {}
    }

    public static class SpeechLogPageResponse {
        public List<SpeechLogItem> items;
        public int currentPage;
        public int totalPages;
        public long totalElements;
        public int pageSize;

        public SpeechLogPageResponse() {}

        public SpeechLogPageResponse(List<SpeechLogItem> items, int currentPage, int totalPages, long totalElements, int pageSize) {
            this.items = items;
            this.currentPage = currentPage;
            this.totalPages = totalPages;
            this.totalElements = totalElements;
            this.pageSize = pageSize;
        }
    }

    // ==================== PHÂN HỆ 7: QUẢN LÝ LỚP HỌC (CLASSROOM MANAGEMENT) ====================
    public static class ClassroomOverviewStats {
        public long totalClassrooms;
        public long activeClassrooms;
        public long lockedClassrooms;
        public long totalClassroomWords;
        public long totalClassroomMembers;
        public long totalQuizAttempts;

        public ClassroomOverviewStats() {}
        public ClassroomOverviewStats(long totalClassrooms, long activeClassrooms, long lockedClassrooms,
                                      long totalClassroomWords, long totalClassroomMembers, long totalQuizAttempts) {
            this.totalClassrooms = totalClassrooms;
            this.activeClassrooms = activeClassrooms;
            this.lockedClassrooms = lockedClassrooms;
            this.totalClassroomWords = totalClassroomWords;
            this.totalClassroomMembers = totalClassroomMembers;
            this.totalQuizAttempts = totalQuizAttempts;
        }
    }

    public static class AdminClassroomItem {
        public UUID id;
        public String code;
        public String name;
        public String description;
        public String targetLevel;
        public String icon;
        public String status;
        public UUID ownerId;
        public String ownerUsername;
        public String ownerFullName;
        public String ownerEmail;
        public int wordsCount;
        public long memberCount;
        public long quizAttemptCount;
        public OffsetDateTime createdAt;

        public AdminClassroomItem() {}
    }

    public static class AdminClassroomPageResponse {
        public List<AdminClassroomItem> content;
        public int page;
        public int size;
        public long totalElements;
        public int totalPages;
        public boolean isFirst;
        public boolean isLast;

        public AdminClassroomPageResponse() {}
    }

    public static class AdminClassroomDetailResponse {
        public AdminClassroomItem classroom;
        public List<ClassroomDto.ClassroomWordDto> words;
        public List<ClassroomDto.MemberProgressDto> memberProgresses;
        public List<ClassroomDto.LeaderboardItemDto> leaderboard;

        public AdminClassroomDetailResponse() {}
        public AdminClassroomDetailResponse(AdminClassroomItem classroom,
                                            List<ClassroomDto.ClassroomWordDto> words,
                                            List<ClassroomDto.MemberProgressDto> memberProgresses,
                                            List<ClassroomDto.LeaderboardItemDto> leaderboard) {
            this.classroom = classroom;
            this.words = words;
            this.memberProgresses = memberProgresses;
            this.leaderboard = leaderboard;
        }
    }
}

