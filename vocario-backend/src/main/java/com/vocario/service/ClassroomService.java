package com.vocario.service;

import com.vocario.dto.ClassroomDto;
import com.vocario.entity.*;
import com.vocario.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class ClassroomService {

    private static final Logger log = LoggerFactory.getLogger(ClassroomService.class);

    private final ClassroomRepository classroomRepository;
    private final ClassroomWordRepository classroomWordRepository;
    private final ClassroomMemberRepository classroomMemberRepository;
    private final ClassroomQuizAttemptRepository classroomQuizAttemptRepository;
    private final ClassroomMemberProgressRepository classroomMemberProgressRepository;
    private final WordRepository wordRepository;
    private final UserWordProgressRepository userWordProgressRepository;
    private final AuthService authService;

    public ClassroomService(
            ClassroomRepository classroomRepository,
            ClassroomWordRepository classroomWordRepository,
            ClassroomMemberRepository classroomMemberRepository,
            ClassroomQuizAttemptRepository classroomQuizAttemptRepository,
            ClassroomMemberProgressRepository classroomMemberProgressRepository,
            WordRepository wordRepository,
            UserWordProgressRepository userWordProgressRepository,
            AuthService authService
    ) {
        this.classroomRepository = classroomRepository;
        this.classroomWordRepository = classroomWordRepository;
        this.classroomMemberRepository = classroomMemberRepository;
        this.classroomQuizAttemptRepository = classroomQuizAttemptRepository;
        this.classroomMemberProgressRepository = classroomMemberProgressRepository;
        this.wordRepository = wordRepository;
        this.userWordProgressRepository = userWordProgressRepository;
        this.authService = authService;
    }

    private String generateUniqueCode() {
        for (int i = 0; i < 20; i++) {
            int num = ThreadLocalRandom.current().nextInt(100, 999);
            String code = "VOC-" + num;
            if (classroomRepository.findByCode(code).isEmpty()) {
                return code;
            }
        }
        return "VOC-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
    }

    @Transactional
    public ClassroomDto.ClassroomDetailResponse createClassroom(UUID userId, ClassroomDto.CreateClassroomRequest req) {
        User owner = authService.getUserProfile(userId);
        String code = generateUniqueCode();

        String name = (req.name != null && !req.name.trim().isEmpty())
                ? req.name.trim()
                : "Bộ từ vựng chia sẻ " + code;
        String desc = req.description != null ? req.description.trim() : "";
        String level = (req.targetLevel != null && !req.targetLevel.isBlank()) ? req.targetLevel.trim() : "A2";

        Classroom classroom = new Classroom(code, name, desc, owner, level);
        if (req.icon != null && !req.icon.isBlank()) {
            classroom.setIcon(req.icon.trim());
        }
        classroom = classroomRepository.save(classroom);
        log.info("🏫 [CLASSROOM CREATED] Mã phòng '{}', Tên '{}' bởi '{}'", classroom.getCode(), classroom.getName(), owner.getUsername());

        // Lưu danh sách từ vựng vào phòng học
        if (req.words != null && !req.words.isEmpty()) {
            for (ClassroomDto.WordItemDto w : req.words) {
                if (w.word == null || w.word.trim().isEmpty()) continue;
                ClassroomWord cw = new ClassroomWord(
                        classroom,
                        w.word.trim(),
                        w.ipa != null ? w.ipa.trim() : "",
                        w.vietnamese != null ? w.vietnamese.trim() : "",
                        w.partOfSpeech != null ? w.partOfSpeech.trim() : "noun",
                        w.exampleEn != null ? w.exampleEn.trim() : "",
                        w.exampleVi != null ? w.exampleVi.trim() : ""
                );
                classroomWordRepository.save(cw);
            }
            log.info("📚 [CLASSROOM WORDS] Đã thêm {} từ vào phòng '{}'", req.words.size(), classroom.getCode());
        }

        // Tự động thêm owner vào danh sách thành viên phòng
        ClassroomMember member = new ClassroomMember(classroom, owner);
        member.setClonedToNotebook(true);
        classroomMemberRepository.save(member);

        return getClassroomByCode(classroom.getCode(), owner.getId());
    }

    @Transactional(readOnly = true)
    public ClassroomDto.ClassroomDetailResponse getClassroomByCode(String code, UUID userId) {
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng học với mã: " + code));

        User user = authService.getUserProfile(userId);

        ClassroomDto.ClassroomDetailResponse res = new ClassroomDto.ClassroomDetailResponse();
        res.id = classroom.getId();
        res.code = classroom.getCode();
        res.name = classroom.getName();
        res.description = classroom.getDescription();
        res.targetLevel = classroom.getTargetLevel();
        res.createdAt = classroom.getCreatedAt();

        if (classroom.getOwner() != null) {
            res.ownerId = classroom.getOwner().getId();
            res.ownerName = classroom.getOwner().getFullName() != null ? classroom.getOwner().getFullName() : classroom.getOwner().getUsername();
            res.ownerAvatar = classroom.getOwner().getAvatarUrl();
        }

        res.isOwner = classroom.getOwner() != null && classroom.getOwner().getId().equals(user.getId());

        Optional<ClassroomMember> memberOpt = classroomMemberRepository.findByClassroomIdAndUserId(classroom.getId(), user.getId());
        res.isMember = memberOpt.isPresent();
        res.clonedToNotebook = memberOpt.map(ClassroomMember::getClonedToNotebook).orElse(false);

        res.memberCount = classroomMemberRepository.countByClassroomId(classroom.getId());

        List<ClassroomWord> words = classroomWordRepository.findByClassroomIdOrderByCreatedAtAsc(classroom.getId());
        res.wordsCount = words.size();
        res.words = words.stream().map(w -> {
            ClassroomDto.ClassroomWordDto dto = new ClassroomDto.ClassroomWordDto();
            dto.id = w.getId();
            dto.word = w.getWordText();
            dto.ipa = w.getIpa();
            dto.vietnamese = w.getVietnamese();
            dto.partOfSpeech = w.getPartOfSpeech();
            dto.exampleEn = w.getContextSentenceEn();
            dto.exampleVi = w.getContextSentenceVi();
            return dto;
        }).collect(Collectors.toList());

        return res;
    }

    @Transactional
    public ClassroomDto.ClassroomDetailResponse joinClassroom(UUID userId, String code) {
        User user = authService.getUserProfile(userId);
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Mã phòng học không hợp lệ: " + code));

        Optional<ClassroomMember> existing = classroomMemberRepository.findByClassroomIdAndUserId(classroom.getId(), user.getId());
        if (existing.isEmpty()) {
            ClassroomMember member = new ClassroomMember(classroom, user);
            classroomMemberRepository.save(member);
            log.info("👋 [CLASSROOM JOIN] Thành viên '{}' vừa tham gia phòng '{}'", user.getUsername(), classroom.getCode());
        }

        return getClassroomByCode(classroom.getCode(), user.getId());
    }

    @Transactional
    public Map<String, Object> cloneToNotebook(UUID userId, String code) {
        User user = authService.getUserProfile(userId);
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng học với mã: " + code));

        // Cập nhật trạng thái thành viên
        ClassroomMember member = classroomMemberRepository.findByClassroomIdAndUserId(classroom.getId(), user.getId())
                .orElseGet(() -> {
                    ClassroomMember m = new ClassroomMember(classroom, user);
                    return classroomMemberRepository.save(m);
                });
        member.setClonedToNotebook(true);
        classroomMemberRepository.save(member);

        List<ClassroomWord> classroomWords = classroomWordRepository.findByClassroomIdOrderByCreatedAtAsc(classroom.getId());
        int importedCount = 0;
        int existedCount = 0;

        for (ClassroomWord cw : classroomWords) {
            String wordText = cw.getWordText().trim();
            if (wordText.isEmpty()) continue;

            // Kiểm tra hoặc lưu từ vựng trong từ điển chung (Word)
            Word word = wordRepository.findByWordIgnoreCase(wordText).orElseGet(() -> {
                Word newWord = new Word(
                        wordText,
                        cw.getIpa(),
                        cw.getPartOfSpeech(),
                        cw.getVietnamese(),
                        classroom.getTargetLevel()
                );
                newWord.setExampleSentenceEn(cw.getContextSentenceEn());
                newWord.setExampleSentenceVi(cw.getContextSentenceVi());
                newWord.setCategory("Lớp học: " + classroom.getName());
                return wordRepository.save(newWord);
            });

            // Kiểm tra xem người dùng đã có từ này trong sổ tay chưa
            Optional<UserWordProgress> existingProgress = userWordProgressRepository.findByUserIdAndWordId(user.getId(), word.getId());
            if (existingProgress.isEmpty()) {
                UserWordProgress progress = new UserWordProgress(user, word, null);
                progress.setStatus("NEW");
                userWordProgressRepository.save(progress);
                importedCount++;
            } else {
                existedCount++;
            }
        }

        log.info("📥 [CLONE TO NOTEBOOK] Học viên '{}' đã kéo bộ '{}' về sổ tay: {} từ mới, {} từ đã có sẵn.",
                user.getUsername(), classroom.getName(), importedCount, existedCount);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("importedCount", importedCount);
        response.put("existedCount", existedCount);
        response.put("totalWords", classroomWords.size());
        response.put("message", "Đã kéo thành công " + importedCount + " từ vựng mới vào sổ tay ôn tập SM-2!");
        return response;
    }

    @Transactional
    public Map<String, Object> saveWordsToNotebook(UUID userId, ClassroomDto.SaveWordsToNotebookRequest request) {
        User user = authService.getUserProfile(userId);
        if (request == null || request.words == null || request.words.isEmpty()) {
            throw new RuntimeException("Danh sách từ vựng cần lưu không được để trống");
        }

        int importedCount = 0;
        int existedCount = 0;
        String category = (request.category != null && !request.category.isBlank())
                ? request.category.trim()
                : "Trích xuất văn bản";
        String level = (request.targetLevel != null && !request.targetLevel.isBlank())
                ? request.targetLevel.trim()
                : "B1";

        for (ClassroomDto.WordItemDto w : request.words) {
            if (w.word == null || w.word.isBlank()) continue;
            String wordText = w.word.trim();

            Word word = wordRepository.findByWordIgnoreCase(wordText).orElseGet(() -> {
                Word newWord = new Word(
                        wordText,
                        w.ipa,
                        w.partOfSpeech != null && !w.partOfSpeech.isBlank() ? w.partOfSpeech : "noun",
                        w.vietnamese != null ? w.vietnamese : "",
                        level
                );
                newWord.setExampleSentenceEn(w.exampleEn);
                newWord.setExampleSentenceVi(w.exampleVi);
                newWord.setCategory(category);
                return wordRepository.save(newWord);
            });

            Optional<UserWordProgress> existingProgress = userWordProgressRepository.findByUserIdAndWordId(user.getId(), word.getId());
            if (existingProgress.isEmpty()) {
                UserWordProgress progress = new UserWordProgress(user, word, null);
                progress.setStatus("NEW");
                userWordProgressRepository.save(progress);
                importedCount++;
            } else {
                existedCount++;
            }
        }

        log.info("📥 [SAVE WORDS TO NOTEBOOK] Học viên '{}' đã lưu {} từ mới ({} từ đã tồn tại) vào sổ tay cá nhân.",
                user.getUsername(), importedCount, existedCount);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("importedCount", importedCount);
        response.put("existedCount", existedCount);
        response.put("totalWords", request.words.size());
        String msg = importedCount > 0
                ? "Đã lưu thành công " + importedCount + " từ vựng mới vào sổ tay ôn tập SM-2!"
                : "Tất cả " + existedCount + " từ vựng đã có sẵn trong sổ tay của bạn.";
        response.put("message", msg);
        return response;
    }

    @Transactional
    public List<ClassroomDto.LeaderboardItemDto> submitQuizAttempt(UUID userId, String code, ClassroomDto.QuizAttemptRequest req) {
        User user = authService.getUserProfile(userId);
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng học với mã: " + code));

        // Tự động gia nhập nếu chưa là thành viên
        if (classroomMemberRepository.findByClassroomIdAndUserId(classroom.getId(), user.getId()).isEmpty()) {
            ClassroomMember member = new ClassroomMember(classroom, user);
            classroomMemberRepository.save(member);
        }

        ClassroomQuizAttempt attempt = new ClassroomQuizAttempt(
                classroom,
                user,
                req.score != null ? req.score : 0,
                req.totalQuestions != null ? req.totalQuestions : 0,
                req.timeSpentSeconds != null ? req.timeSpentSeconds : 0
        );
        classroomQuizAttemptRepository.save(attempt);

        log.info("🏆 [QUIZ ATTEMPT SUBMITTED] User '{}' tại phòng '{}': Score={}/{}, Time={}s",
                user.getUsername(), classroom.getCode(), attempt.getScore(), attempt.getTotalQuestions(), attempt.getTimeSpentSeconds());

        return getClassroomLeaderboard(classroom.getCode());
    }

    @Transactional(readOnly = true)
    public List<ClassroomDto.LeaderboardItemDto> getClassroomLeaderboard(String code) {
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng học với mã: " + code));

        List<ClassroomQuizAttempt> attempts = classroomQuizAttemptRepository.findByClassroomIdOrderByScoreDescTimeSpentSecondsAsc(classroom.getId());

        // Lọc lấy điểm cao nhất và thời gian ngắn nhất của mỗi người dùng (Personal Best)
        Map<UUID, ClassroomQuizAttempt> bestAttemptsByUser = new LinkedHashMap<>();
        for (ClassroomQuizAttempt att : attempts) {
            UUID uid = att.getUser().getId();
            if (!bestAttemptsByUser.containsKey(uid)) {
                bestAttemptsByUser.put(uid, att);
            }
        }

        List<ClassroomDto.LeaderboardItemDto> leaderboard = new ArrayList<>();
        int rank = 1;
        for (ClassroomQuizAttempt att : bestAttemptsByUser.values()) {
            ClassroomDto.LeaderboardItemDto item = new ClassroomDto.LeaderboardItemDto();
            item.rank = rank++;
            item.userId = att.getUser().getId();
            item.username = att.getUser().getUsername();
            item.fullName = att.getUser().getFullName() != null ? att.getUser().getFullName() : att.getUser().getUsername();
            item.avatarUrl = att.getUser().getAvatarUrl();
            item.score = att.getScore();
            item.totalQuestions = att.getTotalQuestions();
            item.timeSpentSeconds = att.getTimeSpentSeconds();
            item.submittedAt = att.getSubmittedAt();
            leaderboard.add(item);
        }

        return leaderboard;
    }

    @Transactional(readOnly = true)
    public List<ClassroomDto.ClassroomSummaryDto> getMyClassrooms(UUID userId) {
        User user = authService.getUserProfile(userId);

        List<Classroom> createdList = classroomRepository.findByOwnerIdOrderByCreatedAtDesc(user.getId());
        List<Classroom> joinedList = classroomRepository.findJoinedClassroomsByUserId(user.getId());

        Map<UUID, Classroom> allMap = new LinkedHashMap<>();
        for (Classroom c : createdList) {
            allMap.put(c.getId(), c);
        }
        for (Classroom c : joinedList) {
            allMap.putIfAbsent(c.getId(), c);
        }

        return allMap.values().stream().map(c -> {
            ClassroomDto.ClassroomSummaryDto dto = new ClassroomDto.ClassroomSummaryDto();
            dto.id = c.getId();
            dto.code = c.getCode();
            dto.name = c.getName();
            dto.description = c.getDescription();
            dto.targetLevel = c.getTargetLevel();
            dto.createdAt = c.getCreatedAt();
            dto.isOwner = c.getOwner() != null && c.getOwner().getId().equals(user.getId());
            dto.ownerName = c.getOwner() != null ? (c.getOwner().getFullName() != null ? c.getOwner().getFullName() : c.getOwner().getUsername()) : "Ẩn danh";
            dto.wordsCount = c.getWords() != null ? c.getWords().size() : (int) classroomWordRepository.findByClassroomIdOrderByCreatedAtAsc(c.getId()).size();
            dto.memberCount = classroomMemberRepository.countByClassroomId(c.getId());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public ClassroomDto.ClassroomDetailResponse addWordsToClassroom(UUID userId, String code, ClassroomDto.AddWordsRequest req) {
        User user = authService.getUserProfile(userId);
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng học với mã: " + code));

        boolean isOwner = classroom.getOwner() != null && classroom.getOwner().getId().equals(user.getId());
        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.getRole());
        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Chỉ chủ phòng mới có quyền thêm từ vựng vào lớp học này.");
        }

        if (req == null || req.words == null || req.words.isEmpty()) {
            return getClassroomByCode(code, userId);
        }

        List<ClassroomWord> currentWords = classroomWordRepository.findByClassroomIdOrderByCreatedAtAsc(classroom.getId());
        Set<String> existingWordSet = currentWords.stream()
                .map(w -> w.getWordText().trim().toLowerCase())
                .collect(Collectors.toSet());

        List<ClassroomWord> newClassroomWords = new ArrayList<>();
        for (ClassroomDto.WordItemDto w : req.words) {
            if (w == null || w.word == null || w.word.trim().isEmpty()) continue;
            String normalized = w.word.trim().toLowerCase();
            if (existingWordSet.contains(normalized)) continue;

            // Ensure Word exists in global dictionary
            if (wordRepository.findByWordIgnoreCase(normalized).isEmpty()) {
                Word newDictWord = new Word(
                        w.word.trim(),
                        w.ipa != null ? w.ipa : "",
                        w.partOfSpeech != null ? w.partOfSpeech : "noun",
                        w.vietnamese != null ? w.vietnamese : "",
                        classroom.getTargetLevel() != null ? classroom.getTargetLevel() : "B1"
                );
                newDictWord.setExampleSentenceEn(w.exampleEn != null ? w.exampleEn : "");
                newDictWord.setExampleSentenceVi(w.exampleVi != null ? w.exampleVi : "");
                newDictWord.setCategory(classroom.getName() != null ? classroom.getName() : "Lớp học");
                wordRepository.save(newDictWord);
            }

            ClassroomWord cw = new ClassroomWord(
                    classroom,
                    w.word.trim(),
                    w.ipa != null ? w.ipa : "",
                    w.vietnamese != null ? w.vietnamese : "",
                    w.partOfSpeech != null ? w.partOfSpeech : "",
                    w.exampleEn != null ? w.exampleEn : "",
                    w.exampleVi != null ? w.exampleVi : ""
            );
            newClassroomWords.add(cw);
            existingWordSet.add(normalized);
        }

        if (!newClassroomWords.isEmpty()) {
            classroomWordRepository.saveAll(newClassroomWords);
            log.info("📚 [WORDS ADDED] Đã thêm {} từ mới vào phòng '{}' bởi {}", newClassroomWords.size(), classroom.getCode(), user.getUsername());
        }

        return getClassroomByCode(code, userId);
    }

    @Transactional
    public Map<String, Object> saveFlashcardProgress(UUID userId, String code, ClassroomDto.SaveFlashcardProgressRequest req) {
        User user = authService.getUserProfile(userId);
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng học với mã: " + code));

        // Auto join classroom as member if not owner and not member
        boolean isOwner = classroom.getOwner() != null && classroom.getOwner().getId().equals(user.getId());
        if (!isOwner && !classroomMemberRepository.existsByClassroomIdAndUserId(classroom.getId(), user.getId())) {
            classroomMemberRepository.save(new ClassroomMember(classroom, user));
        }

        ClassroomMemberProgress progress = classroomMemberProgressRepository
                .findByClassroomIdAndUserId(classroom.getId(), user.getId())
                .orElseGet(() -> new ClassroomMemberProgress(classroom, user, 0, 0, false, "[]"));

        int totalWords = req.totalWords != null && req.totalWords > 0 ? req.totalWords : (int) classroomWordRepository.countByClassroomId(classroom.getId());
        int masteredCount = req.masteredCount != null ? req.masteredCount : 0;
        boolean completed = masteredCount >= totalWords && totalWords > 0;

        String unmasteredJson = "[]";
        if (req.unmasteredWords != null && !req.unmasteredWords.isEmpty()) {
            try {
                unmasteredJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(req.unmasteredWords);
            } catch (Exception e) {
                log.warn("Lỗi serialize unmasteredWords: {}", e.getMessage());
            }
        }

        progress.setMasteredCount(masteredCount);
        progress.setTotalWords(totalWords);
        progress.setCompleted(completed);
        progress.setUnmasteredWordsJson(unmasteredJson);
        progress.setLastStudiedAt(OffsetDateTime.now());

        classroomMemberProgressRepository.save(progress);
        log.info("📈 [FLASHCARD PROGRESS] User '{}' học lớp '{}': {}/{} từ (Hoàn thành={})",
                user.getUsername(), classroom.getCode(), masteredCount, totalWords, completed);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("masteredCount", masteredCount);
        res.put("totalWords", totalWords);
        res.put("completed", completed);
        res.put("lastStudiedAt", progress.getLastStudiedAt());
        return res;
    }

    @Transactional(readOnly = true)
    public ClassroomDto.ClassroomProgressDashboardResponse getProgressDashboard(UUID userId, String code) {
        User user = authService.getUserProfile(userId);
        Classroom classroom = classroomRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng học với mã: " + code));

        List<ClassroomMemberProgress> progresses = classroomMemberProgressRepository.findByClassroomIdOrderByLastStudiedAtDesc(classroom.getId());
        long totalMembers = classroomMemberRepository.countByClassroomId(classroom.getId());
        // If owner is not registered in member table, add 1
        boolean ownerIsMember = classroomMemberRepository.existsByClassroomIdAndUserId(classroom.getId(), classroom.getOwner().getId());
        if (!ownerIsMember) {
            totalMembers += 1;
        }

        long studiedCount = progresses.size();
        long completedCount = progresses.stream().filter(ClassroomMemberProgress::getCompleted).count();

        int sumRate = 0;
        Map<String, Integer> unmasteredFreqMap = new HashMap<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        List<ClassroomDto.MemberProgressDto> memberDtos = new ArrayList<>();
        for (ClassroomMemberProgress p : progresses) {
            ClassroomDto.MemberProgressDto m = new ClassroomDto.MemberProgressDto();
            m.userId = p.getUser().getId();
            m.username = p.getUser().getUsername();
            m.fullName = p.getUser().getFullName() != null ? p.getUser().getFullName() : p.getUser().getUsername();
            m.avatarUrl = p.getUser().getAvatarUrl();
            m.masteredCount = p.getMasteredCount();
            m.totalWords = p.getTotalWords();
            m.completed = p.getCompleted();
            m.lastStudiedAt = p.getLastStudiedAt();

            int pct = (p.getTotalWords() > 0) ? (int) Math.round((double) p.getMasteredCount() * 100.0 / p.getTotalWords()) : 0;
            m.progressPercentage = Math.min(100, Math.max(0, pct));
            sumRate += m.progressPercentage;

            List<String> unmasteredList = new ArrayList<>();
            if (p.getUnmasteredWordsJson() != null && !p.getUnmasteredWordsJson().trim().isEmpty()) {
                try {
                    unmasteredList = mapper.readValue(p.getUnmasteredWordsJson(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    for (String w : unmasteredList) {
                        if (w != null && !w.trim().isEmpty()) {
                            unmasteredFreqMap.put(w.trim(), unmasteredFreqMap.getOrDefault(w.trim(), 0) + 1);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Không parse được unmastered JSON: {}", e.getMessage());
                }
            }
            m.unmasteredWords = unmasteredList;
            memberDtos.add(m);
        }

        int avgRate = studiedCount > 0 ? (int) Math.round((double) sumRate / studiedCount) : 0;

        List<ClassroomDto.HardestWordDto> hardestWords = unmasteredFreqMap.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(e -> new ClassroomDto.HardestWordDto(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        ClassroomDto.ClassroomProgressDashboardResponse res = new ClassroomDto.ClassroomProgressDashboardResponse();
        res.classroomCode = classroom.getCode();
        res.classroomName = classroom.getName();
        res.totalWords = (int) classroomWordRepository.countByClassroomId(classroom.getId());
        res.totalMembers = totalMembers;
        res.studiedMembersCount = studiedCount;
        res.completedMembersCount = completedCount;
        res.averageCompletionRate = avgRate;
        res.memberProgresses = memberDtos;
        res.hardestWords = hardestWords;

        return res;
    }
}
