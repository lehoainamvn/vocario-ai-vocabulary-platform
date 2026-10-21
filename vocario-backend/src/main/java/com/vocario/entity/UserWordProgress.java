package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "user_word_progress",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "word_id"}),
    indexes = @Index(name = "idx_user_next_review", columnList = "user_id, next_review_date")
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserWordProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "capture_id")
    private Capture capture;

    @Column(length = 50)
    private String status = "NEW"; // NEW, LEARNING, REVIEWING, MASTERED

    // Tham số thuật toán SM-2:
    @Column(nullable = false)
    private Integer repetitionNumber = 0; // n: Số lần lặp lại đúng liên tiếp

    @Column(nullable = false)
    private Double easinessFactor = 2.5;  // EF: Hệ số dễ nhớ (mặc định 2.5, tối thiểu 1.3)

    @Column(nullable = false)
    private Integer intervalDays = 0;     // I(n): Khoảng cách ôn tập tính theo ngày

    @Column(name = "next_review_date", nullable = false)
    private OffsetDateTime nextReviewDate = OffsetDateTime.now();

    private OffsetDateTime lastReviewedAt;

    private OffsetDateTime createdAt = OffsetDateTime.now();
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public UserWordProgress() {}

    public UserWordProgress(User user, Word word, Capture capture) {
        this.user = user;
        this.word = word;
        this.capture = capture;
        this.status = "NEW";
        this.repetitionNumber = 0;
        this.easinessFactor = 2.5;
        this.intervalDays = 0;
        this.nextReviewDate = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Word getWord() { return word; }
    public void setWord(Word word) { this.word = word; }

    public Capture getCapture() { return capture; }
    public void setCapture(Capture capture) { this.capture = capture; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getRepetitionNumber() { return repetitionNumber; }
    public void setRepetitionNumber(Integer repetitionNumber) { this.repetitionNumber = repetitionNumber; }

    public Double getEasinessFactor() { return easinessFactor; }
    public void setEasinessFactor(Double easinessFactor) { this.easinessFactor = easinessFactor; }

    public Integer getIntervalDays() { return intervalDays; }
    public void setIntervalDays(Integer intervalDays) { this.intervalDays = intervalDays; }

    public OffsetDateTime getNextReviewDate() { return nextReviewDate; }
    public void setNextReviewDate(OffsetDateTime nextReviewDate) { this.nextReviewDate = nextReviewDate; }

    public OffsetDateTime getLastReviewedAt() { return lastReviewedAt; }
    public void setLastReviewedAt(OffsetDateTime lastReviewedAt) { this.lastReviewedAt = lastReviewedAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
