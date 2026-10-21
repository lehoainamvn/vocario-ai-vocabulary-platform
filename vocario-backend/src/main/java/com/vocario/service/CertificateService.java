package com.vocario.service;

import com.vocario.dto.CertificateDto;
import com.vocario.entity.Certificate;
import com.vocario.entity.User;
import com.vocario.entity.UserWordProgress;
import com.vocario.repository.CertificateRepository;
import com.vocario.repository.UserRepository;
import com.vocario.repository.UserWordProgressRepository;
import com.vocario.entity.CertificateType;
import com.vocario.repository.CertificateTypeRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
public class CertificateService {

    private static final Logger log = LoggerFactory.getLogger(CertificateService.class);

    private final CertificateRepository certificateRepository;
    private final CertificateTypeRepository certificateTypeRepository;
    private final UserRepository userRepository;
    private final UserWordProgressRepository progressRepository;

    public CertificateService(CertificateRepository certificateRepository,
                              CertificateTypeRepository certificateTypeRepository,
                              UserRepository userRepository,
                              UserWordProgressRepository progressRepository) {
        this.certificateRepository = certificateRepository;
        this.certificateTypeRepository = certificateTypeRepository;
        this.userRepository = userRepository;
        this.progressRepository = progressRepository;
    }

    @PostConstruct
    public void initDefaultCertificateTypes() {
        if (certificateTypeRepository.count() == 0) {
            log.info("🌟 [INIT CERT TYPES] Khởi tạo các mẫu chứng chỉ khảo thí CEFR mặc định...");
            List<CertificateType> defaults = List.of(
                new CertificateType("A1", "Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR A1", "A1", 10, 0,
                    "Đánh giá năng lực ghi nhận và vận dụng vốn từ căn bản trong đời sống hàng ngày theo khung tham chiếu Châu Âu CEFR A1.",
                    "Hội Đồng Khảo Thí & Đào Tạo Vocario", "#059669", true),
                new CertificateType("A2", "Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR A2", "A2", 15, 3,
                    "Thẩm định năng lực giao tiếp sơ cấp và ghi nhớ từ vựng theo thuật toán lặp lại ngắt quãng SM-2.",
                    "Hội Đồng Khảo Thí & Đào Tạo Vocario", "#2563EB", true),
                new CertificateType("B1", "Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR B1", "B1", 20, 5,
                    "Chứng nhận khả năng làm chủ từ vựng trung cấp độc lập, hiểu rõ ngữ cảnh giao tiếp học thuật và công việc.",
                    "Hội Đồng Khảo Thí & Đào Tạo Vocario", "#7C3AED", true),
                new CertificateType("B2", "Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR B2", "B2", 30, 7,
                    "Năng lực sử dụng tiếng Anh nâng cao, nắm vững trường từ vựng trừu tượng và phản xạ tự nhiên.",
                    "Hội Đồng Khảo Thí & Đào Tạo Vocario", "#B45309", true),
                new CertificateType("C1", "Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR C1", "C1", 50, 14,
                    "Đạt đỉnh cao học thuật, làm chủ vốn từ chuyên ngành sâu và phản xạ ngôn ngữ tương đương bản xứ.",
                    "Hội Đồng Khảo Thí & Đào Tạo Vocario", "#BE123C", true)
            );
            certificateTypeRepository.saveAll(defaults);
            log.info("✅ [INIT CERT TYPES] Đã tạo thành công {} loại chứng chỉ tiêu chuẩn!", defaults.size());
        }
    }

    public List<CertificateDto.CertificateResponse> getUserCertificates(UUID userId) {
        log.info("📜 [CERTIFICATE] Lấy danh sách chứng chỉ của học viên ID: {}", userId);
        return certificateRepository.findByUserIdOrderByIssueDateDesc(userId)
                .stream()
                .map(CertificateDto.CertificateResponse::new)
                .toList();
    }

