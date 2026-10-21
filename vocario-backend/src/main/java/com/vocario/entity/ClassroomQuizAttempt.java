package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "classroom_quiz_attempts",
    indexes = {
        @Index(name = "idx_cqa_classroom_score", columnList = "classroom_id, score, time_spent_seconds")
    }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ClassroomQuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Integer totalQuestions;

    @Column(name = "time_spent_seconds", nullable = false)
    private Integer timeSpentSeconds;

    private OffsetDateTime submittedAt = OffsetDateTime.now();

    public ClassroomQuizAttempt() {}

    public ClassroomQuizAttempt(Classroom classroom, User user, Integer score, Integer totalQuestions, Integer timeSpentSeconds) {
        this.classroom = classroom;
        this.user = user;
        this.score = score;
        this.totalQuestions = totalQuestions;
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Classroom getClassroom() { return classroom; }
    public void setClassroom(Classroom classroom) { this.classroom = classroom; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }

    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }

    public Integer getTimeSpentSeconds() { return timeSpentSeconds; }
    public void setTimeSpentSeconds(Integer timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }

    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(OffsetDateTime submittedAt) { this.submittedAt = submittedAt; }
}
