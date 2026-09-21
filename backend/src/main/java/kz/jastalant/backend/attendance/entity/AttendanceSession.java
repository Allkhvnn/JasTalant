package kz.jastalant.backend.attendance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "attendance_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private UUID academyId;

    @Column(nullable = false, updatable = false)
    private UUID groupId;

    @Column(updatable = false)
    private UUID trainingId;

    @Column(nullable = false, updatable = false)
    private LocalDate trainingDate;

    @Version
    private long version;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public AttendanceSession(UUID academyId, UUID groupId, LocalDate trainingDate, Instant now) {
        this(academyId, groupId, null, trainingDate, now);
    }

    public AttendanceSession(UUID academyId, UUID groupId, UUID trainingId, LocalDate trainingDate, Instant now) {
        this.academyId = academyId;
        this.groupId = groupId;
        this.trainingId = trainingId;
        this.trainingDate = trainingDate;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void touch(Instant now) {
        this.updatedAt = now;
    }
}
