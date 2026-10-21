package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "captures")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Capture {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(length = 100)
    private String sceneTheme = "General";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String detectedObjects; // JSON string chứa danh sách bounding boxes và labels

    private OffsetDateTime createdAt = OffsetDateTime.now();

    public Capture() {}

    public Capture(User user, String imageUrl, String sceneTheme, String detectedObjects) {
        this.user = user;
        this.imageUrl = imageUrl;
        this.sceneTheme = sceneTheme;
        this.detectedObjects = detectedObjects;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getSceneTheme() { return sceneTheme; }
    public void setSceneTheme(String sceneTheme) { this.sceneTheme = sceneTheme; }

    public String getDetectedObjects() { return detectedObjects; }
    public void setDetectedObjects(String detectedObjects) { this.detectedObjects = detectedObjects; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
