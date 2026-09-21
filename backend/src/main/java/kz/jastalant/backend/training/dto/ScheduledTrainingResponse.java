package kz.jastalant.backend.training.dto;

import kz.jastalant.backend.training.entity.TrainingStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ScheduledTrainingResponse(
        UUID id, UUID academyId, UUID groupId, String groupName,
        UUID coachUserId, String coachName, LocalDate trainingDate,
        LocalTime startTime, LocalTime endTime, String location,
        TrainingStatus status, long version, Instant createdAt, Instant updatedAt) {}
