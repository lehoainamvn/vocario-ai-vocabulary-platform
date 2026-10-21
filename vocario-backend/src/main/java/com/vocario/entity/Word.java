package com.vocario.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "words")
public class Word {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false, length = 150)
    private String word;

    @Column(length = 50)
    private String partOfSpeech;

    @Column(length = 100)
    private String phoneticIpa;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String vietnameseMeaning;

    @Column(columnDefinition = "TEXT")
    private String definitionEn;

    @Column(length = 10)
    private String cefrLevel = "A1";

    @Column(columnDefinition = "TEXT")
    private String audioUrl;

    @Column(columnDefinition = "TEXT")
    private String exampleSentenceEn;

    @Column(columnDefinition = "TEXT")
    private String exampleSentenceVi;

    @Column(length = 100)
    private String category;

    private OffsetDateTime createdAt = OffsetDateTime.now();

    public Word() {}

    public Word(String word, String phoneticIpa, String partOfSpeech, String vietnameseMeaning, String cefrLevel) {
        this.word = word;
        this.phoneticIpa = phoneticIpa;
        this.partOfSpeech = partOfSpeech;
        this.vietnameseMeaning = vietnameseMeaning;
        this.cefrLevel = cefrLevel;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getWord() { return word; }
    public void setWord(String word) { this.word = word; }

    public String getPartOfSpeech() { return partOfSpeech; }
    public void setPartOfSpeech(String partOfSpeech) { this.partOfSpeech = partOfSpeech; }

    public String getPhoneticIpa() { return phoneticIpa; }
    public void setPhoneticIpa(String phoneticIpa) { this.phoneticIpa = phoneticIpa; }

    public String getVietnameseMeaning() { return vietnameseMeaning; }
    public void setVietnameseMeaning(String vietnameseMeaning) { this.vietnameseMeaning = vietnameseMeaning; }

    public String getDefinitionEn() { return definitionEn; }
    public void setDefinitionEn(String definitionEn) { this.definitionEn = definitionEn; }

    public String getCefrLevel() { return cefrLevel; }
    public void setCefrLevel(String cefrLevel) { this.cefrLevel = cefrLevel; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public String getExampleSentenceEn() { return exampleSentenceEn; }
    public void setExampleSentenceEn(String exampleSentenceEn) { this.exampleSentenceEn = exampleSentenceEn; }

    public String getExampleSentenceVi() { return exampleSentenceVi; }
    public void setExampleSentenceVi(String exampleSentenceVi) { this.exampleSentenceVi = exampleSentenceVi; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
