package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "classroom_words",
    indexes = @Index(name = "idx_classroom_words_cls", columnList = "classroom_id")
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ClassroomWord {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @Column(nullable = false, length = 150)
    private String wordText;

    @Column(length = 100)
    private String ipa;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String vietnamese;

    @Column(length = 50)
    private String partOfSpeech;

    @Column(columnDefinition = "TEXT")
    private String contextSentenceEn;

    @Column(columnDefinition = "TEXT")
    private String contextSentenceVi;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    public ClassroomWord() {}

    public ClassroomWord(Classroom classroom, String wordText, String ipa, String vietnamese, String partOfSpeech, String contextSentenceEn, String contextSentenceVi) {
        this.classroom = classroom;
        this.wordText = wordText;
        this.ipa = ipa;
        this.vietnamese = vietnamese;
        this.partOfSpeech = partOfSpeech;
        this.contextSentenceEn = contextSentenceEn;
        this.contextSentenceVi = contextSentenceVi;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Classroom getClassroom() { return classroom; }
    public void setClassroom(Classroom classroom) { this.classroom = classroom; }

    public String getWordText() { return wordText; }
    public void setWordText(String wordText) { this.wordText = wordText; }

    public String getIpa() { return ipa; }
    public void setIpa(String ipa) { this.ipa = ipa; }

    public String getVietnamese() { return vietnamese; }
    public void setVietnamese(String vietnamese) { this.vietnamese = vietnamese; }

    public String getPartOfSpeech() { return partOfSpeech; }
    public void setPartOfSpeech(String partOfSpeech) { this.partOfSpeech = partOfSpeech; }

    public String getContextSentenceEn() { return contextSentenceEn; }
    public void setContextSentenceEn(String contextSentenceEn) { this.contextSentenceEn = contextSentenceEn; }

    public String getContextSentenceVi() { return contextSentenceVi; }
    public void setContextSentenceVi(String contextSentenceVi) { this.contextSentenceVi = contextSentenceVi; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
