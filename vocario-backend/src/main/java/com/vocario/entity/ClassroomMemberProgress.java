package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "classroom_member_progress",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_cmp_classroom_user", columnNames = {"classroom_id", "user_id"})
    },
    indexes = {
        @Index(name = "idx_cmp_classroom_user", columnList = "classroom_id, user_id"),
        @Index(name = "idx_cmp_last_studied", columnList = "classroom_id, last_studied_at")
    }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ClassroomMemberProgress {

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
    private Integer masteredCount = 0;

    @Column(nullable = false)
    private Integer totalWords = 0;

    @Column(nullable = false)
    private Boolean completed = false;

    @Column(name = "unmastered_words_json", columnDefinition = "TEXT")
    private String unmasteredWordsJson;

    @Column(name = "last_studied_at", nullable = false)
    private OffsetDateTime lastStudiedAt = OffsetDateTime.now();

    public ClassroomMemberProgress() {}

    public ClassroomMemberProgress(Classroom classroom, User user, Integer masteredCount, Integer totalWords, Boolean completed, String unmasteredWordsJson) {
        this.classroom = classroom;
        this.user = user;
        this.masteredCount = masteredCount;
        this.totalWords = totalWords;
        this.completed = completed;
        this.unmasteredWordsJson = unmasteredWordsJson;
        this.lastStudiedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Classroom getClassroom() { return classroom; }
    public void setClassroom(Classroom classroom) { this.classroom = classroom; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Integer getMasteredCount() { return masteredCount != null ? masteredCount : 0; }
    public void setMasteredCount(Integer masteredCount) { this.masteredCount = masteredCount; }

    public Integer getTotalWords() { return totalWords != null ? totalWords : 0; }
    public void setTotalWords(Integer totalWords) { this.totalWords = totalWords; }

    public Boolean getCompleted() { return completed != null && completed; }
    public void setCompleted(Boolean completed) { this.completed = completed; }

    public String getUnmasteredWordsJson() { return unmasteredWordsJson; }
    public void setUnmasteredWordsJson(String unmasteredWordsJson) { this.unmasteredWordsJson = unmasteredWordsJson; }

    public OffsetDateTime getLastStudiedAt() { return lastStudiedAt; }
    public void setLastStudiedAt(OffsetDateTime lastStudiedAt) { this.lastStudiedAt = lastStudiedAt; }
}
