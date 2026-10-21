package com.vocario.controller;

import com.vocario.dto.CertificateDto;
import com.vocario.entity.User;
import com.vocario.service.AuthService;
import com.vocario.service.CertificateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/certificates")
@Tag(name = "8. Chứng Chỉ & Khảo Thí Năng Lực CEFR", description = "API Quản lý chứng chỉ hoàn thành cấp độ từ vựng CEFR, mã định danh tra cứu và phê duyệt phía Quản trị viên")
public class CertificateController {

    private final CertificateService certificateService;
    private final AuthService authService;

    public CertificateController(CertificateService certificateService, AuthService authService) {
        this.certificateService = certificateService;
        this.authService = authService;
    }

    @GetMapping("/my-certificates")
    @Operation(summary = "Lấy danh sách chứng chỉ học thuật của học viên hiện tại")
    public ResponseEntity<List<CertificateDto.CertificateResponse>> getMyCertificates(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(certificateService.getUserCertificates(userId));
    }

    @PostMapping("/claim")
    @Operation(summary = "Yêu cầu phát hành chứng chỉ CEFR khi học viên đạt chuẩn mốc từ vựng")
    public ResponseEntity<CertificateDto.CertificateResponse> claimCertificate(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId,
            @Parameter(description = "Cấp độ CEFR yêu cầu chứng chỉ (A1, A2, B1, B2, C1)")
            @RequestParam(defaultValue = "A1") String level
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(certificateService.claimCertificate(userId, level));
    }

    @GetMapping("/admin/all")
    @Operation(summary = "Lấy danh sách tất cả chứng chỉ trong hệ thống (dành cho Admin)")
    public ResponseEntity<List<CertificateDto.CertificateResponse>> getAllCertificatesAdmin() {
        return ResponseEntity.ok(certificateService.getAllCertificatesAdmin());
    }

    @PutMapping("/admin/approve/{id}")
    @Operation(summary = "Admin phê duyệt phát hành chính thức một chứng chỉ học viên")
    public ResponseEntity<CertificateDto.CertificateResponse> approveCertificate(
            @PathVariable UUID id,
            @RequestBody(required = false) CertificateDto.ApproveCertificateRequest request
    ) {
        String adminName = (request != null && request.adminName != null) ? request.adminName : "Quản Trị Viên Vocario";
        return ResponseEntity.ok(certificateService.approveCertificate(id, adminName));
    }

    @PutMapping("/admin/update/{id}")
    @Operation(summary = "Admin điều chỉnh thông tin chứng chỉ (tiêu đề, cấp độ, số từ, người duyệt, trạng thái)")
    public ResponseEntity<CertificateDto.CertificateResponse> updateCertificate(
            @PathVariable UUID id,
            @RequestBody CertificateDto.UpdateCertificateRequest request
    ) {
        return ResponseEntity.ok(certificateService.updateCertificate(id, request));
    }

    @PutMapping("/admin/revoke/{id}")
    @Operation(summary = "Admin thu hồi/vô hiệu hóa chứng chỉ")
    public ResponseEntity<CertificateDto.CertificateResponse> revokeCertificate(@PathVariable UUID id) {
        return ResponseEntity.ok(certificateService.revokeCertificate(id));
    }

    @PostMapping("/admin/manual-issue")
    @Operation(summary = "Admin đặc cách cấp chứng chỉ thủ công cho một học viên")
    public ResponseEntity<CertificateDto.CertificateResponse> manualIssueCertificate(
            @RequestBody CertificateDto.ManualIssueCertificateRequest request
    ) {
        return ResponseEntity.ok(certificateService.manualIssueCertificate(request));
    }

    @DeleteMapping("/admin/{id}")
    @Operation(summary = "Admin thu hồi hoặc xóa bỏ một chứng chỉ")
    public ResponseEntity<Void> deleteCertificate(@PathVariable UUID id) {
        certificateService.deleteCertificate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/cleanup")
    @Operation(summary = "Thu hồi tự động các chứng chỉ được tạo thử nghiệm chưa đạt 100% tiến độ")
    public ResponseEntity<Integer> cleanupPrematureCertificates() {
        return ResponseEntity.ok(certificateService.cleanupPrematureCertificates());
    }

    // ==================== CÁC ENDPOINT QUẢN LÝ DẠNG CHỨNG CHỈ (CERTIFICATE TYPES) ====================

    @GetMapping("/admin/types")
    @Operation(summary = "Lấy danh mục tất cả các loại/mẫu chứng chỉ trong hệ thống")
    public ResponseEntity<List<CertificateDto.CertificateTypeResponse>> getAllCertificateTypes() {
        return ResponseEntity.ok(certificateService.getAllCertificateTypes());
    }

    @PostMapping("/admin/types")
    @Operation(summary = "Tạo một dạng loại chứng chỉ mới trong hệ thống")
    public ResponseEntity<?> createCertificateType(@RequestBody CertificateDto.CreateCertificateTypeRequest request) {
        try {
            return ResponseEntity.ok(certificateService.createCertificateType(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/admin/types/{id}")
    @Operation(summary = "Cập nhật tiêu chuẩn hoặc thông tin một dạng chứng chỉ")
    public ResponseEntity<?> updateCertificateType(
            @PathVariable UUID id,
            @RequestBody CertificateDto.UpdateCertificateTypeRequest request
    ) {
        try {
            return ResponseEntity.ok(certificateService.updateCertificateType(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/types/{id}")
    @Operation(summary = "Xóa một dạng chứng chỉ khỏi danh mục hệ thống")
    public ResponseEntity<?> deleteCertificateType(@PathVariable UUID id) {
        try {
            certificateService.deleteCertificateType(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã xóa dạng chứng chỉ thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }
}


