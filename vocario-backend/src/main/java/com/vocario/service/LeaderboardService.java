package com.vocario.service;

import com.vocario.dto.LeaderboardDto;
import com.vocario.entity.User;
import com.vocario.repository.CaptureRepository;
import com.vocario.repository.ReviewLogRepository;
import com.vocario.repository.UserRepository;
import com.vocario.repository.UserWordProgressRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class LeaderboardService {

    private static final Logger log = LoggerFactory.getLogger(LeaderboardService.class);

    private final UserRepository userRepository;
    private final UserWordProgressRepository progressRepository;
    private final ReviewLogRepository reviewLogRepository;
    private final CaptureRepository captureRepository;

    public LeaderboardService(UserRepository userRepository,
                              UserWordProgressRepository progressRepository,
                              ReviewLogRepository reviewLogRepository,
                              CaptureRepository captureRepository) {
        this.userRepository = userRepository;
        this.progressRepository = progressRepository;
        this.reviewLogRepository = reviewLogRepository;
        this.captureRepository = captureRepository;
    }

    public LeaderboardDto.LeaderboardResponse getLeaderboard(UUID currentUserId, String period, String level, Integer page, Integer size) {
        String finalPeriod = (period != null && period.equalsIgnoreCase("weekly")) ? "weekly" : "all-time";
        String finalLevel = (level != null && !level.isBlank()) ? level.trim().toUpperCase() : "ALL";
        int finalPage = (page != null && page >= 0) ? page : 0;
        int finalSize = (size != null && size > 0) ? size : 10;

        log.info("🏆 [LEADERBOARD] Tải bảng xếp hạng phân trang: period='{}', level='{}', page={}, size={}, currentUserId={}",
                finalPeriod, finalLevel, finalPage, finalSize, currentUserId);

        List<User> allUsers = userRepository.findAll();
        OffsetDateTime sevenDaysAgo = OffsetDateTime.now().minusDays(7);

        List<LeaderboardDto.LeaderboardEntry> entries = new ArrayList<>();
        User currentUser = null;

        for (User u : allUsers) {
            boolean isSelf = currentUserId != null && u.getId().equals(currentUserId);
            if (isSelf) {
                currentUser = u;
            }

            // Bỏ qua tài khoản Quản Trị Viên ADMIN (không hiển thị ADMIN trên bảng đua rank học viên)
            if ("ADMIN".equalsIgnoreCase(u.getRole())) {
                continue;
            }

            // Lọc nghiêm ngặt theo trình độ CEFR: Chỉ người học đúng trình độ mới được vào bảng
            if (!"ALL".equals(finalLevel)) {
                String uLevel = u.getTargetLevel() != null ? u.getTargetLevel().toUpperCase() : "A2";
                if (!uLevel.equals(finalLevel)) {
                    continue;
                }
            }

            entries.add(buildEntry(u, finalPeriod, currentUserId, sevenDaysAgo));
        }

        // Sắp xếp giảm dần theo XP, sau đó theo số từ thành thạo, sau đó streak
        entries.sort((a, b) -> {
            if (b.xp != a.xp) return Long.compare(b.xp, a.xp);
            if (b.masteredWords != a.masteredWords) return Long.compare(b.masteredWords, a.masteredWords);
            if (b.streakCount != a.streakCount) return Integer.compare(b.streakCount, a.streakCount);
            String nameA = a.fullName != null ? a.fullName : (a.username != null ? a.username : "");
            String nameB = b.fullName != null ? b.fullName : (b.username != null ? b.username : "");
            return nameA.compareToIgnoreCase(nameB);
        });

        // Đánh số thứ hạng (Dense / Sequential Rank)
        int currentRank = 1;
        LeaderboardDto.LeaderboardEntry currentUserRank = null;
        int currentUserIndex = -1;

        for (int i = 0; i < entries.size(); i++) {
            LeaderboardDto.LeaderboardEntry item = entries.get(i);
            item.rank = currentRank++;
            if (item.isCurrentUser) {
                currentUserRank = item;
                currentUserIndex = i;
            }
        }

        // Nếu người dùng không nằm trong bảng xếp hạng này (ví dụ đang lọc cấp độ khác hoặc là ADMIN),
        // tạo hồ sơ cá nhân riêng với rank = 0 để bên phải màn hình vẫn hiển thị đầy đủ thông số cá nhân
        if (currentUserRank == null && currentUser != null) {
            currentUserRank = buildEntry(currentUser, finalPeriod, currentUserId, sevenDaysAgo);
            currentUserRank.rank = 0; // rank 0 biểu thị người dùng không nằm trong phân nhóm này
        }

        // Tính mục tiêu bứt phá (Next Target) cho người dùng hiện tại
        LeaderboardDto.LeaderboardTargetInfo targetInfo = null;
        if (currentUserRank != null && currentUserIndex > 0) {
            LeaderboardDto.LeaderboardEntry userAhead = entries.get(currentUserIndex - 1);
            long diff = Math.max(1, userAhead.xp - currentUserRank.xp + 10);
            long wordsNeeded = (long) Math.ceil((double) diff / 10.0);
            String suggestion = "Cần thêm " + diff + " XP (~" + wordsNeeded + " thẻ ôn tập) để vượt qua @"
                    + userAhead.username + " lên hạng #" + userAhead.rank + "!";
            targetInfo = new LeaderboardDto.LeaderboardTargetInfo(userAhead.username, userAhead.rank, diff, suggestion);
        } else if (currentUserRank != null && currentUserIndex == 0) {
            targetInfo = new LeaderboardDto.LeaderboardTargetInfo(
                    currentUserRank.username, 1, 0, "Xuất sắc! Bạn đang giữ vị trí Quán Quân dẫn đầu toàn bảng!"
            );
        }

        // Lấy Top 3 Podium cố định cho bục vinh danh
        List<LeaderboardDto.LeaderboardEntry> podium = entries.stream()
                .limit(3)
                .toList();

        // Phân trang danh sách học viên
        long totalElements = entries.size();
        int totalPages = totalElements > 0 ? (int) Math.ceil((double) totalElements / (double) finalSize) : 1;
        int fromIndex = Math.min(finalPage * finalSize, (int) totalElements);
        int toIndex = Math.min(fromIndex + finalSize, (int) totalElements);
        List<LeaderboardDto.LeaderboardEntry> pageUsers = entries.subList(fromIndex, toIndex);

        boolean isFirst = finalPage == 0;
        boolean isLast = finalPage >= totalPages - 1;

        return new LeaderboardDto.LeaderboardResponse(
                finalPeriod,
                finalLevel,
                podium,
                pageUsers,
                currentUserRank,
                targetInfo,
                finalPage,
                finalSize,
                totalElements,
                totalPages,
                isFirst,
                isLast
        );
    }

    private LeaderboardDto.LeaderboardEntry buildEntry(User u, String finalPeriod, UUID currentUserId, OffsetDateTime sevenDaysAgo) {
        boolean isSelf = currentUserId != null && u.getId().equals(currentUserId);
        int streak = u.getStreakCount() != null ? u.getStreakCount() : 0;
        long mastered;
        long reviews;
        long captures;
        long xp;

        if ("weekly".equals(finalPeriod)) {
            // Kỳ hạn Tuần: Ưu tiên đếm các hoạt động trong 7 ngày gần nhất
            long weeklyReviews = reviewLogRepository.countByUserIdAndReviewedAtAfter(u.getId(), sevenDaysAgo);
            long weeklyCaptures = captureRepository.countByUserIdAndCreatedAtAfter(u.getId(), sevenDaysAgo);
            long weeklyMastered = progressRepository.countByUserIdAndStatusAndUpdatedAtAfter(u.getId(), "MASTERED", sevenDaysAgo);

            // Nếu trong 7 ngày chưa có hoạt động mới phát sinh, tính điểm tuần dựa trên streak + 20% điểm cơ bản
            if (weeklyReviews == 0 && weeklyCaptures == 0 && weeklyMastered == 0) {
                long totalMastered = progressRepository.countByUserIdAndStatus(u.getId(), "MASTERED");
                long totalReviews = reviewLogRepository.countByUserId(u.getId());
                long totalCaptures = captureRepository.countByUserId(u.getId());
                xp = (weeklyMastered * 50L) + (weeklyCaptures * 20L) + (weeklyReviews * 10L)
                        + (Math.min(streak, 7) * 20L)
                        + Math.min(200L, (totalMastered * 10L) + (totalCaptures * 5L) + (totalReviews * 2L));
            } else {
                xp = (weeklyMastered * 50L) + (weeklyCaptures * 20L) + (weeklyReviews * 10L) + (Math.min(streak, 7) * 20L);
            }
            mastered = weeklyMastered;
            reviews = weeklyReviews;
            captures = weeklyCaptures;
        } else {
            // Toàn Thời Gian (All-Time)
            mastered = progressRepository.countByUserIdAndStatus(u.getId(), "MASTERED");
            reviews = reviewLogRepository.countByUserId(u.getId());
            captures = captureRepository.countByUserId(u.getId());
            xp = (mastered * 50L) + (captures * 20L) + (reviews * 10L) + (streak * 15L);
        }

        String displayName = (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getUsername();

        return new LeaderboardDto.LeaderboardEntry(
                0, // sẽ gán rank sau khi sort
                u.getId(),
                u.getUsername(),
                displayName,
                u.getAvatarUrl(),
                u.getTargetLevel() != null ? u.getTargetLevel() : "A2",
                streak,
                mastered,
                reviews,
                captures,
                xp,
                isSelf
        );
    }
}
