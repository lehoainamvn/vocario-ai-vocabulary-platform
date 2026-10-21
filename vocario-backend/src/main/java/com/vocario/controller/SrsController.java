package com.vocario.controller;

import com.vocario.dto.ReviewDto;
import com.vocario.entity.User;
import com.vocario.entity.UserWordProgress;
import com.vocario.service.AuthService;
import com.vocario.service.SrsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/srs")
@Tag(name = "2. Spaced Repetition (SM-2)", description = "API Hàng đợi ôn tập Flashcard và Thuật toán SuperMemo 2")
public class SrsController {

    private final SrsService srsService;
    private final AuthService authService;

    public SrsController(SrsService srsService, AuthService authService) {
        this.srsService = srsService;
        this.authService = authService;
    }

    @GetMapping("/due-cards")
    @Operation(
        summary = "Lấy danh sách thẻ từ vựng đến hạn ôn tập hôm nay",
        description = "Truy vấn các thẻ từ vựng có next_review_date <= hiện tại theo thuật toán SM-2 để người học ôn tập."
    )
    public ResponseEntity<List<UserWordProgress>> getDueCards(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(srsService.getDueCards(userId));
    }

    @PostMapping("/review")
    @Operation(
        summary = "Gửi kết quả ôn tập (Chấm điểm SM-2)",
        description = "Gửi điểm số từ 0 (Quên sạch) đến 5 (Nhớ hoàn hảo). Hệ thống sẽ tự động chạy thuật toán SM-2 để tính toán hệ số dễ nhớ (EF) và chu kỳ ôn tập tiếp theo (Interval)."
    )
    public ResponseEntity<ReviewDto.ReviewResponse> submitReview(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId,
            @Valid @RequestBody ReviewDto.ReviewRequest request
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(srsService.processReview(userId, request));
    }

    @GetMapping("/streak")
    @Operation(summary = "Kiểm tra chuỗi Streak ngày học của học viên", description = "Lấy số ngày streak liên tiếp hiện tại và thông báo chúc mừng/khích lệ")
    public ResponseEntity<SrsService.StreakUpdateResult> getStreakStatus(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) {
        if (userId == null) {
            userId = authService.getOrCreateDemoUser().getId();
        }
        return ResponseEntity.ok(srsService.getStreakStatus(userId));
    }

    @PostMapping("/mark-mastered")
    @Operation(
        summary = "Đánh dấu từ vựng đã thuộc ngay lập tức (Bỏ qua 5 chu kỳ SM-2)",
        description = "Chuyển thẳng trạng thái từ vựng sang MASTERED và gán repetition >= 5 nếu người học đã thành thạo từ trước."
    )
    public ResponseEntity<ReviewDto.ReviewResponse> markMastered(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId,
            @Parameter(description = "ID tiến trình học (UUID hoặc ID tạm thời)")
            @RequestParam(required = false) String progressId,
            @Parameter(description = "Từ vựng tiếng Anh (nếu từ chưa có tiến trình học)")
            @RequestParam(required = false) String wordText
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(srsService.markAsMastered(userId, progressId, wordText));
    }

    @GetMapping("/stats")
    @Operation(
        summary = "Thống kê số liệu học tập SM-2",
        description = "Truy vấn bảng user_word_progress để tính số từ đến hạn ôn, số từ đang học, số từ thành thạo."
    )
    public ResponseEntity<java.util.Map<String, Object>> getStats(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(srsService.getStats(userId));
    }

    @GetMapping("/my-words")
    @Operation(
        summary = "Lấy toàn bộ sổ từ vựng cá nhân của người dùng",
        description = "Truy vấn bảng user_word_progress để lấy danh sách từ vựng riêng biệt của tài khoản đang đăng nhập."
    )
    public ResponseEntity<List<UserWordProgress>> getMyWords(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(srsService.getUserWords(userId));
    }

    @GetMapping("/target-progress")
    @Operation(
        summary = "Lấy tiến độ mục tiêu CEFR và trạng thái thăng cấp",
        description = "Tính toán số từ đã thành thạo theo trình độ mục tiêu của học viên và đánh giá điều kiện thăng cấp."
    )
    public ResponseEntity<com.vocario.dto.TargetProgressDto> getTargetProgress(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(srsService.getTargetProgress(userId));
    }

    @DeleteMapping("/progress/{progressId}")
    @Operation(summary = "Xóa một từ vựng khỏi sổ từ học tập SM-2")
    public ResponseEntity<Void> deleteWordProgress(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId,
            @PathVariable UUID progressId
    ) {
        if (userId == null) {
            userId = authService.getOrCreateDemoUser().getId();
        }
        srsService.deleteWordProgress(userId, progressId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/topic")
    @Operation(summary = "Xóa toàn bộ từ vựng thuộc một chủ đề khỏi sổ tay SM-2")
    public ResponseEntity<Void> deleteTopicProgress(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId,
            @RequestParam String topicName
    ) {
        if (userId == null) {
            userId = authService.getOrCreateDemoUser().getId();
        }
        srsService.deleteTopicProgress(userId, topicName);
        return ResponseEntity.noContent().build();
    }
}
