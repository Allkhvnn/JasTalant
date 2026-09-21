package kz.jastalant.backend.training.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kz.jastalant.backend.training.entity.TrainingStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ScheduledTrainingRequest(
        @NotNull UUID groupId,
        @NotNull UUID coachUserId,
        @NotNull LocalDate trainingDate,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @Size(max = 200) String location,
        @NotNull TrainingStatus status) {}
