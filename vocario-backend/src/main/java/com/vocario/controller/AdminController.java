package com.vocario.controller;

import com.vocario.dto.AdminDto;
import com.vocario.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/admin")
@Tag(name = "5. Admin Management", description = "Cổng Quản Trị Hệ Thống: Thống kê Dashboard KPI, Kho Từ Vựng CEFR & Học Viên")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    @Operation(summary = "Lấy dữ liệu Dashboard Quản Trị", description = "Trả về 4 chỉ số KPI chính, phân bố cấp độ CEFR và nhật ký hoạt động gần nhất.")
    public ResponseEntity<AdminDto.AdminStats> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ==================== KHO TỪ ĐIỂN CEFR ====================

    @GetMapping("/words")
    @Operation(summary = "Lấy danh sách từ vựng phân trang", description = "Hỗ trợ tìm kiếm từ, lọc theo cấp độ CEFR và loại từ.")
    public ResponseEntity<AdminDto.WordPageResponse> getWords(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String cefrLevel,
            @RequestParam(required = false) String partOfSpeech,
            @RequestParam(defaultValue = "newest") String sortBy) {
        return ResponseEntity.ok(adminService.getWordsPaged(page, size, search, cefrLevel, partOfSpeech, sortBy));
    }

    @GetMapping("/words/{id}")
    @Operation(summary = "Chi tiết một từ vựng", description = "Lấy chi tiết mục từ kèm số học viên đang theo học.")
    public ResponseEntity<AdminDto.WordItemResponse> getWordDetails(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(adminService.getWordDetails(id));
    }

    @PostMapping("/words")
    @Operation(summary = "Thêm từ vựng mới", description = "Tạo một từ vựng mới vào kho từ điển hệ thống.")
    public ResponseEntity<?> createWord(@RequestBody AdminDto.WordRequest req) {
        try {
            return ResponseEntity.ok(adminService.createWord(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/words/{id}")
    @Operation(summary = "Cập nhật từ vựng", description = "Chỉnh sửa thông tin từ vựng trong kho từ điển.")
    public ResponseEntity<?> updateWord(@PathVariable java.util.UUID id, @RequestBody AdminDto.WordRequest req) {
        try {
            return ResponseEntity.ok(adminService.updateWord(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/words/{id}")
    @Operation(summary = "Xóa từ vựng", description = "Xóa từ vựng khỏi kho từ điển. Thêm ?force=true nếu muốn xóa kèm tiến trình học viên.")
    public ResponseEntity<?> deleteWord(
            @PathVariable java.util.UUID id,
            @RequestParam(defaultValue = "false") boolean force) {
        try {
            adminService.deleteWord(id, force);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã xóa từ vựng thành công!", "id", id.toString()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(java.util.Map.of(
                    "error", e.getMessage(),
                    "requiresForce", true
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/words/bulk")
    @Operation(summary = "Nạp từ vựng hàng loạt", description = "Nạp danh sách từ vựng từ tệp hoặc mảng đối tượng.")
    public ResponseEntity<AdminDto.BulkWordResult> bulkCreateWords(@RequestBody java.util.List<AdminDto.WordRequest> requests) {
        return ResponseEntity.ok(adminService.bulkCreateWords(requests));
    }

    // ==================== QUẢN LÝ HỌC VIÊN ====================

    @GetMapping("/users/stats")
    @Operation(summary = "Thống kê tổng quan học viên", description = "Lấy các chỉ số KPI: Tổng số học viên, đang hoạt động, streak trung bình, số từ đã thuộc.")
    public ResponseEntity<AdminDto.UserOverviewStats> getUserOverviewStats() {
        return ResponseEntity.ok(adminService.getUserOverviewStats());
    }

    @GetMapping("/users")
    @Operation(summary = "Danh sách học viên phân trang", description = "Hỗ trợ tìm kiếm theo tên/email, lọc theo vai trò và cấp độ mục tiêu.")
    public ResponseEntity<AdminDto.UserPageResponse> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String targetLevel,
            @RequestParam(defaultValue = "newest") String sortBy) {
        return ResponseEntity.ok(adminService.getUsersPaged(page, size, search, role, targetLevel, sortBy));
    }

    @GetMapping("/users/{id}/analytics")
    @Operation(summary = "Hồ sơ học lực & phân tích SM-2 chi tiết", description = "Lấy chi tiết 4 giai đoạn SM-2, hệ số ghi nhớ EF, ảnh chụp Vision và lượt ôn tập gần nhất.")
    public ResponseEntity<?> getUserAnalytics(@PathVariable java.util.UUID id) {
        try {
            return ResponseEntity.ok(adminService.getUserAnalytics(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Cập nhật thông tin học viên", description = "Sửa họ tên, cấp độ mục tiêu CEFR, mục tiêu ngày và vai trò.")
    public ResponseEntity<?> updateUser(@PathVariable java.util.UUID id, @RequestBody AdminDto.UserUpdateRequest req) {
        try {
            return ResponseEntity.ok(adminService.updateUser(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/{id}/reset-progress")
    @Operation(summary = "Đặt lại tiến trình học SM-2", description = "Xóa toàn bộ từ vựng và lịch sử ôn tập của học viên để học lại từ đầu.")
    public ResponseEntity<?> resetUserProgress(@PathVariable java.util.UUID id) {
        try {
            adminService.resetUserProgress(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã đặt lại tiến trình học SM-2 thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users")
    @Operation(summary = "Tạo tài khoản học viên mới", description = "Quản trị viên khởi tạo tài khoản học viên trực tiếp trên hệ thống.")
    public ResponseEntity<?> createUser(@RequestBody AdminDto.CreateUserRequest request) {
        try {
            return ResponseEntity.ok(adminService.createUser(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Xóa người dùng", description = "Xóa người dùng và toàn bộ dữ liệu liên quan khỏi hệ thống.")
    public ResponseEntity<?> deleteUser(@PathVariable java.util.UUID id) {
        try {
            adminService.deleteUser(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã xóa tài khoản thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    // ==================== PHÂN HỆ 4: KIỂM DUYỆT BỐI CẢNH AI VISION ====================

    @GetMapping("/vision/overview")
    @Operation(summary = "Thống kê tổng quan Phân Hệ AI Vision", description = "Trả về tổng ảnh, tổng vật thể nhận diện, phân bố chủ đề và top nhãn phổ biến.")
    public ResponseEntity<AdminDto.VisionOverviewStats> getVisionOverview() {
        return ResponseEntity.ok(adminService.getVisionOverviewStats());
    }

    @GetMapping("/vision/captures")
    @Operation(summary = "Danh sách ảnh bối cảnh phân trang", description = "Hỗ trợ lọc theo chủ đề phòng và tìm kiếm từ khóa/học viên.")
    public ResponseEntity<AdminDto.CapturePageResponse> getVisionCaptures(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String theme,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(adminService.getCapturesPaged(page, size, theme, search));
    }

    @DeleteMapping("/vision/captures/{id}")
    @Operation(summary = "Xóa ảnh bối cảnh vi phạm", description = "Xóa một ảnh bối cảnh khỏi CSDL và tách liên kết thẻ từ vựng an toàn.")
    public ResponseEntity<?> deleteVisionCapture(@PathVariable java.util.UUID id) {
        try {
            adminService.deleteCapture(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã xóa ảnh bối cảnh thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/vision/promote-word")
    @Operation(summary = "Phê duyệt nhãn AI vào Từ Điển CEFR", description = "Duyệt một vật thể do AI phát hiện thành từ vựng chính thức của hệ thống.")
    public ResponseEntity<?> promoteVisionWord(@RequestBody AdminDto.PromoteWordRequest req) {
        try {
            return ResponseEntity.ok(adminService.promoteWord(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    // ==================== PHÂN HỆ 5: CẤU HÌNH THUẬT TOÁN SM-2 & HỆ THỐNG ====================

    @GetMapping("/settings")
    @Operation(summary = "Lấy cấu hình hệ thống hiện tại", description = "Thông số thuật toán Spaced Repetition SM-2, hạn mức và ngưỡng AI Vision.")
    public ResponseEntity<AdminDto.SystemSettingsDto> getSystemSettings() {
        return ResponseEntity.ok(adminService.getSystemSettings());
    }

    @PutMapping("/settings")
    @Operation(summary = "Cập nhật cấu hình hệ thống", description = "Lưu các tham số thuật toán SM-2 và ngưỡng lọc tin cậy AI Vision.")
    public ResponseEntity<AdminDto.SystemSettingsDto> updateSystemSettings(@RequestBody AdminDto.SystemSettingsDto req) {
        return ResponseEntity.ok(adminService.updateSystemSettings(req));
    }

    @PostMapping("/settings/reset")
    @Operation(summary = "Khôi phục cấu hình mặc định SM-2", description = "Đặt lại toàn bộ thông số thuật toán theo chuẩn SuperMemo SM-2 & YOLO-World.")
    public ResponseEntity<AdminDto.SystemSettingsDto> resetSystemSettings() {
        return ResponseEntity.ok(adminService.resetSystemSettings());
    }

    // ==================== PHÂN HỆ 6: PHÂN TÍCH PHÁT ÂM AI ====================

    @GetMapping("/speech/analytics")
    @Operation(summary = "Thống kê Phân Hệ Phân Tích Luyện Phát Âm AI", description = "Trả về điểm phát âm trung bình, tỷ lệ đạt, top từ học viên hay phát âm sai nhất và nhật ký chấm phát âm thời gian thực.")
    public ResponseEntity<AdminDto.SpeechAnalyticsResponse> getSpeechAnalytics(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(adminService.getSpeechAnalytics(page, size));
    }

    // ==================== PHÂN HỆ 7: QUẢN LÝ LỚP HỌC (CLASSROOM MANAGEMENT) ====================

    @GetMapping("/classrooms/stats")
    @Operation(summary = "Thống kê tổng quan Phân Hệ Lớp Học", description = "Trả về tổng số lớp học, lớp đang mở, lớp bị khóa, tổng số từ vựng và số học viên tham gia.")
    public ResponseEntity<AdminDto.ClassroomOverviewStats> getClassroomOverviewStats() {
        return ResponseEntity.ok(adminService.getClassroomOverviewStats());
    }

    @GetMapping("/classrooms")
    @Operation(summary = "Danh sách lớp học phân trang", description = "Tìm kiếm theo mã phòng, tên lớp, chủ phòng và lọc theo trạng thái.")
    public ResponseEntity<AdminDto.AdminClassroomPageResponse> getClassrooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "newest") String sortBy) {
        return ResponseEntity.ok(adminService.getClassroomsPaged(page, size, search, status, sortBy));
    }

    @GetMapping("/classrooms/{id}")
    @Operation(summary = "Chi tiết lớp học", description = "Lấy thông tin chi tiết phòng, danh sách từ vựng, tiến độ học viên và bảng xếp hạng.")
    public ResponseEntity<?> getClassroomDetail(@PathVariable java.util.UUID id) {
        try {
            return ResponseEntity.ok(adminService.getClassroomDetail(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/classrooms/{id}/status")
    @Operation(summary = "Khóa hoặc Mở khóa lớp học", description = "Chuyển đổi trạng thái ACTIVE / LOCKED của lớp học.")
    public ResponseEntity<?> toggleClassroomStatus(@PathVariable java.util.UUID id) {
        try {
            return ResponseEntity.ok(adminService.toggleClassroomStatus(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/classrooms/{id}")
    @Operation(summary = "Xóa phòng học", description = "Xóa vĩnh viễn phòng học cùng toàn bộ từ vựng, thành viên và bài làm kiểm tra liên quan.")
    public ResponseEntity<?> deleteClassroom(@PathVariable java.util.UUID id) {
        try {
            adminService.deleteClassroom(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã xóa phòng học thành công!", "id", id.toString()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/classrooms/words/{wordId}/promote")
    @Operation(summary = "Phê duyệt từ vựng lớp học vào Kho từ điển CEFR", description = "Đưa một từ vựng do người dùng tự nhập trong phòng học vào Kho từ điển chính thức của hệ thống.")
    public ResponseEntity<?> promoteClassroomWord(
            @PathVariable java.util.UUID wordId,
            @RequestParam(required = false, defaultValue = "B1") String cefrLevel,
            @RequestParam(required = false, defaultValue = "Lớp học cộng đồng") String category) {
        try {
            return ResponseEntity.ok(adminService.promoteClassroomWord(wordId, cefrLevel, category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

}
