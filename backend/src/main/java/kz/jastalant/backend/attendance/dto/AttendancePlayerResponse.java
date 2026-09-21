package kz.jastalant.backend.attendance.dto;

import kz.jastalant.backend.attendance.entity.AttendanceStatus;

import java.util.UUID;

public record AttendancePlayerResponse(
        UUID playerId,
        String fullName,
        AttendanceStatus status,
        String comment) {}
