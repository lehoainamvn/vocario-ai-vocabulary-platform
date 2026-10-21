package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "certificates")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "cefr_level", length = 10, nullable = false)
    private String cefrLevel;

    @Column(name = "certificate_code", length = 50, unique = true, nullable = false)
    private String certificateCode;

    @Column(nullable = false)
    private String title;

    @Column(name = "issue_date", nullable = false)
    private OffsetDateTime issueDate = OffsetDateTime.now();

    @Column(name = "mastered_words_count")
    private Integer masteredWordsCount = 0;

    @Column(name = "streak_count")
    private Integer streakCount = 0;

    @Column(length = 20, nullable = false)
    private String status = "ISSUED"; // ISSUED, PENDING, REVOKED

    @Column(name = "approved_by")
    private String approvedBy = "Hội Đồng Khảo Thí Vocario";

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public Certificate() {}

    public Certificate(User user, String cefrLevel, String certificateCode, String title,
                       Integer masteredWordsCount, Integer streakCount, String status, String approvedBy) {
        this.user = user;
        this.cefrLevel = cefrLevel;
        this.certificateCode = certificateCode;
        this.title = title;
        this.masteredWordsCount = masteredWordsCount;
        this.streakCount = streakCount;
        this.status = status;
        this.approvedBy = approvedBy;
        this.issueDate = OffsetDateTime.now();
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getCefrLevel() { return cefrLevel; }
    public void setCefrLevel(String cefrLevel) { this.cefrLevel = cefrLevel; }

    public String getCertificateCode() { return certificateCode; }
    public void setCertificateCode(String certificateCode) { this.certificateCode = certificateCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public OffsetDateTime getIssueDate() { return issueDate; }
    public void setIssueDate(OffsetDateTime issueDate) { this.issueDate = issueDate; }

    public Integer getMasteredWordsCount() { return masteredWordsCount; }
    public void setMasteredWordsCount(Integer masteredWordsCount) { this.masteredWordsCount = masteredWordsCount; }

    public Integer getStreakCount() { return streakCount; }
    public void setStreakCount(Integer streakCount) { this.streakCount = streakCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
