package com.vocario.controller;

import com.vocario.dto.ClassroomDto;
import com.vocario.entity.User;
import com.vocario.service.AuthService;
import com.vocario.service.ClassroomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/classrooms")
@Tag(name = "5. Classrooms & Deck Sharing", description = "API Lớp học ảo, chia sẻ bộ từ vựng qua mã Code, làm bài thi và bảng xếp hạng Leaderboard")
public class ClassroomController {

    private final ClassroomService classroomService;
    private final AuthService authService;

    public ClassroomController(ClassroomService classroomService, AuthService authService) {
        this.classroomService = classroomService;
        this.authService = authService;
    }

    private UUID resolveUserId(UUID userId) {
        if (userId != null) {
            return userId;
        }
        User demo = authService.getOrCreateDemoUser();
        return demo.getId();
    }

    @PostMapping
    @Operation(summary = "Tạo phòng học / bộ từ vựng chia sẻ mới", description = "Tạo phòng học mới với mã tham gia tự động (VD: VOC-882), nạp danh sách từ vựng trích xuất hoặc tự chọn.")
    public ResponseEntity<ClassroomDto.ClassroomDetailResponse> createClassroom(
            @Parameter(description = "ID người dùng (nếu để trống sẽ dùng tài khoản demo)")
            @RequestParam(required = false) UUID userId,
            @RequestBody ClassroomDto.CreateClassroomRequest request
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.createClassroom(effectiveId, request));
    }

    @GetMapping("/{code}")
    @Operation(summary = "Xem chi tiết phòng học theo mã Code", description = "Lấy thông tin phòng, danh sách từ vựng, số lượng thành viên, và trạng thái đã kéo về sổ tay chưa.")
    public ResponseEntity<ClassroomDto.ClassroomDetailResponse> getClassroomByCode(
            @PathVariable String code,
            @Parameter(description = "ID người dùng (nếu để trống sẽ dùng tài khoản demo)")
            @RequestParam(required = false) UUID userId
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.getClassroomByCode(code, effectiveId));
    }

    @PostMapping("/{code}/join")
    @Operation(summary = "Tham gia phòng học bằng mã Code", description = "Học viên nhập mã phòng để gia nhập làm thành viên lớp học.")
    public ResponseEntity<ClassroomDto.ClassroomDetailResponse> joinClassroom(
            @PathVariable String code,
            @Parameter(description = "ID người dùng (nếu để trống sẽ dùng tài khoản demo)")
            @RequestParam(required = false) UUID userId
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.joinClassroom(effectiveId, code));
    }

    @PostMapping("/{code}/clone-to-notebook")
    @Operation(summary = "Kéo toàn bộ từ vựng trong phòng về sổ tay cá nhân", description = "Tự động import toàn bộ từ vựng của lớp vào user_word_progress để học theo thuật toán SM-2.")
    public ResponseEntity<Map<String, Object>> cloneToNotebook(
            @PathVariable String code,
            @Parameter(description = "ID người dùng (nếu để trống sẽ dùng tài khoản demo)")
            @RequestParam(required = false) UUID userId
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.cloneToNotebook(effectiveId, code));
    }

    @PostMapping("/save-words-to-notebook")
    @Operation(summary = "Lưu danh sách từ vựng trích xuất vào sổ tay cá nhân", description = "Lưu các từ vựng chọn lọc từ văn bản vào user_word_progress với thuật toán SM-2.")
    public ResponseEntity<Map<String, Object>> saveWordsToNotebook(
            @Parameter(description = "ID người dùng (nếu để trống sẽ dùng tài khoản demo)")
            @RequestParam(required = false) UUID userId,
            @RequestBody ClassroomDto.SaveWordsToNotebookRequest request
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.saveWordsToNotebook(effectiveId, request));
    }

    @PostMapping("/{code}/quiz-attempt")
    @Operation(summary = "Nộp kết quả bài kiểm tra lớp học", description = "Lưu điểm số bài trắc nghiệm / điền khuyết và thời gian làm bài, tự động cập nhật bảng xếp hạng lớp.")
    public ResponseEntity<List<ClassroomDto.LeaderboardItemDto>> submitQuizAttempt(
            @PathVariable String code,
            @Parameter(description = "ID người dùng (nếu để trống sẽ dùng tài khoản demo)")
            @RequestParam(required = false) UUID userId,
            @RequestBody ClassroomDto.QuizAttemptRequest request
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.submitQuizAttempt(effectiveId, code, request));
    }

    @GetMapping("/{code}/leaderboard")
    @Operation(summary = "Xem Bảng xếp hạng thành tích của lớp học", description = "Danh sách học viên đạt điểm cao nhất với thời gian làm bài ngắn nhất trong lớp.")
    public ResponseEntity<List<ClassroomDto.LeaderboardItemDto>> getLeaderboard(
            @PathVariable String code
    ) {
        return ResponseEntity.ok(classroomService.getClassroomLeaderboard(code));
    }

    @GetMapping("/my-classrooms")
    @Operation(summary = "Lấy danh sách các lớp học của tôi", description = "Bao gồm các lớp học do người dùng tạo hoặc đã tham gia.")
    public ResponseEntity<List<ClassroomDto.ClassroomSummaryDto>> getMyClassrooms(
            @Parameter(description = "ID người dùng (nếu để trống sẽ dùng tài khoản demo)")
            @RequestParam(required = false) UUID userId
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.getMyClassrooms(effectiveId));
    }

    @PostMapping("/{code}/words")
    @Operation(summary = "Thêm từ vựng mới vào phòng học", description = "Chủ phòng thêm các từ vựng từ sổ tay, trích xuất AI hoặc nhập tay vào phòng học.")
    public ResponseEntity<ClassroomDto.ClassroomDetailResponse> addWordsToClassroom(
            @PathVariable String code,
            @Parameter(description = "ID người dùng (chủ phòng)")
            @RequestParam(required = false) UUID userId,
            @RequestBody ClassroomDto.AddWordsRequest request
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.addWordsToClassroom(effectiveId, code, request));
    }

    @PostMapping("/{code}/flashcard-progress")
    @Operation(summary = "Lưu tiến độ học Flashcard của học viên", description = "Cập nhật số từ đã thuộc, chưa thuộc và trạng thái hoàn thành bộ thẻ của học viên trong phòng.")
    public ResponseEntity<Map<String, Object>> saveFlashcardProgress(
            @PathVariable String code,
            @Parameter(description = "ID học viên")
            @RequestParam(required = false) UUID userId,
            @RequestBody ClassroomDto.SaveFlashcardProgressRequest request
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.saveFlashcardProgress(effectiveId, code, request));
    }

    @GetMapping("/{code}/progress-dashboard")
    @Operation(summary = "Xem Dashboard tiến độ học Flashcard của các thành viên", description = "Dành cho chủ phòng theo dõi tỷ lệ thuộc bài, danh sách thành viên và các từ khó nhất lớp.")
    public ResponseEntity<ClassroomDto.ClassroomProgressDashboardResponse> getProgressDashboard(
            @PathVariable String code,
            @Parameter(description = "ID chủ phòng")
            @RequestParam(required = false) UUID userId
    ) {
        UUID effectiveId = resolveUserId(userId);
        return ResponseEntity.ok(classroomService.getProgressDashboard(effectiveId, code));
    }
}
