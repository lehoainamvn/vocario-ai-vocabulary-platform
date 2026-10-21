package com.vocario.controller;

import com.vocario.entity.Word;
import com.vocario.service.WordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/words")
@Tag(name = "3. Vocabulary", description = "API Quản lý kho từ điển, tra cứu phiên âm IPA và nghĩa tiếng Việt")
public class WordController {

    private final WordService wordService;

    public WordController(WordService wordService) {
        this.wordService = wordService;
    }

    @GetMapping
    @Operation(summary = "Lấy toàn bộ kho từ vựng", description = "Lấy danh sách tất cả các từ vựng hiện có trong hệ thống.")
    public ResponseEntity<List<Word>> getAllWords() {
        return ResponseEntity.ok(wordService.getAllWords());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Tra cứu từ theo ID", description = "Lấy chi tiết thông tin từ vựng, phiên âm IPA, câu ví dụ theo UUID.")
    public ResponseEntity<Word> getWordById(@PathVariable UUID id) {
        return wordService.getWordById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm từ vựng", description = "Tìm kiếm từ vựng tiếng Anh theo từ khóa.")
    public ResponseEntity<List<Word>> searchWords(@RequestParam String query) {
        return ResponseEntity.ok(wordService.searchWords(query));
    }

    @PostMapping
    @Operation(summary = "Thêm từ vựng mới vào từ điển", description = "Tạo một từ vựng mới kèm phiên âm IPA, nghĩa tiếng Việt và cấp độ CEFR.")
    public ResponseEntity<Word> createWord(@RequestBody Word word) {
        return ResponseEntity.ok(wordService.saveWord(word));
    }
}
