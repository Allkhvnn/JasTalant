package kz.jastalant.backend.attendance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kz.jastalant.backend.attendance.entity.AttendanceStatus;

import java.util.UUID;

public record AttendanceMarkRequest(
        @NotNull UUID playerId,
        @NotNull AttendanceStatus status,
        @Size(max = 300) String comment) {}
