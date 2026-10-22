package com.vocario.service;

import com.vocario.entity.*;
import com.vocario.repository.CaptureRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
public class VisionService {

    private static final Logger log = LoggerFactory.getLogger(VisionService.class);

    private final CaptureRepository captureRepository;
    private final WordService wordService;
    private final SrsService srsService;
    private final com.vocario.repository.UserWordProgressRepository progressRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Value("${vocario.ai.upload-dir:uploads}")
    private String uploadDir;

    public VisionService(
            CaptureRepository captureRepository,
            WordService wordService,
            SrsService srsService,
            com.vocario.repository.UserWordProgressRepository progressRepository,
            com.fasterxml.jackson.databind.ObjectMapper objectMapper
    ) {
        this.captureRepository = captureRepository;
        this.wordService = wordService;
        this.srsService = srsService;
        this.progressRepository = progressRepository;
        this.objectMapper = objectMapper;
    }

    public List<Capture> getUserCaptures(UUID userId) {
        log.info("📸 [VISION SERVICE] Lấy lịch sử các phiên chụp ảnh cho User ID: {}", userId);
        List<Capture> captures = captureRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Capture> realCaptures = captures.stream()
                .filter(c -> c.getImageUrl() != null && !c.getImageUrl().contains("kitchen_") && !c.getImageUrl().contains("living_room") && !c.getImageUrl().contains("Ban-hoc-sinh"))
                .toList();
        log.info("   -> Tìm thấy {} bức ảnh thực tế trong lịch sử của người dùng.", realCaptures.size());
        return realCaptures;
    }

    @Transactional
    public void deleteCapture(UUID id) {
        log.info("🗑️ [VISION SERVICE] Xóa ảnh bối cảnh ID: {}", id);
        srsService.deleteProgressByCaptureId(id);
        captureRepository.deleteById(id);
    }

    @Transactional
    public Capture saveCaptureSession(User user, MultipartFile file, String sceneTheme, String detectedObjectsJson) throws IOException {
        log.info("================================================================================");
        log.info("📤 [VISION SERVICE] Nhận yêu cầu lưu ảnh chụp và nhãn vật thể YOLO-World:");
        log.info("   - User ID       : {}", user.getId());
        log.info("   - File ảnh      : '{}' (kích thước: {} bytes)", file.getOriginalFilename(), file.getSize());
        log.info("   - Chủ đề phòng  : '{}'", sceneTheme);
        log.info("   - Dữ liệu Box   : {}", detectedObjectsJson);

        // Tạo thư mục uploads nếu chưa có
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            log.info("📁 Đã tự động tạo thư mục lưu trữ ảnh: {}", uploadPath.toAbsolutePath());
        }

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath);
        log.info("💾 Đã lưu file ảnh vào đĩa: {}", filePath.toAbsolutePath());

        // Chuyển ảnh thành chuỗi Base64 Data URL để lưu vĩnh viễn vào Supabase PostgreSQL
        // Giúp ảnh không bao giờ bị xóa mất khi máy chủ Render khởi động lại (Ephemeral disk)!
        byte[] fileBytes = Files.readAllBytes(filePath);
        String mimeType = file.getContentType() != null && !file.getContentType().isBlank() ? file.getContentType() : "image/jpeg";
        String base64ImageUrl = "data:" + mimeType + ";base64," + java.util.Base64.getEncoder().encodeToString(fileBytes);

        Capture capture = new Capture(user, base64ImageUrl, sceneTheme, detectedObjectsJson);
        Capture saved = captureRepository.save(capture);

        log.info("✅ [VISION SERVICE] Lưu phiên chụp ảnh THÀNH CÔNG! Capture ID: {}", saved.getId());
        log.info("================================================================================");
        return saved;
    }

    @Transactional
    public UserWordProgress learnDetectedWord(User user, UUID captureId, String englishWord, String vietnameseMeaning, String ipa, String cefrLevel) {
        log.info("🧠 [VISION SERVICE] Người dùng ID={} chọn học từ '{}' (CEFR: {}) từ bức ảnh ID={}", 
                user.getId(), englishWord, cefrLevel, captureId);

        Capture capture = captureRepository.findById(captureId).orElse(null);
        if (capture == null) {
            log.warn("⚠️ Không tìm thấy bức ảnh Capture với ID={}, vẫn tiếp tục thêm từ vào học...", captureId);
        }

        Word word = wordService.getOrCreateWord(englishWord, vietnameseMeaning, ipa, cefrLevel);
        UserWordProgress progress = srsService.addWordToLearning(user, word, capture);

        log.info("✅ [VISION SERVICE] Đã thêm từ '{}' vào lộ trình học thành công! Progress ID: {}", 
                englishWord, progress.getId());
        return progress;
    }

    @Transactional
    public UserWordProgress learnDetectedWord(User user, UUID captureId, String englishWord, String vietnameseMeaning, String ipa) {
        return learnDetectedWord(user, captureId, englishWord, vietnameseMeaning, ipa, "A2");
    }

    @Transactional
    public List<UserWordProgress> learnAllDetectedWords(User user, UUID captureId) {
        log.info("🧠 [VISION SERVICE] Lưu toàn bộ từ vựng bối cảnh ID={} cho User ID={}", captureId, user.getId());
        Capture capture = captureRepository.findById(captureId).orElse(null);
        if (capture == null) {
            log.warn("⚠️ Không tìm thấy bức ảnh Capture với ID={}", captureId);
            return List.of();
        }

        List<UserWordProgress> result = new java.util.ArrayList<>();
        try {
            com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(capture.getDetectedObjects());
            if (rootNode != null && rootNode.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode node : rootNode) {
                    String englishWord = node.has("word") ? node.get("word").asText() : "";
                    if (englishWord.isBlank()) continue;
                    String vietnamese = node.has("vietnamese") ? node.get("vietnamese").asText() :
                            (node.has("meaning") ? node.get("meaning").asText() : "Đồ vật đời sống");
                    String ipa = node.has("ipa") ? node.get("ipa").asText() : "";
                    String level = node.has("level") ? node.get("level").asText() : "A2";

                    UserWordProgress p = learnDetectedWord(user, captureId, englishWord, vietnamese, ipa, level);
                    result.add(p);
                }
            }
        } catch (Exception e) {
            log.error("❌ Lỗi parse detectedObjects JSON khi lưu toàn bộ bối cảnh: {}", e.getMessage(), e);
        }
        log.info("✅ [VISION SERVICE] Đã lưu thành công {} từ vựng từ bối cảnh '{}' vào sổ học cá nhân!",
                result.size(), capture.getSceneTheme());
        return result;
    }
}

