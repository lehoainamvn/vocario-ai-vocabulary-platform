package com.vocario.controller;

import com.vocario.dto.LeaderboardDto;
import com.vocario.entity.User;
import com.vocario.service.AuthService;
import com.vocario.service.LeaderboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/leaderboard")
@Tag(name = "6. Bảng Xếp Hạng & Gamification", description = "API Đấu trường tri thức, tính điểm kinh nghiệm XP và vinh danh Top học viên")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final AuthService authService;

    public LeaderboardController(LeaderboardService leaderboardService, AuthService authService) {
        this.leaderboardService = leaderboardService;
        this.authService = authService;
    }

    @GetMapping
    @Operation(
        summary = "Lấy danh sách bảng xếp hạng học viên có phân trang",
        description = "Truy vấn bảng xếp hạng theo kỳ hạn (weekly/all-time), phân loại cấp độ CEFR và phân trang theo trang (page) và kích thước (size)."
    )
    public ResponseEntity<LeaderboardDto.LeaderboardResponse> getLeaderboard(
            @Parameter(description = "ID người dùng (nếu để trống sẽ tự động lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId,
            @Parameter(description = "Kỳ hạn xếp hạng: 'weekly' (Tuần này) hoặc 'all-time' (Toàn thời gian)")
            @RequestParam(defaultValue = "all-time") String period,
            @Parameter(description = "Bộ lọc cấp độ CEFR: 'ALL', 'A1', 'A2', 'B1', 'B2', 'C1'")
            @RequestParam(defaultValue = "ALL") String level,
            @Parameter(description = "Chỉ số trang (0-indexed, mặc định 0)")
            @RequestParam(defaultValue = "0") Integer page,
            @Parameter(description = "Số lượng học viên trên mỗi trang (mặc định 10)")
            @RequestParam(defaultValue = "10") Integer size
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(leaderboardService.getLeaderboard(userId, period, level, page, size));
    }

    @GetMapping("/my-rank")
    @Operation(
        summary = "Lấy thông tin thứ hạng và mục tiêu vượt hạng của học viên hiện tại",
        description = "Trả về thứ hạng, điểm XP và gợi ý nhiệm vụ để vượt qua bạn học xếp ngay phía trên."
    )
    public ResponseEntity<LeaderboardDto.LeaderboardEntry> getMyRank(
            @Parameter(description = "ID người dùng (nếu để trống sẽ tự động lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId,
            @Parameter(description = "Kỳ hạn: 'weekly' hoặc 'all-time'")
            @RequestParam(defaultValue = "all-time") String period
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        LeaderboardDto.LeaderboardResponse res = leaderboardService.getLeaderboard(userId, period, "ALL", 0, 1);
        return ResponseEntity.ok(res.currentUserRank);
    }
}
