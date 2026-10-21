package com.vocario.controller;

import com.vocario.entity.Capture;
import com.vocario.entity.User;
import com.vocario.entity.UserWordProgress;
import com.vocario.service.AuthService;
import com.vocario.service.VisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import com.vocario.repository.UserRepository;
import java.util.UUID;

@RestController
@RequestMapping("/api/vision")
@Tag(name = "4. Vision & Object Detection", description = "API Tải ảnh Camera, lưu trữ Bounding Box YOLO-World và đưa từ vựng vào học")
public class VisionController {

    private final VisionService visionService;
    private final AuthService authService;
    private final UserRepository userRepository;

    public VisionController(VisionService visionService, AuthService authService, UserRepository userRepository) {
        this.visionService = visionService;
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @GetMapping("/captures")
    @Operation(summary = "Lấy lịch sử ảnh đã chụp của người dùng", description = "Trả về danh sách tất cả các ảnh và các vật thể đã phát hiện trong quá khứ.")
    public ResponseEntity<List<Capture>> getUserCaptures(
            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) {
        if (userId == null) {
            User demo = authService.getOrCreateDemoUser();
            userId = demo.getId();
        }
        return ResponseEntity.ok(visionService.getUserCaptures(userId));
    }

    @PostMapping(value = "/save-capture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Lưu kết quả chụp ảnh và nhận diện vật thể", 
        description = "Lưu file ảnh và danh sách Bounding Box (JSON) từ YOLO-World vào bảng captures của PostgreSQL."
    )
    public ResponseEntity<Capture> saveCapture(
            @Parameter(description = "File ảnh từ Camera hoặc tải lên")
            @RequestPart("image") MultipartFile image,
            
            @Parameter(description = "Chủ đề bối cảnh (ví dụ: Study Desk, Kitchen, Bedroom)")
            @RequestParam(defaultValue = "Study Desk") String sceneTheme,

            @Parameter(description = "Chuỗi JSON chứa các Bounding Box và nhãn từ YOLO-World", example = "[{\"word\":\"laptop\",\"confidence\":0.88,\"box\":[100,150,300,400]}]")
            @RequestParam String detectedObjectsJson,

            @Parameter(description = "ID người dùng (nếu để trống sẽ lấy tài khoản Demo)")
            @RequestParam(required = false) UUID userId
    ) throws IOException {
        User user = (userId != null) ? userRepository.findById(userId).orElseGet(authService::getOrCreateDemoUser) : authService.getOrCreateDemoUser();

        Capture saved = visionService.saveCaptureSession(user, image, sceneTheme, detectedObjectsJson);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/learn-word")
    @Operation(
        summary = "Chọn đồ vật từ ảnh để thêm vào danh sách học (Khởi tạo SM-2)",
        description = "Khi người dùng chạm vào một Bounding Box (ví dụ: 'laptop'), API này sẽ tạo thẻ từ vựng và đưa vào hàng đợi ôn tập Spaced Repetition."
    )
    public ResponseEntity<UserWordProgress> learnWordFromImage(
            @Parameter(description = "ID của bức ảnh đã chụp")
            @RequestParam UUID captureId,

            @Parameter(description = "Từ vựng tiếng Anh (nhãn phát hiện)", example = "laptop")
            @RequestParam String englishWord,

            @Parameter(description = "Nghĩa tiếng Việt", example = "Máy tính xách tay")
            @RequestParam(defaultValue = "Đồ vật đời sống") String vietnameseMeaning,

            @Parameter(description = "Phiên âm IPA", example = "/ˈlæptɒp/")
            @RequestParam(defaultValue = "") String phoneticIpa,

            @Parameter(description = "Cấp độ CEFR (A1, A2, B1...)", example = "A2")
            @RequestParam(defaultValue = "A2") String cefrLevel,

            @Parameter(description = "ID người dùng")
            @RequestParam(required = false) UUID userId
    ) {
        User user = (userId != null) ? userRepository.findById(userId).orElseGet(authService::getOrCreateDemoUser) : authService.getOrCreateDemoUser();

        UserWordProgress progress = visionService.learnDetectedWord(user, captureId, englishWord, vietnameseMeaning, phoneticIpa, cefrLevel);
        return ResponseEntity.ok(progress);
    }

    @PostMapping("/learn-all-words")
    @Operation(
        summary = "Lưu toàn bộ từ vựng trong bối cảnh vào Sổ tay SM-2",
        description = "Đồng loạt thêm tất cả các nhãn vật thể được AI phát hiện trong bức ảnh này vào sổ tay từ vựng của người học."
    )
    public ResponseEntity<List<UserWordProgress>> learnAllWordsFromCapture(
            @Parameter(description = "ID của bức ảnh đã chụp")
            @RequestParam UUID captureId,

            @Parameter(description = "ID người dùng")
            @RequestParam(required = false) UUID userId
    ) {
        User user = (userId != null) ? userRepository.findById(userId).orElseGet(authService::getOrCreateDemoUser) : authService.getOrCreateDemoUser();
        List<UserWordProgress> result = visionService.learnAllDetectedWords(user, captureId);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/captures/{id}")
    @Operation(summary = "Xóa một ảnh bối cảnh khỏi CSDL")
    public ResponseEntity<Void> deleteCapture(@PathVariable UUID id) {
        visionService.deleteCapture(id);
        return ResponseEntity.noContent().build();
    }
}

