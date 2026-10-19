package kz.jastalant.backend.audit.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_events")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditEvent {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID academyId;
    @Column(nullable = false)
    private UUID actorId;
    @Column(nullable = false, length = 200)
    private String actorName;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 50)
    private AuditAction action;
    @Column(nullable = false)
    private UUID targetId;
    @Column(nullable = false, length = 300)
    private String targetName;
    @Column(nullable = false)
    private Instant occurredAt;

    public AuditEvent(UUID academyId, UUID actorId, String actorName, AuditAction action,
            UUID targetId, String targetName, Instant occurredAt) {
        this.academyId = academyId;
        this.actorId = actorId;
        this.actorName = actorName;
        this.action = action;
        this.targetId = targetId;
        this.targetName = targetName;
        this.occurredAt = occurredAt;
    }
}
