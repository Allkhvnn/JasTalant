package kz.jastalant.backend.training.entity;

import jakarta.persistence.*;
import kz.jastalant.backend.membership.entity.AcademyMembership;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "scheduled_trainings", uniqueConstraints = @UniqueConstraint(
        name = "uq_scheduled_training_slot",
        columnNames = {"academy_id", "group_id", "training_date", "start_time"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScheduledTraining {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, updatable = false)
    private UUID academyId;
    @Column(nullable = false)
    private UUID groupId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coach_membership_id", nullable = false)
    private AcademyMembership coach;
    @Column(nullable = false)
    private LocalDate trainingDate;
    @Column(nullable = false)
    private LocalTime startTime;
    @Column(nullable = false)
    private LocalTime endTime;
    @Column(length = 200)
    private String location;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TrainingStatus status;
    @Version
    private long version;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    public ScheduledTraining(UUID academyId, UUID groupId, AcademyMembership coach,
            LocalDate trainingDate, LocalTime startTime, LocalTime endTime,
            String location, TrainingStatus status, Instant now) {
        this.academyId = academyId;
        this.createdAt = now;
        update(groupId, coach, trainingDate, startTime, endTime, location, status, now);
    }

    public void update(UUID groupId, AcademyMembership coach, LocalDate trainingDate,
            LocalTime startTime, LocalTime endTime, String location, TrainingStatus status, Instant now) {
        this.groupId = groupId;
        this.coach = coach;
        this.trainingDate = trainingDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.location = location == null || location.isBlank() ? null : location.strip();
        this.status = status;
        this.updatedAt = now;
    }
}