    @Transactional
    public CertificateDto.CertificateResponse claimCertificate(UUID userId, String level) {
        String finalLevel = (level != null && !level.isBlank()) ? level.trim().toUpperCase() : "A1";
        log.info("🎓 [CERTIFICATE] Học viên ID {} yêu cầu cấp chứng chỉ cấp độ: {}", userId, finalLevel);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin học viên ID: " + userId));

        // 1. Kiểm tra xem học viên đã từng được cấp chứng chỉ cấp độ này chưa
        Optional<Certificate> existing = certificateRepository.findByUserIdAndCefrLevel(userId, finalLevel);
        if (existing.isPresent()) {
            log.info("ℹ️ [CERTIFICATE] Học viên đã sở hữu chứng chỉ cấp độ {}. Mã: {}",
                    finalLevel, existing.get().getCertificateCode());
            return new CertificateDto.CertificateResponse(existing.get());
        }

        // 2. Kiểm tra số từ vựng thành thạo (MASTERED) ở cấp độ này
        List<UserWordProgress> userWords = progressRepository.findUserWordsWithDetails(userId);
        long masteredCountAtLevel = userWords.stream()
                .filter(w -> {
                    String wLvl = (w.getWord() != null && w.getWord().getCefrLevel() != null)
                            ? w.getWord().getCefrLevel().toUpperCase().trim() : "A2";
                    return wLvl.equals(finalLevel) && "MASTERED".equalsIgnoreCase(w.getStatus());
                })
                .count();

        // Tiêu chuẩn bắt buộc: Phải làm chủ tối thiểu 10 từ (MASTERED) để đạt 100% cấp độ
        int requiredMasteredWords = 10;
        if (masteredCountAtLevel < requiredMasteredWords) {
            log.warn("⛔ [CERTIFICATE DENIED] Học viên ID {} chưa đủ điều kiện nhận chứng chỉ {}. Đã thành thạo: {}/{}",
                    userId, finalLevel, masteredCountAtLevel, requiredMasteredWords);
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    String.format("Chưa đủ điều kiện! Bạn chưa hoàn thành 100%% cấp độ %s (Cần tối thiểu %d từ thành thạo, hiện tại mới có %d từ).",
                            finalLevel, requiredMasteredWords, masteredCountAtLevel)
            );
        }

        int streak = user.getStreakCount() != null ? user.getStreakCount() : 0;
        int year = OffsetDateTime.now().getYear();
        int randomCode = 1000 + (int) (Math.random() * 9000);
        String certCode = String.format("VOC-%s-%d-%04d", finalLevel, year, randomCode);
        String certTitle = "Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR " + finalLevel;

        Certificate cert = new Certificate(
                user,
                finalLevel,
                certCode,
                certTitle,
                (int) masteredCountAtLevel,
                streak,
                "ISSUED",
                "Hội Đồng Khảo Thí & Đào Tạo Vocario"
        );

        Certificate saved = certificateRepository.save(cert);
        log.info("✅ [CERTIFICATE ISSUED] Đã phát hành chứng chỉ thành công! Mã: {}, Học viên: {}, Cấp độ: {}",
                saved.getCertificateCode(), user.getUsername(), finalLevel);

