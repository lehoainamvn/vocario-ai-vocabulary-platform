package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "certificate_types")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CertificateType {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "type_code", length = 50, unique = true, nullable = false)
    private String typeCode; // VD: A1, A2, B1, B2, C1, C2, IELTS-6.5, TOEIC-750, BUS-ENG

    @Column(nullable = false)
    private String title; // VD: Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR A1

    @Column(name = "cefr_level", length = 20, nullable = false)
    private String cefrLevel; // A1, A2, B1, B2, C1, C2, KHAC

    @Column(name = "required_words", nullable = false)
    private Integer requiredWords = 10;

    @Column(name = "required_streak", nullable = false)
    private Integer requiredStreak = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "approved_by", nullable = false)
    private String approvedBy = "Hội Đồng Khảo Thí & Đào Tạo Vocario";

    @Column(name = "badge_color", length = 30)
    private String badgeColor = "#7D6853"; // Hex code hoặc tên màu hiển thị

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public CertificateType() {}

    public CertificateType(String typeCode, String title, String cefrLevel, Integer requiredWords,
                           Integer requiredStreak, String description, String approvedBy,
                           String badgeColor, Boolean isActive) {
        this.typeCode = typeCode;
        this.title = title;
        this.cefrLevel = cefrLevel;
        this.requiredWords = requiredWords;
        this.requiredStreak = requiredStreak;
        this.description = description;
        this.approvedBy = approvedBy;
        this.badgeColor = badgeColor;
        this.isActive = isActive != null ? isActive : true;
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTypeCode() { return typeCode; }
    public void setTypeCode(String typeCode) { this.typeCode = typeCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCefrLevel() { return cefrLevel; }
    public void setCefrLevel(String cefrLevel) { this.cefrLevel = cefrLevel; }

    public Integer getRequiredWords() { return requiredWords; }
    public void setRequiredWords(Integer requiredWords) { this.requiredWords = requiredWords; }

    public Integer getRequiredStreak() { return requiredStreak; }
    public void setRequiredStreak(Integer requiredStreak) { this.requiredStreak = requiredStreak; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getBadgeColor() { return badgeColor; }
    public void setBadgeColor(String badgeColor) { this.badgeColor = badgeColor; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
