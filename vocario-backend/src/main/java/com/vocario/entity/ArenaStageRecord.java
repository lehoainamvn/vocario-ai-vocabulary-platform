package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "arena_stage_records",
    indexes = {
        @Index(name = "idx_asr_stage_time", columnList = "stage_id, completion_time_ms, accuracy_pct"),
        @Index(name = "idx_asr_stage_user", columnList = "stage_id, user_id, completion_time_ms")
    }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ArenaStageRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "stage_id", nullable = false, length = 100)
    private String stageId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "completion_time_ms", nullable = false)
    private Integer completionTimeMs;

    @Column(name = "pure_time_ms", nullable = false)
    private Integer pureTimeMs;

    @Column(name = "mistake_count", nullable = false)
    private Integer mistakeCount = 0;

    @Column(name = "penalty_ms", nullable = false)
    private Integer penaltyMs = 0;

    @Column(name = "accuracy_pct", nullable = false)
    private Double accuracyPct;

    @Column(name = "max_combo", nullable = false)
    private Integer maxCombo = 1;

    @Column(name = "total_xp_earned", nullable = false)
    private Integer totalXpEarned = 0;

    @Column(name = "is_perfect_run")
    private Boolean isPerfectRun = false;

    @Column(name = "achieved_at")
    private OffsetDateTime achievedAt = OffsetDateTime.now();

    public ArenaStageRecord() {}

    public ArenaStageRecord(String stageId, User user, Integer completionTimeMs, Integer pureTimeMs,
                            Integer mistakeCount, Integer penaltyMs, Double accuracyPct,
                            Integer maxCombo, Integer totalXpEarned, Boolean isPerfectRun) {
        this.stageId = stageId;
        this.user = user;
        this.completionTimeMs = completionTimeMs;
        this.pureTimeMs = pureTimeMs;
        this.mistakeCount = mistakeCount;
        this.penaltyMs = penaltyMs;
        this.accuracyPct = accuracyPct;
        this.maxCombo = maxCombo;
        this.totalXpEarned = totalXpEarned;
        this.isPerfectRun = isPerfectRun;
        this.achievedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getStageId() { return stageId; }
    public void setStageId(String stageId) { this.stageId = stageId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Integer getCompletionTimeMs() { return completionTimeMs; }
    public void setCompletionTimeMs(Integer completionTimeMs) { this.completionTimeMs = completionTimeMs; }

    public Integer getPureTimeMs() { return pureTimeMs; }
    public void setPureTimeMs(Integer pureTimeMs) { this.pureTimeMs = pureTimeMs; }

    public Integer getMistakeCount() { return mistakeCount; }
    public void setMistakeCount(Integer mistakeCount) { this.mistakeCount = mistakeCount; }

    public Integer getPenaltyMs() { return penaltyMs; }
    public void setPenaltyMs(Integer penaltyMs) { this.penaltyMs = penaltyMs; }

    public Double getAccuracyPct() { return accuracyPct; }
    public void setAccuracyPct(Double accuracyPct) { this.accuracyPct = accuracyPct; }

    public Integer getMaxCombo() { return maxCombo; }
    public void setMaxCombo(Integer maxCombo) { this.maxCombo = maxCombo; }

    public Integer getTotalXpEarned() { return totalXpEarned; }
    public void setTotalXpEarned(Integer totalXpEarned) { this.totalXpEarned = totalXpEarned; }

    public Boolean getIsPerfectRun() { return isPerfectRun; }
    public void setIsPerfectRun(Boolean perfectRun) { isPerfectRun = perfectRun; }

    public OffsetDateTime getAchievedAt() { return achievedAt; }
    public void setAchievedAt(OffsetDateTime achievedAt) { this.achievedAt = achievedAt; }
}
