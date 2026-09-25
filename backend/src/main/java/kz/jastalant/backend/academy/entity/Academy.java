package kz.jastalant.backend.academy.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "academies")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Academy {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AcademyStatus status = AcademyStatus.ACTIVE;

    @Column(length = 500)
    private String statusReason;

    private Instant statusChangedAt;

    private UUID statusChangedBy;

    @Version
    private long version;

    public Academy(String name) {
        this.name = name == null ? null : name.strip();
    }

    public void changeStatus(AcademyStatus nextStatus, String reason, UUID actor, Instant changedAt) {
        this.status = nextStatus;
        this.statusReason = nextStatus == AcademyStatus.ACTIVE ? null : reason.strip();
        this.statusChangedBy = actor;
        this.statusChangedAt = changedAt;
    }
}
