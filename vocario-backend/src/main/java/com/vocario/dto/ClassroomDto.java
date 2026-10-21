package com.vocario.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class ClassroomDto {

    public static class WordItemDto {
        public String word;
        public String ipa;
        public String vietnamese;
        public String partOfSpeech;
        public String exampleEn;
        public String exampleVi;
    }

    public static class CreateClassroomRequest {
        public String name;
        public String description;
        public String targetLevel = "A2";
        public String icon = "users";
        public List<WordItemDto> words;
    }

    public static class ClassroomWordDto {
        public UUID id;
        public String word;
        public String ipa;
        public String vietnamese;
        public String partOfSpeech;
        public String exampleEn;
        public String exampleVi;
    }

    public static class ClassroomDetailResponse {
        public UUID id;
        public String code;
        public String name;
        public String description;
        public String ownerName;
        public String ownerAvatar;
        public UUID ownerId;
        public Boolean isOwner = false;
        public Boolean isMember = false;
        public Boolean clonedToNotebook = false;
        public String targetLevel;
        public Long memberCount;
        public Integer wordsCount;
        public OffsetDateTime createdAt;
        public List<ClassroomWordDto> words;
    }

    public static class ClassroomSummaryDto {
        public UUID id;
        public String code;
        public String name;
        public String description;
        public String ownerName;
        public String targetLevel;
        public Integer wordsCount;
        public Long memberCount;
        public Boolean isOwner = false;
        public OffsetDateTime createdAt;
    }

    public static class QuizAttemptRequest {
        public Integer score;
        public Integer totalQuestions;
        public Integer timeSpentSeconds;
    }

    public static class LeaderboardItemDto {
        public Integer rank;
        public UUID userId;
        public String username;
        public String fullName;
        public String avatarUrl;
        public Integer score;
        public Integer totalQuestions;
        public Integer timeSpentSeconds;
        public OffsetDateTime submittedAt;
    }

    public static class SaveWordsToNotebookRequest {
        public String category;
        public String targetLevel = "B1";
        public List<WordItemDto> words;
    }

    public static class AddWordsRequest {
        public List<WordItemDto> words;
    }

    public static class SaveFlashcardProgressRequest {
        public Integer masteredCount;
        public Integer totalWords;
        public List<String> masteredWords;
        public List<String> unmasteredWords;
    }

    public static class MemberProgressDto {
        public UUID userId;
        public String username;
        public String fullName;
        public String avatarUrl;
        public Integer masteredCount;
        public Integer totalWords;
        public Integer progressPercentage;
        public Boolean completed;
        public List<String> unmasteredWords;
        public OffsetDateTime lastStudiedAt;
    }

    public static class HardestWordDto {
        public String word;
        public Integer unmasteredCount;

        public HardestWordDto() {}
        public HardestWordDto(String word, Integer unmasteredCount) {
            this.word = word;
            this.unmasteredCount = unmasteredCount;
        }
    }

    public static class ClassroomProgressDashboardResponse {
        public String classroomCode;
        public String classroomName;
        public Integer totalWords;
        public Long totalMembers;
        public Long studiedMembersCount;
        public Long completedMembersCount;
        public Integer averageCompletionRate;
        public List<MemberProgressDto> memberProgresses;
        public List<HardestWordDto> hardestWords;
    }
}
