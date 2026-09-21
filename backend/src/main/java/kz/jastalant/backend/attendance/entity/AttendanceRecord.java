package kz.jastalant.backend.attendance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "attendance_records", uniqueConstraints = @UniqueConstraint(
        name = "uq_attendance_session_player",
        columnNames = {"session_id", "player_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private UUID academyId;

    @Column(nullable = false, updatable = false)
    private UUID sessionId;

    @Column(nullable = false, updatable = false)
    private UUID playerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(length = 300)
    private String comment;

    public AttendanceRecord(UUID academyId, UUID sessionId, UUID playerId,
                            AttendanceStatus status, String comment) {
        this.academyId = academyId;
        this.sessionId = sessionId;
        this.playerId = playerId;
        update(status, comment);
    }

    public void update(AttendanceStatus status, String comment) {
        this.status = status;
        this.comment = comment == null || comment.isBlank() ? null : comment.strip();
    }
}
