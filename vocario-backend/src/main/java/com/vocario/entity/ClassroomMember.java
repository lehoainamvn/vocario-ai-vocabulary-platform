package com.vocario.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "classroom_members",
    uniqueConstraints = @UniqueConstraint(columnNames = {"classroom_id", "user_id"}),
    indexes = @Index(name = "idx_classroom_member_user", columnList = "user_id")
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ClassroomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private OffsetDateTime joinedAt = OffsetDateTime.now();

    private Boolean clonedToNotebook = false;

    public ClassroomMember() {}

    public ClassroomMember(Classroom classroom, User user) {
        this.classroom = classroom;
        this.user = user;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Classroom getClassroom() { return classroom; }
    public void setClassroom(Classroom classroom) { this.classroom = classroom; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public OffsetDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(OffsetDateTime joinedAt) { this.joinedAt = joinedAt; }

    public Boolean getClonedToNotebook() { return clonedToNotebook; }
    public void setClonedToNotebook(Boolean clonedToNotebook) { this.clonedToNotebook = clonedToNotebook; }
}
