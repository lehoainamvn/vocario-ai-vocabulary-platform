package com.vocario.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ArenaDto {

    public static class RecordResponse {
        public UUID id;
        public String stageId;
        public UUID userId;
        public String userName;
        public String userAvatar;
        public String targetLevel;
        public Integer completionTimeMs;
        public Integer pureTimeMs;
        public Integer mistakeCount;
        public Integer penaltyMs;
        public Double accuracyPct;
        public Integer maxCombo;
        public Integer totalXpEarned;
        public Boolean isPerfectRun;
        public OffsetDateTime achievedAt;
        public Integer rank;
        public Boolean isCurrentUser;
    }

    public static class SubmitRunRequest {
        public String stageId;
        public UUID userId;
        public String userName;
        public String userAvatar;
        public String targetLevel;
        public Integer completionTimeMs;
        public Integer pureTimeMs;
        public Integer mistakeCount;
        public Integer penaltyMs;
        public Double accuracyPct;
        public Integer maxCombo;
        public Integer totalXpEarned;
        public Boolean isPerfectRun;
    }
}
