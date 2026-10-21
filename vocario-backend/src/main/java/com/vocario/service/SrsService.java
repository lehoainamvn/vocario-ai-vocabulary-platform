package com.vocario.service;

import com.vocario.dto.ReviewDto;
import com.vocario.dto.TargetProgressDto;
import com.vocario.entity.*;
import com.vocario.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class SrsService {

    private static final Logger log = LoggerFactory.getLogger(SrsService.class);

    private final UserWordProgressRepository progressRepository;
    private final ReviewLogRepository reviewLogRepository;
    private final Sm2Service sm2Service;
    private final UserRepository userRepository;
    private final AdminService adminService;
    private final WordService wordService;

    public static class StreakUpdateResult {
        public int streakCount;
        public boolean incremented;
        public String streakMessage;

        public StreakUpdateResult(int streakCount, boolean incremented, String streakMessage) {
            this.streakCount = streakCount;
            this.incremented = incremented;
            this.streakMessage = streakMessage;
        }
    }

    public SrsService(
            UserWordProgressRepository progressRepository,
            ReviewLogRepository reviewLogRepository,
            Sm2Service sm2Service,
            UserRepository userRepository,
            AdminService adminService,
            WordService wordService
    ) {
        this.progressRepository = progressRepository;
        this.reviewLogRepository = reviewLogRepository;
        this.sm2Service = sm2Service;
        this.userRepository = userRepository;
        this.adminService = adminService;
        this.wordService = wordService;
    }

    /**
     * Thuật toán cập nhật Chuỗi Ngày Học Liên Tiếp (Streak Engine)
     */
    @Transactional
    public StreakUpdateResult updateStreakOnStudy(User user) {
        if (user == null) {
            return new StreakUpdateResult(1, false, "🔥 Đã ghi nhận phiên học!");
        }

        OffsetDateTime now = OffsetDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDate lastStudy = user.getLastStudyDate();

        int currentStreak = user.getStreakCount() != null ? user.getStreakCount() : 0;
        boolean incremented = false;
        String message;

        if (lastStudy == null) {
            // Lần đầu tiên ghi nhận hoạt động học tập
            currentStreak = (currentStreak > 0) ? currentStreak : 1;
            incremented = true;
            message = "🔥 Chào mừng! Bạn vừa thắp sáng ngọn lửa học tập (" + currentStreak + " ngày)!";
        } else if (lastStudy.isEqual(today)) {
            // Đã học hôm nay rồi -> duy trì chuỗi hiện tại
            if (currentStreak <= 0) {
                currentStreak = 1;
                incremented = true;
                message = "🔥 Khởi động chuỗi học tập hôm nay (1 ngày)!";
            } else {
                incremented = false;
                message = "🔥 Bạn đang duy trì phong độ chuỗi " + currentStreak + " ngày học hôm nay!";
            }
        } else if (lastStudy.isEqual(today.minusDays(1))) {
            // Hôm qua có học, hôm nay học tiếp -> Tăng streak +1 ngày!
            currentStreak = (currentStreak <= 0 ? 1 : currentStreak) + 1;
            incremented = true;
            message = "🔥 Đỉnh nóc! Bạn đã nâng chuỗi lên " + currentStreak + " ngày học liên tiếp!";
        } else {
            // Gián đoạn hơn 1 ngày (ví dụ 2 ngày trước mới học) -> Reset về chuỗi 1 ngày mới
            currentStreak = 1;
            incremented = true;
            message = "🔥 Thắp lại ngọn lửa học tập sau kỳ nghỉ! Chuỗi ngày học mới: 1 ngày.";
        }

        user.setStreakCount(currentStreak);
        user.setLastStudyDate(today);
        user.setLastActiveAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        log.info("🔥 [STREAK ENGINE] Học viên '{}' ({}) - Streak: {} ngày (Tăng mới: {}, Ngày học: {})",
                user.getUsername(), user.getId(), currentStreak, incremented, today);

        return new StreakUpdateResult(currentStreak, incremented, message);
    }

    /**
     * Kiểm tra trạng thái Streak hiện tại của học viên
     */
    public StreakUpdateResult getStreakStatus(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return new StreakUpdateResult(0, false, "Không tìm thấy người dùng");
        }
        LocalDate today = LocalDate.now();
        LocalDate lastStudy = user.getLastStudyDate();
        int currentStreak = user.getStreakCount() != null ? user.getStreakCount() : 0;

        // Nếu học viên bỏ lỡ buổi học ngày hôm qua (ngày học cuối trước hôm qua)
        if (currentStreak > 0 && lastStudy != null && lastStudy.isBefore(today.minusDays(1))) {
            currentStreak = 0;
            user.setStreakCount(0);
            userRepository.save(user);
            log.info("❄️ [STREAK RESET] Học viên '{}' ({}) bị đứt chuỗi do không học hôm qua.", user.getUsername(), user.getId());
        }

        String msg = currentStreak > 0
                ? "🔥 Chuỗi " + currentStreak + " ngày học liên tiếp!"
                : "Hãy hoàn thành 1 bài học hôm nay để bắt đầu chuỗi Streak!";
        return new StreakUpdateResult(currentStreak, false, msg);
    }

    /**
     * Lấy danh sách thẻ từ vựng đến hạn ôn tập hôm nay (Due Cards)
     */
    public List<UserWordProgress> getDueCards(UUID userId) {
        log.info("⏰ [SRS SERVICE] Truy vấn danh sách thẻ đến hạn ôn tập (Due Cards) cho User ID: {}", userId);
        List<UserWordProgress> dueList = progressRepository.findDueReviews(userId, OffsetDateTime.now());
        log.info("   -> Tìm thấy {} thẻ từ vựng cần ôn tập hôm nay.", dueList.size());
        return dueList;
    }

    /**
     * Thêm một từ vựng vào lộ trình học của người dùng (Khởi tạo SM-2)
     */
    @Transactional
    public UserWordProgress addWordToLearning(User user, Word word, Capture capture) {
        updateStreakOnStudy(user);
        return progressRepository.findByUserIdAndWordId(user.getId(), word.getId())
                .map(existing -> {
                    log.info("ℹ️ [SRS SERVICE] Người dùng ID={} đã có tiến trình học cho từ '{}' (Progress ID: {})", 
                            user.getId(), word.getWord(), existing.getId());
                    return existing;
                })
                .orElseGet(() -> {
                    log.info("➕ [SRS SERVICE] Khởi tạo lộ trình học mới (SM-2) cho từ '{}' (User ID: {})", 
                            word.getWord(), user.getId());
                    UserWordProgress p = new UserWordProgress(user, word, capture);
                    var settings = adminService != null ? adminService.getSystemSettings() : null;
                    if (settings != null) {
                        p.setEasinessFactor(settings.initialEasinessFactor);
                    }
                    UserWordProgress saved = progressRepository.save(p);
                    log.info("   -> ✅ Đã lưu thẻ học mới với ID: {}, Interval: {} ngày, EF: {}", 
                            saved.getId(), saved.getIntervalDays(), saved.getEasinessFactor());
                    return saved;
                });
    }

    public UserWordProgress resolveOrCreateProgress(UUID userId, String progressIdStr, String wordText) {
        // 1. Thử tìm kiếm theo UUID nếu progressIdStr hợp lệ
        if (progressIdStr != null && !progressIdStr.isBlank()) {
            try {
                UUID pid = UUID.fromString(progressIdStr.trim());
                Optional<UserWordProgress> opt = progressRepository.findById(pid);
                if (opt.isPresent()) {
                    return opt.get();
                }
            } catch (IllegalArgumentException ignored) {
                // progressIdStr là ID tạm từ frontend (ví dụ yolo-0-pepper-mill)
            }
        }

        // 2. Thử tìm kiếm theo từ vựng tiếng Anh
        String cleanWord = (wordText != null && !wordText.isBlank()) ? wordText.trim() : null;
        if (cleanWord == null && progressIdStr != null) {
            String cleaned = progressIdStr.replaceAll("^(yolo-\\d+-|scene-word-|word-)", "").replace("-", " ").trim();
            if (!cleaned.isBlank()) {
                cleanWord = cleaned;
            }
        }

        if (cleanWord != null) {
            Optional<UserWordProgress> byText = progressRepository.findByUserIdAndWordText(userId, cleanWord);
            if (byText.isPresent()) {
                return byText.get();
            }

            // Nếu người học chưa có bản ghi tiến trình cho từ này, tự động khởi tạo ngay
            log.info("➕ [SRS AUTO-CREATE] Tự động tạo tiến trình học cho từ '{}' (User ID: {})", cleanWord, userId);
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
            Word word = wordService.getOrCreateWord(cleanWord, "Đồ vật đời sống", "/.../", "A2");
            return addWordToLearning(user, word, null);
        }

        throw new RuntimeException("Không tìm thấy hoặc không thể khởi tạo tiến trình học cho: " + progressIdStr);
    }

    /**
     * Thực thi thuật toán SM-2 khi người học đánh giá thẻ từ (Grade 0 - 5)
     */
    @Transactional
    public ReviewDto.ReviewResponse processReview(UUID userId, ReviewDto.ReviewRequest request) {
        log.info("================================================================================");
        log.info("⭐ [SRS REVIEW REQUEST] Nhận đánh giá thẻ ôn tập:");
        log.info("   - Progress ID   : {}", request.progressId);
        log.info("   - Word Text     : {}", request.wordText);
        log.info("   - User ID       : {}", userId);
        log.info("   - Rating Grade  : {} / 5 (0: Quên sạch -> 5: Hoàn hảo)", request.ratingGrade);
        log.info("   - Review Type   : {}", request.reviewType);
        log.info("   - Response Time : {} ms", request.responseTimeMs);

        UserWordProgress progress = resolveOrCreateProgress(userId, request.progressId, request.wordText);

        if (!progress.getUser().getId().equals(userId)) {
            log.warn("❌ [SRS REVIEW FAILED] User ID {} không sở hữu tiến trình ID {}", userId, progress.getId());
            throw new RuntimeException("Không có quyền cập nhật tiến trình này");
        }

        OffsetDateTime now = OffsetDateTime.now();

        int oldRep = progress.getRepetitionNumber();
        double oldEf = progress.getEasinessFactor();
        int oldInterval = progress.getIntervalDays();

        var settings = adminService != null ? adminService.getSystemSettings() : null;

        // 1. Gọi thuật toán SM-2 tính toán dựa trên cấu hình Quản Trị
        Sm2Service.Sm2CalculationResult sm2Result = sm2Service.calculate(
                request.ratingGrade,
                progress.getRepetitionNumber(),
                progress.getEasinessFactor(),
                progress.getIntervalDays(),
                now,
                settings
        );

        log.info("🧠 [SM-2 CALCULATION] Kết quả tính toán thuật toán SuperMemo 2 cho từ '{}':", progress.getWord().getWord());
        log.info("   - Số lần lặp (Repetition) : {} -> {}", oldRep, sm2Result.getRepetitionNumber());
        log.info("   - Hệ số dễ nhớ (EF)       : {} -> {}", String.format("%.2f", oldEf), String.format("%.2f", sm2Result.getEasinessFactor()));
        log.info("   - Chu kỳ ôn tập (Interval): {} ngày -> {} ngày", oldInterval, sm2Result.getIntervalDays());
        log.info("   - Ngày ôn tiếp theo       : {}", sm2Result.getNextReviewDate());

        // 2. Cập nhật các thông số SM-2 vào cơ sở dữ liệu
        progress.setRepetitionNumber(sm2Result.getRepetitionNumber());
        progress.setEasinessFactor(sm2Result.getEasinessFactor());
        progress.setIntervalDays(sm2Result.getIntervalDays());
        progress.setNextReviewDate(sm2Result.getNextReviewDate());
        progress.setLastReviewedAt(now);

        // 3. Cập nhật trạng thái từ vựng
        String oldStatus = progress.getStatus();
        if (sm2Result.getRepetitionNumber() >= 5) {
            progress.setStatus("MASTERED");
        } else if (sm2Result.getRepetitionNumber() > 0) {
            progress.setStatus("REVIEWING");
        } else {
            progress.setStatus("LEARNING");
        }
        log.info("   - Trạng thái từ vựng      : {} -> {}", oldStatus, progress.getStatus());

        progressRepository.save(progress);

        // 4. Lưu nhật ký ReviewLog
        ReviewLog reviewLog = new ReviewLog(progress, progress.getUser(), request.ratingGrade, request.reviewType);
        reviewLog.setSpeechScore(request.speechScore);
        reviewLog.setResponseTimeMs(request.responseTimeMs);
        reviewLogRepository.save(reviewLog);

        log.info("💾 [SRS REVIEW LOG] Đã lưu lịch sử ôn tập ReviewLog vào CSDL.");
        log.info("================================================================================");

        String message = request.ratingGrade >= 3 
                ? "Tuyệt vời! Từ này sẽ được ôn lại sau " + sm2Result.getIntervalDays() + " ngày."
                : "Đừng nản lòng! Từ này sẽ xuất hiện lại trong phiên ôn tập ngày mai.";

        StreakUpdateResult streakRes = updateStreakOnStudy(progress.getUser());

        return new ReviewDto.ReviewResponse(
                progress.getId(),
                progress.getWord().getWord(),
                progress.getRepetitionNumber(),
                progress.getEasinessFactor(),
                progress.getIntervalDays(),
                progress.getNextReviewDate(),
                message,
                streakRes.streakCount,
                streakRes.incremented,
                streakRes.streakMessage
        );
    }

    /**
     * Đánh dấu trực tiếp một từ vựng là ĐÃ THUỘC (MASTERED), bỏ qua các chu kỳ lặp nếu người học đã biết từ trước
     */
    @Transactional
    public ReviewDto.ReviewResponse markAsMastered(UUID userId, String progressId, String wordText) {
        log.info("⭐ [SRS MARK MASTERED] Đánh dấu từ thành thạo trực tiếp: Progress ID={}, Word={}, User ID={}", progressId, wordText, userId);
        UserWordProgress progress = resolveOrCreateProgress(userId, progressId, wordText);

        if (!progress.getUser().getId().equals(userId)) {
            throw new RuntimeException("Không có quyền cập nhật tiến trình này");
        }

        OffsetDateTime now = OffsetDateTime.now();
        progress.setRepetitionNumber(Math.max(5, progress.getRepetitionNumber() + 1));
        progress.setStatus("MASTERED");
        progress.setIntervalDays(Math.max(60, progress.getIntervalDays() > 0 ? progress.getIntervalDays() * 2 : 60));
        progress.setNextReviewDate(now.plusDays(progress.getIntervalDays()));
        progress.setLastReviewedAt(now);

        progressRepository.save(progress);

        ReviewLog reviewLog = new ReviewLog(progress, progress.getUser(), 5, "FLASHCARD");
        reviewLogRepository.save(reviewLog);

        StreakUpdateResult streakRes = updateStreakOnStudy(progress.getUser());

        log.info("✅ [SRS MARK MASTERED] Đã chuyển từ '{}' sang trạng thái MASTERED (Đã Thuộc).", progress.getWord().getWord());

        return new ReviewDto.ReviewResponse(
                progress.getId(),
                progress.getWord().getWord(),
                progress.getRepetitionNumber(),
                progress.getEasinessFactor(),
                progress.getIntervalDays(),
                progress.getNextReviewDate(),
                "Tuyệt vời! Bạn đã đánh dấu từ '" + progress.getWord().getWord() + "' đã thuộc thành thạo.",
                streakRes.streakCount,
                streakRes.incremented,
                streakRes.streakMessage
        );
    }

    @Transactional
    public ReviewDto.ReviewResponse markAsMastered(UUID userId, UUID progressId) {
        return markAsMastered(userId, progressId != null ? progressId.toString() : null, null);
    }

    /**
     * Thống kê số lượng từ theo các trạng thái SM-2 cho bảng điều khiển
     */
    public java.util.Map<String, Object> getStats(UUID userId) {
        long dueCount = progressRepository.findDueReviews(userId, OffsetDateTime.now()).size();
        long learningCount = progressRepository.countByUserIdAndStatus(userId, "LEARNING") + progressRepository.countByUserIdAndStatus(userId, "NEW");
        long reviewingCount = progressRepository.countByUserIdAndStatus(userId, "REVIEWING");
        long masteredCount = progressRepository.countByUserIdAndStatus(userId, "MASTERED");
        long totalWords = progressRepository.findByUserId(userId).size();

        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("dueCount", dueCount);
        map.put("learningCount", learningCount);
        map.put("reviewingCount", reviewingCount);
        map.put("masteredCount", masteredCount);
        map.put("totalWords", totalWords);
        return map;
    }

    /**
     * Lấy danh sách toàn bộ từ vựng cá nhân của người dùng (Sổ từ vựng riêng biệt)
     */
    public List<UserWordProgress> getUserWords(UUID userId) {
        log.info("📚 [SRS SERVICE] Lấy sổ từ vựng cá nhân cho User ID: {}", userId);
        return progressRepository.findUserWordsWithDetails(userId);
    }

    /**
     * Tính toán tiến độ mục tiêu CEFR và xác định điều kiện thăng cấp
     */
    public TargetProgressDto getTargetProgress(UUID userId) {
        log.info("🎯 [TARGET PROGRESS] Tính toán tiến độ mục tiêu CEFR cho User ID: {}", userId);
        User user = userRepository.findById(userId).orElse(null);
        String currentLevel = (user != null && user.getTargetLevel() != null && !user.getTargetLevel().isBlank())
                ? user.getTargetLevel().toUpperCase().trim()
                : "A2";

        List<String> cefrOrder = List.of("A1", "A2", "B1", "B2", "C1", "C2");
        int currentIndex = cefrOrder.indexOf(currentLevel);
        String nextLevel = (currentIndex >= 0 && currentIndex < cefrOrder.size() - 1)
                ? cefrOrder.get(currentIndex + 1)
                : null;

        List<UserWordProgress> allWords = progressRepository.findUserWordsWithDetails(userId);

        // Gom nhóm theo CEFR level
        Map<String, List<UserWordProgress>> wordsByLevel = new HashMap<>();
        for (String lvl : cefrOrder) {
            wordsByLevel.put(lvl, new ArrayList<>());
        }

        for (UserWordProgress p : allWords) {
            String lvl = "A2";
            if (p.getWord() != null && p.getWord().getCefrLevel() != null && !p.getWord().getCefrLevel().isBlank()) {
                lvl = p.getWord().getCefrLevel().toUpperCase().trim();
            }
            wordsByLevel.computeIfAbsent(lvl, k -> new ArrayList<>()).add(p);
        }

        // Tạo bảng phân bổ theo từng level chuẩn (A1 -> C1)
        List<TargetProgressDto.LevelBreakdown> breakdowns = new ArrayList<>();
        for (String lvl : List.of("A1", "A2", "B1", "B2", "C1")) {
            List<UserWordProgress> list = wordsByLevel.getOrDefault(lvl, Collections.emptyList());
            long total = list.size();
            long mastered = list.stream().filter(w -> "MASTERED".equalsIgnoreCase(w.getStatus())).count();
            breakdowns.add(new TargetProgressDto.LevelBreakdown(lvl, total, mastered));
        }

        List<UserWordProgress> currentLevelWords = wordsByLevel.getOrDefault(currentLevel, Collections.emptyList());
        long totalWordsAtLevel = currentLevelWords.size();
        long masteredWordsAtLevel = currentLevelWords.stream().filter(w -> "MASTERED".equalsIgnoreCase(w.getStatus())).count();
        long learningWordsAtLevel = totalWordsAtLevel - masteredWordsAtLevel;

        // Ngưỡng vốn từ vựng chuẩn theo khung tham chiếu châu Âu CEFR & Cambridge EVP:
        // A1: 500 từ | A2: 1.000 từ | B1: 2.000 từ | B2: 4.000 từ | C1: 8.000 từ
        Map<String, Integer> cefrThresholds = Map.of(
                "A1", 500,
                "A2", 1000,
                "B1", 2000,
                "B2", 4000,
                "C1", 8000
        );
        int masteryThreshold = cefrThresholds.getOrDefault(currentLevel, 1000);
        boolean canLevelUp = false;
        int completionPercentage = 0;

        if (totalWordsAtLevel > 0) {
            if (masteredWordsAtLevel >= masteryThreshold) {
                canLevelUp = (nextLevel != null);
                completionPercentage = 100;
            } else {
                completionPercentage = (int) Math.min(99, Math.round(((double) masteredWordsAtLevel / masteryThreshold) * 100));
            }
        }

        String recommendation;
        if (canLevelUp) {
            recommendation = String.format("🎉 Chúc mừng! Bạn đã làm chủ %d/%d từ vựng chuẩn CEFR %s và đủ điều kiện thăng cấp lên %s. Hãy nhấn Thăng Cấp để trải nghiệm các cấu trúc câu giao tiếp nâng cao!",
                    masteredWordsAtLevel, masteryThreshold, currentLevel, nextLevel);
        } else if (totalWordsAtLevel == 0) {
            recommendation = String.format("Chỉ tiêu chuẩn CEFR %s: %d từ thành thạo. Bạn chưa lưu từ vựng nào thuộc cấp độ này, hãy chụp ảnh để nạp thêm từ mới!",
                    currentLevel, masteryThreshold);
        } else if (masteredWordsAtLevel == 0) {
            recommendation = String.format("Chỉ tiêu chuẩn CEFR %s: %d từ. Bạn có %d từ đang học, hãy hoàn thành các phiên ôn tập SM-2 để đưa từ vào vùng trí nhớ dài hạn!",
                    currentLevel, masteryThreshold, totalWordsAtLevel);
        } else {
            recommendation = String.format("Tiến độ chuẩn CEFR %s: Bạn đã làm chủ %d/%d từ (%d%%). Cần thêm %d từ thành thạo nữa để đạt chuẩn thăng cấp lên %s.",
                    currentLevel, masteredWordsAtLevel, masteryThreshold, completionPercentage,
                    (masteryThreshold - masteredWordsAtLevel), nextLevel != null ? nextLevel : "cấp độ cao nhất");
        }

        log.info("   -> Kết quả: CurrentLevel={}, NextLevel={}, Mastered={}/{}, CanLevelUp={}",
                currentLevel, nextLevel, masteredWordsAtLevel, totalWordsAtLevel, canLevelUp);

        return new TargetProgressDto(
                currentLevel,
                nextLevel,
                totalWordsAtLevel,
                masteredWordsAtLevel,
                learningWordsAtLevel,
                completionPercentage,
                masteryThreshold,
                canLevelUp,
                recommendation,
                breakdowns
        );
    }

    @Transactional
    public void deleteWordProgress(UUID userId, UUID progressId) {
        log.info("🗑️ [SRS SERVICE] Xóa từ vựng khỏi lộ trình học: user={}, progressId={}", userId, progressId);
        reviewLogRepository.deleteByProgressId(progressId);
        progressRepository.deleteById(progressId);
    }

    @Transactional
    public void deleteProgressByCaptureId(UUID captureId) {
        log.info("🗑️ [SRS SERVICE] Xóa toàn bộ từ vựng gắn với Capture ID: {}", captureId);
        List<UserWordProgress> progressList = progressRepository.findByCaptureId(captureId);
        for (UserWordProgress p : progressList) {
            reviewLogRepository.deleteByProgressId(p.getId());
            progressRepository.delete(p);
        }
    }

    @Transactional
    public void deleteTopicProgress(UUID userId, String topicName) {
        log.info("🗑️ [SRS SERVICE] Xóa toàn bộ từ thuộc chủ đề '{}' của user={}", topicName, userId);
        List<UserWordProgress> list = progressRepository.findByUserId(userId);
        for (UserWordProgress p : list) {
            String theme = (p.getCapture() != null && p.getCapture().getSceneTheme() != null)
                    ? p.getCapture().getSceneTheme()
                    : "Bối cảnh thế giới thực";
            if (topicName.equalsIgnoreCase(theme)
                    || (topicName.equalsIgnoreCase("Bối cảnh đời sống") && p.getCapture() == null)
                    || (topicName.equalsIgnoreCase("Bối cảnh thế giới thực") && p.getCapture() == null)) {
                reviewLogRepository.deleteByProgressId(p.getId());
                progressRepository.delete(p);
            }
        }
    }
}