        return new CertificateDto.CertificateResponse(saved);
    }

    @Transactional
    public void deleteCertificate(UUID id) {
        log.info("🗑️ [CERTIFICATE DELETED] Xóa/thu hồi chứng chỉ ID: {}", id);
        certificateRepository.deleteById(id);
    }

    @Transactional
    public int cleanupPrematureCertificates() {
        List<Certificate> all = certificateRepository.findAll();
        int count = 0;
        for (Certificate c : all) {
            if (c.getMasteredWordsCount() == null || c.getMasteredWordsCount() < 10) {
                log.info("🧹 [CLEANUP] Thu hồi chứng chỉ chưa đạt 100%: Mã {}, Cấp độ {}, Từ thành thạo: {}",
                        c.getCertificateCode(), c.getCefrLevel(), c.getMasteredWordsCount());
                certificateRepository.delete(c);
                count++;
            }
        }
        return count;
    }

    public List<CertificateDto.CertificateResponse> getAllCertificatesAdmin() {
        log.info("🛡️ [ADMIN CERTIFICATES] Tải toàn bộ chứng chỉ trong hệ thống");
        return certificateRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(CertificateDto.CertificateResponse::new)
                .toList();
    }

    @Transactional
    public CertificateDto.CertificateResponse approveCertificate(UUID certId, String adminName) {
        log.info("🛡️ [ADMIN APPROVE] Phê duyệt chứng chỉ ID: {} bởi Admin: {}", certId, adminName);
        Certificate cert = certificateRepository.findById(certId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chứng chỉ ID: " + certId));

        cert.setStatus("ISSUED");
        cert.setApprovedBy((adminName != null && !adminName.isBlank()) ? adminName : "Quản Trị Viên Vocario");
        cert.setUpdatedAt(OffsetDateTime.now());

        Certificate saved = certificateRepository.save(cert);
        return new CertificateDto.CertificateResponse(saved);
    }

    @Transactional
    public CertificateDto.CertificateResponse updateCertificate(UUID certId, CertificateDto.UpdateCertificateRequest request) {
        log.info("🛡️ [ADMIN UPDATE] Điều chỉnh chứng chỉ ID: {}", certId);
        Certificate cert = certificateRepository.findById(certId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy chứng chỉ ID: " + certId));

        if (request.title != null && !request.title.isBlank()) {
            cert.setTitle(request.title.trim());
        }
        if (request.cefrLevel != null && !request.cefrLevel.isBlank()) {
            cert.setCefrLevel(request.cefrLevel.trim().toUpperCase());
        }
        if (request.approvedBy != null && !request.approvedBy.isBlank()) {
            cert.setApprovedBy(request.approvedBy.trim());
        }
        if (request.status != null && !request.status.isBlank()) {
            cert.setStatus(request.status.trim().toUpperCase());
        }
        if (request.masteredWordsCount != null) {
            cert.setMasteredWordsCount(request.masteredWordsCount);
        }
        if (request.streakCount != null) {
            cert.setStreakCount(request.streakCount);
        }
        cert.setUpdatedAt(OffsetDateTime.now());

        Certificate saved = certificateRepository.save(cert);
        return new CertificateDto.CertificateResponse(saved);
    }

    @Transactional
    public CertificateDto.CertificateResponse manualIssueCertificate(CertificateDto.ManualIssueCertificateRequest request) {
        log.info("🛡️ [ADMIN MANUAL ISSUE] Cấp chứng chỉ đặc cách cho User ID: {}", request.userId);
        User user = userRepository.findById(request.userId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy học viên ID: " + request.userId));

        String finalLevel = (request.cefrLevel != null && !request.cefrLevel.isBlank())
                ? request.cefrLevel.trim().toUpperCase() : "A1";

        int year = OffsetDateTime.now().getYear();
        int randomCode = 1000 + (int) (Math.random() * 9000);
        String certCode = String.format("VOC-%s-%d-%04d", finalLevel, year, randomCode);
        String certTitle = (request.title != null && !request.title.isBlank())
                ? request.title.trim() : "Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR " + finalLevel;
        String approver = (request.approvedBy != null && !request.approvedBy.isBlank())
                ? request.approvedBy.trim() : "Hội Đồng Khảo Thí & Đào Tạo Vocario (Đặc Cách)";
        int masteredWords = request.masteredWordsCount != null ? request.masteredWordsCount : 10;
        int streak = user.getStreakCount() != null ? user.getStreakCount() : 1;

        Certificate cert = new Certificate(
                user,
                finalLevel,
                certCode,
                certTitle,
                masteredWords,
                streak,
                "ISSUED",
                approver
        );

        Certificate saved = certificateRepository.save(cert);
        return new CertificateDto.CertificateResponse(saved);
    }

    @Transactional
    public CertificateDto.CertificateResponse revokeCertificate(UUID certId) {
        log.info("🛡️ [ADMIN REVOKE] Thu hồi chứng chỉ ID: {}", certId);
        Certificate cert = certificateRepository.findById(certId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy chứng chỉ ID: " + certId));

        cert.setStatus("REVOKED");
        cert.setUpdatedAt(OffsetDateTime.now());
        Certificate saved = certificateRepository.save(cert);
        return new CertificateDto.CertificateResponse(saved);
    }

    // ==================== QUẢN LÝ CÁC DẠNG LOẠI CHỨNG CHỈ (CERTIFICATE TYPES) ====================

    public List<CertificateDto.CertificateTypeResponse> getAllCertificateTypes() {
        initDefaultCertificateTypes();
        List<CertificateType> types = certificateTypeRepository.findAllByOrderByCreatedAtAsc();
        return types.stream()
                .map(t -> {
                    long issuedCount = certificateRepository.countByCefrLevel(t.getCefrLevel());
                    return new CertificateDto.CertificateTypeResponse(t, issuedCount);
                })
                .toList();
    }

    @Transactional
    public CertificateDto.CertificateTypeResponse createCertificateType(CertificateDto.CreateCertificateTypeRequest req) {
        if (req.typeCode == null || req.typeCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Mã loại chứng chỉ không được để trống!");
        }
        if (req.title == null || req.title.trim().isEmpty()) {
            throw new IllegalArgumentException("Tiêu đề chứng chỉ không được để trống!");
        }

        String cleanCode = req.typeCode.trim().toUpperCase();
        if (certificateTypeRepository.existsByTypeCode(cleanCode)) {
            throw new IllegalArgumentException("Mã dạng chứng chỉ '" + cleanCode + "' đã tồn tại trong hệ thống!");
        }

        CertificateType type = new CertificateType();
        type.setTypeCode(cleanCode);
        type.setTitle(req.title.trim());
        type.setCefrLevel(req.cefrLevel != null && !req.cefrLevel.trim().isEmpty() ? req.cefrLevel.trim().toUpperCase() : "A1");
        type.setRequiredWords(req.requiredWords != null && req.requiredWords > 0 ? req.requiredWords : 10);
        type.setRequiredStreak(req.requiredStreak != null && req.requiredStreak >= 0 ? req.requiredStreak : 0);
        type.setDescription(req.description != null ? req.description.trim() : "");
        type.setApprovedBy(req.approvedBy != null && !req.approvedBy.trim().isEmpty() 
                ? req.approvedBy.trim() : "Hội Đồng Khảo Thí & Đào Tạo Vocario");
        type.setBadgeColor(req.badgeColor != null && !req.badgeColor.trim().isEmpty() ? req.badgeColor.trim() : "#7D6853");
        type.setIsActive(req.isActive != null ? req.isActive : true);
        type.setCreatedAt(OffsetDateTime.now());
        type.setUpdatedAt(OffsetDateTime.now());

        CertificateType saved = certificateTypeRepository.save(type);
        log.info("🏅 [CERT TYPE CREATED] Tạo mới dạng chứng chỉ: '{}' - Mã: {}", saved.getTitle(), saved.getTypeCode());
        return new CertificateDto.CertificateTypeResponse(saved, 0L);
    }

    @Transactional
    public CertificateDto.CertificateTypeResponse updateCertificateType(UUID id, CertificateDto.UpdateCertificateTypeRequest req) {
        CertificateType type = certificateTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dạng chứng chỉ với ID: " + id));

        if (req.title != null && !req.title.trim().isEmpty()) {
            type.setTitle(req.title.trim());
        }
        if (req.cefrLevel != null && !req.cefrLevel.trim().isEmpty()) {
            type.setCefrLevel(req.cefrLevel.trim().toUpperCase());
        }
        if (req.requiredWords != null && req.requiredWords > 0) {
            type.setRequiredWords(req.requiredWords);
        }
        if (req.requiredStreak != null && req.requiredStreak >= 0) {
            type.setRequiredStreak(req.requiredStreak);
        }
        if (req.description != null) {
            type.setDescription(req.description.trim());
        }
        if (req.approvedBy != null && !req.approvedBy.trim().isEmpty()) {
            type.setApprovedBy(req.approvedBy.trim());
        }
        if (req.badgeColor != null && !req.badgeColor.trim().isEmpty()) {
            type.setBadgeColor(req.badgeColor.trim());
        }
        if (req.isActive != null) {
            type.setIsActive(req.isActive);
        }
        type.setUpdatedAt(OffsetDateTime.now());

        CertificateType saved = certificateTypeRepository.save(type);
        long issuedCount = certificateRepository.countByCefrLevel(saved.getCefrLevel());
        log.info("✏️ [CERT TYPE UPDATED] Cập nhật dạng chứng chỉ: '{}' - Mã: {}", saved.getTitle(), saved.getTypeCode());
        return new CertificateDto.CertificateTypeResponse(saved, issuedCount);
    }

    @Transactional
    public void deleteCertificateType(UUID id) {
        CertificateType type = certificateTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dạng chứng chỉ với ID: " + id));

        certificateTypeRepository.delete(type);
        log.info("🗑️ [CERT TYPE DELETED] Đã xóa dạng chứng chỉ: '{}' (ID: {})", type.getTitle(), id);
    }
}

