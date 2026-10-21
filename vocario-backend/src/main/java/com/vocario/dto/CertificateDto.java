package com.vocario.dto;

import com.vocario.entity.Certificate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class CertificateDto {

    public static class CertificateResponse {
        public UUID id;
        public UUID userId;
        public String username;
        public String userFullName;
        public String userEmail;
        public String cefrLevel;
        public String certificateCode;
        public String title;
        public OffsetDateTime issueDate;
        public Integer masteredWordsCount;
        public Integer streakCount;
        public String status;
        public String approvedBy;

        public CertificateResponse() {}

        public CertificateResponse(Certificate c) {
            this.id = c.getId();
            if (c.getUser() != null) {
                this.userId = c.getUser().getId();
                this.username = c.getUser().getUsername();
                this.userFullName = (c.getUser().getFullName() != null && !c.getUser().getFullName().isBlank())
                        ? c.getUser().getFullName() : c.getUser().getUsername();
                this.userEmail = c.getUser().getEmail();
            }
            this.cefrLevel = c.getCefrLevel();
            this.certificateCode = c.getCertificateCode();
            this.title = c.getTitle();
            this.issueDate = c.getIssueDate();
            this.masteredWordsCount = c.getMasteredWordsCount() != null ? c.getMasteredWordsCount() : 0;
            this.streakCount = c.getStreakCount() != null ? c.getStreakCount() : 0;
            this.status = c.getStatus();
            this.approvedBy = c.getApprovedBy();
        }
    }

    public static class ClaimCertificateRequest {
        public String cefrLevel;
    }

    public static class ApproveCertificateRequest {
        public String adminName;
    }

    public static class UpdateCertificateRequest {
        public String title;
        public String cefrLevel;
        public String approvedBy;
        public String status; // ISSUED, PENDING, REVOKED
        public Integer masteredWordsCount;
        public Integer streakCount;
    }

    public static class ManualIssueCertificateRequest {
        public UUID userId;
        public String cefrLevel;
        public String title;
        public String approvedBy;
        public Integer masteredWordsCount;
    }

    public static class CertificateTypeResponse {
        public UUID id;
        public String typeCode;
        public String title;
        public String cefrLevel;
        public Integer requiredWords;
        public Integer requiredStreak;
        public String description;
        public String approvedBy;
        public String badgeColor;
        public Boolean isActive;
        public Long totalIssued;
        public OffsetDateTime createdAt;

        public CertificateTypeResponse() {}

        public CertificateTypeResponse(com.vocario.entity.CertificateType t, Long totalIssued) {
            this.id = t.getId();
            this.typeCode = t.getTypeCode();
            this.title = t.getTitle();
            this.cefrLevel = t.getCefrLevel();
            this.requiredWords = t.getRequiredWords() != null ? t.getRequiredWords() : 10;
            this.requiredStreak = t.getRequiredStreak() != null ? t.getRequiredStreak() : 0;
            this.description = t.getDescription();
            this.approvedBy = t.getApprovedBy();
            this.badgeColor = t.getBadgeColor() != null ? t.getBadgeColor() : "#7D6853";
            this.isActive = t.getIsActive() != null ? t.getIsActive() : true;
            this.totalIssued = totalIssued != null ? totalIssued : 0L;
            this.createdAt = t.getCreatedAt();
        }
    }

    public static class CreateCertificateTypeRequest {
        public String typeCode;
        public String title;
        public String cefrLevel;
        public Integer requiredWords;
        public Integer requiredStreak;
        public String description;
        public String approvedBy;
        public String badgeColor;
        public Boolean isActive;
    }

    public static class UpdateCertificateTypeRequest {
        public String title;
        public String cefrLevel;
        public Integer requiredWords;
        public Integer requiredStreak;
        public String description;
        public String approvedBy;
        public String badgeColor;
        public Boolean isActive;
    }
}

