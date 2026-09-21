package kz.jastalant.backend.parent.dto;

import kz.jastalant.backend.attendance.entity.AttendanceStatus;

import java.time.LocalDate;
import java.util.UUID;

public record ChildAttendanceResponse(
        UUID sessionId,
        LocalDate trainingDate,
        UUID groupId,
        String groupName,
        AttendanceStatus status,
        String comment) {}
