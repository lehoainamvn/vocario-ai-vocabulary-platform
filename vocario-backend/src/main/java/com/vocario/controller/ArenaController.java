package com.vocario.controller;

import com.vocario.dto.ArenaDto;
import com.vocario.entity.ArenaStageRecord;
import com.vocario.entity.User;
import com.vocario.repository.ArenaStageRecordRepository;
import com.vocario.repository.UserRepository;
import com.vocario.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/arena")
@Tag(name = "7. Đấu Trường & Speedrun Leaderboard", description = "API quản lý bảng xếp hạng kỷ lục tốc độ phản xạ từng bối cảnh")
public class ArenaController {

    private final ArenaStageRecordRepository recordRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public ArenaController(ArenaStageRecordRepository recordRepository,
                           UserRepository userRepository,
                           AuthService authService) {
        this.recordRepository = recordRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @GetMapping("/stages/{stageId}/leaderboard")
    @Operation(summary = "Lấy Bảng Xếp Hạng tốc độ của riêng một không gian đấu trường",
               description = "Truy vấn danh sách kỷ lục gia có thời gian hoàn thành nhanh nhất (Time ASC) kèm độ chính xác.")
    public ResponseEntity<List<ArenaDto.RecordResponse>> getStageLeaderboard(
            @PathVariable String stageId,
            @RequestParam(defaultValue = "all") String period,
            @RequestParam(required = false) UUID currentUserId) {

        List<ArenaStageRecord> records;
        if ("weekly".equalsIgnoreCase(period)) {
            OffsetDateTime weekAgo = OffsetDateTime.now().minusDays(7);
            records = recordRepository.findTop10ByStageIdAndAchievedAtAfterOrderByCompletionTimeMsAscAccuracyPctDesc(stageId, weekAgo);
        } else {
            records = recordRepository.findTop10ByStageIdOrderByCompletionTimeMsAscAccuracyPctDesc(stageId);
        }

        List<ArenaDto.RecordResponse> response = new ArrayList<>();
        int rank = 1;
        for (ArenaStageRecord r : records) {
            ArenaDto.RecordResponse item = new ArenaDto.RecordResponse();
            item.id = r.getId();
            item.stageId = r.getStageId();
            item.userId = r.getUser().getId();
            item.userName = r.getUser().getFullName() != null ? r.getUser().getFullName() : r.getUser().getUsername();
            item.userAvatar = r.getUser().getAvatarUrl();
            item.targetLevel = r.getUser().getTargetLevel();
            item.completionTimeMs = r.getCompletionTimeMs();
            item.pureTimeMs = r.getPureTimeMs();
            item.mistakeCount = r.getMistakeCount();
            item.penaltyMs = r.getPenaltyMs();
            item.accuracyPct = r.getAccuracyPct();
            item.maxCombo = r.getMaxCombo();
            item.totalXpEarned = r.getTotalXpEarned();
            item.isPerfectRun = r.getIsPerfectRun();
            item.achievedAt = r.getAchievedAt();
            item.rank = rank++;
            item.isCurrentUser = currentUserId != null && currentUserId.equals(r.getUser().getId());
            response.add(item);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/submit-run")
    @Operation(summary = "Lưu kết quả lượt thi đấu Speedrun vào CSDL",
               description = "Ghi nhận thời gian hoàn thành (mili-giây), lỗi sai và điểm XP vào bảng xếp hạng bối cảnh.")
    public ResponseEntity<Map<String, Object>> submitStageRun(@RequestBody ArenaDto.SubmitRunRequest req) {
        User user = null;
        if (req.userId != null) {
            user = userRepository.findById(req.userId).orElse(null);
        }
        if (user == null) {
            user = authService.getOrCreateDemoUser();
        }

        ArenaStageRecord record = new ArenaStageRecord(
                req.stageId,
                user,
                req.completionTimeMs != null ? req.completionTimeMs : 10000,
                req.pureTimeMs != null ? req.pureTimeMs : 10000,
                req.mistakeCount != null ? req.mistakeCount : 0,
                req.penaltyMs != null ? req.penaltyMs : 0,
                req.accuracyPct != null ? req.accuracyPct : 100.0,
                req.maxCombo != null ? req.maxCombo : 1,
                req.totalXpEarned != null ? req.totalXpEarned : 25,
                req.isPerfectRun != null ? req.isPerfectRun : false
        );

        ArenaStageRecord saved = recordRepository.save(record);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("recordId", saved.getId());
        result.put("completionTimeMs", saved.getCompletionTimeMs());
        return ResponseEntity.ok(result);
    }
}
