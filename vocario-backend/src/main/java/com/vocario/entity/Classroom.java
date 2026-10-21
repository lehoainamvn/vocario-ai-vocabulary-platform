package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
    name = "classrooms",
    indexes = @Index(name = "idx_classroom_code", columnList = "code", unique = true)
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String code; // Mã phòng học ngắn gọn (VD: VOC-882)

    @Column(nullable = false, length = 200)
    private String name; // Tên lớp học / bộ từ vựng chia sẻ

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(length = 10)
    private String targetLevel = "A2";

    @Column(length = 50)
    private String icon = "users";

    @Column(length = 20, nullable = false)
    private String status = "ACTIVE";

    private OffsetDateTime createdAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ClassroomWord> words = new ArrayList<>();

    public Classroom() {}

    public Classroom(String code, String name, String description, User owner, String targetLevel) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.owner = owner;
        this.targetLevel = targetLevel;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    public String getTargetLevel() { return targetLevel; }
    public void setTargetLevel(String targetLevel) { this.targetLevel = targetLevel; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status != null ? status : "ACTIVE"; }
    public void setStatus(String status) { this.status = status; }

    public List<ClassroomWord> getWords() { return words; }
    public void setWords(List<ClassroomWord> words) { this.words = words; }
}
