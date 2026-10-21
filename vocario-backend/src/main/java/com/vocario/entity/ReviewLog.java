package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "review_logs")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ReviewLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "progress_id", nullable = false)
    private UserWordProgress progress;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer ratingGrade; // 0 đến 5 theo chuẩn SM-2

    @Column(length = 50)
    private String reviewType = "FLASHCARD"; // FLASHCARD, QUIZ, PRONUNCIATION

    private Double speechScore;

    private Integer responseTimeMs;

    private OffsetDateTime reviewedAt = OffsetDateTime.now();

    public ReviewLog() {}

    public ReviewLog(UserWordProgress progress, User user, Integer ratingGrade, String reviewType) {
        this.progress = progress;
        this.user = user;
        this.ratingGrade = ratingGrade;
        this.reviewType = reviewType;
        this.reviewedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UserWordProgress getProgress() { return progress; }
    public void setProgress(UserWordProgress progress) { this.progress = progress; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Integer getRatingGrade() { return ratingGrade; }
    public void setRatingGrade(Integer ratingGrade) { this.ratingGrade = ratingGrade; }

    public String getReviewType() { return reviewType; }
    public void setReviewType(String reviewType) { this.reviewType = reviewType; }

    public Double getSpeechScore() { return speechScore; }
    public void setSpeechScore(Double speechScore) { this.speechScore = speechScore; }

    public Integer getResponseTimeMs() { return responseTimeMs; }
    public void setResponseTimeMs(Integer responseTimeMs) { this.responseTimeMs = responseTimeMs; }

    public OffsetDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(OffsetDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
