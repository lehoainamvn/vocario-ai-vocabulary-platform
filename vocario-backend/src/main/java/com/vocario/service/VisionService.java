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

        // Vệ sinh tên file chống tấn công Path Traversal
        String rawFilename = file.getOriginalFilename();
        String safeName = (rawFilename != null ? rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_") : "photo.jpg");
        String filename = UUID.randomUUID() + "_" + safeName;
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath);
        log.info("💾 Đã lưu file ảnh vào đĩa: {}", filePath.toAbsolutePath());

        // Nén ảnh thông minh trước khi chuyển thành Base64 Data URL để lưu vào Supabase PostgreSQL
        // Giảm kích thước ảnh từ 5-10MB xuống ~100-200KB, tiết kiệm 95% dung lượng CSDL và chống tràn ổ đĩa
        byte[] originalBytes = Files.readAllBytes(filePath);
        byte[] optimizedBytes = compressImageForDatabase(originalBytes, 1280, 0.75f);
        String base64ImageUrl = "data:image/jpeg;base64," + java.util.Base64.getEncoder().encodeToString(optimizedBytes);

        Capture capture = new Capture(user, base64ImageUrl, sceneTheme, detectedObjectsJson);
        Capture saved = captureRepository.save(capture);

        log.info("✅ [VISION SERVICE] Lưu phiên chụp ảnh THÀNH CÔNG! Capture ID: {}", saved.getId());
        log.info("================================================================================");
        return saved;
    }

    /**
     * Thu nhỏ và nén chất lượng ảnh JPEG để lưu trữ an toàn trong Supabase CSDL,
     * ngăn ngừa cạn kiệt dung lượng ổ đĩa (Storage Exhaustion / Denial of Database).
     */
    private byte[] compressImageForDatabase(byte[] originalBytes, int maxDimension, float quality) {
        try {
            java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(originalBytes);
            java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(bais);
            if (img == null) {
                return originalBytes;
            }

            int width = img.getWidth();
            int height = img.getHeight();

            if (width > maxDimension || height > maxDimension) {
                double scale = (double) maxDimension / Math.max(width, height);
                int newWidth = (int) (width * scale);
                int newHeight = (int) (height * scale);

                java.awt.image.BufferedImage resized = new java.awt.image.BufferedImage(
                        newWidth, newHeight, java.awt.image.BufferedImage.TYPE_INT_RGB);
                java.awt.Graphics2D g2d = resized.createGraphics();
                g2d.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, 
                        java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g2d.drawImage(img, 0, 0, newWidth, newHeight, null);
                g2d.dispose();
                img = resized;
            }

            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            var writers = javax.imageio.ImageIO.getImageWritersByFormatName("jpg");
            if (writers.hasNext()) {
                var writer = writers.next();
                var param = writer.getDefaultWriteParam();
                if (param.canWriteCompressed()) {
                    param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
                    param.setCompressionQuality(quality);
                }
                var ios = javax.imageio.ImageIO.createImageOutputStream(baos);
                writer.setOutput(ios);
                writer.write(null, new javax.imageio.IIOImage(img, null, null), param);
                writer.dispose();
                ios.close();
            } else {
                javax.imageio.ImageIO.write(img, "jpg", baos);
            }

            byte[] result = baos.toByteArray();
            log.info("🖼️ [IMAGE COMPRESSION] Thu nhỏ ảnh bối cảnh: {} KB -> {} KB (Tiết kiệm {}% CSDL)!",
                    originalBytes.length / 1024,
                    result.length / 1024,
                    Math.round((1.0 - (double) result.length / originalBytes.length) * 100));
            return result;
        } catch (Exception e) {
            log.warn("⚠️ Nén ảnh thất bại ({}), giữ nguyên ảnh gốc", e.getMessage());
            return originalBytes;
        }
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

