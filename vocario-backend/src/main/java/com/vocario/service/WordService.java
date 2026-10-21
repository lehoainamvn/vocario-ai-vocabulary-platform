package com.vocario.service;

import com.vocario.entity.Word;
import com.vocario.repository.WordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class WordService {

    private static final Logger log = LoggerFactory.getLogger(WordService.class);

    private final WordRepository wordRepository;

    public WordService(WordRepository wordRepository) {
        this.wordRepository = wordRepository;
    }

    public List<Word> getAllWords() {
        log.info("📚 [WORD SERVICE] Lấy toàn bộ danh sách từ vựng trong từ điển...");
        List<Word> words = wordRepository.findAll();
        log.info("📚 [WORD SERVICE] Đã tải {} từ vựng từ cơ sở dữ liệu.", words.size());
        return words;
    }

    public Optional<Word> getWordById(UUID id) {
        log.info("🔍 [WORD SERVICE] Tra cứu từ vựng theo ID: {}", id);
        Optional<Word> wordOpt = wordRepository.findById(id);
        if (wordOpt.isPresent()) {
            log.info("   -> Tìm thấy từ: '{}' ({})", wordOpt.get().getWord(), wordOpt.get().getVietnameseMeaning());
        } else {
            log.warn("   -> ⚠️ Không tìm thấy từ vựng với ID: {}", id);
        }
        return wordOpt;
    }

    public Optional<Word> findByWord(String word) {
        log.info("🔍 [WORD SERVICE] Tìm từ vựng theo tên tiếng Anh: '{}'", word);
        return wordRepository.findByWordIgnoreCase(word);
    }

    public List<Word> searchWords(String query) {
        log.info("🔎 [WORD SERVICE] Tìm kiếm từ vựng với từ khóa: '{}'", query);
        List<Word> results = wordRepository.findByWordContainingIgnoreCase(query);
        log.info("   -> Tìm thấy {} kết quả phù hợp cho '{}'", results.size(), query);
        return results;
    }

    public Word saveWord(Word word) {
        log.info("➕ [WORD SERVICE] Thêm/Cập nhật từ vựng mới: '{}' | IPA: '{}' | Nghĩa: '{}'", 
                word.getWord(), word.getPhoneticIpa(), word.getVietnameseMeaning());
        Word saved = wordRepository.save(word);
        log.info("   -> ✅ Đã lưu từ vựng vào DB với ID: {}", saved.getId());
        return saved;
    }

    public Word getOrCreateWord(String englishWord, String vietnameseMeaning, String ipa, String cefrLevel) {
        return wordRepository.findByWordIgnoreCase(englishWord).map(existing -> {
            log.info("ℹ️ [WORD SERVICE] Từ '{}' đã có sẵn trong từ điển (ID: {}).", englishWord, existing.getId());
            if (cefrLevel != null && !cefrLevel.isBlank() && !cefrLevel.equalsIgnoreCase(existing.getCefrLevel())) {
                existing.setCefrLevel(cefrLevel);
                wordRepository.save(existing);
            }
            return existing;
        }).orElseGet(() -> {
            log.info("➕ [WORD SERVICE] Từ '{}' chưa có, tự động tạo mới vào từ điển với CEFR: {}...", englishWord, cefrLevel);
            String level = (cefrLevel != null && !cefrLevel.isBlank()) ? cefrLevel : "A2";
            Word w = new Word(englishWord, ipa, "Noun", vietnameseMeaning, level);
            Word saved = wordRepository.save(w);
            log.info("   -> ✅ Tạo mới từ '{}' thành công với ID: {}", englishWord, saved.getId());
            return saved;
        });
    }

    public Word getOrCreateWord(String englishWord, String vietnameseMeaning, String ipa) {
        return getOrCreateWord(englishWord, vietnameseMeaning, ipa, "A2");
    }
}

