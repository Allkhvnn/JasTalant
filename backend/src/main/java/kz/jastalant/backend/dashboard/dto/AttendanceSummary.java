package kz.jastalant.backend.dashboard.dto;

import java.time.LocalDate;

public record AttendanceSummary(
        LocalDate periodStart,
        LocalDate periodEnd,
        long sessionsRecorded,
        long recordsMarked,
        long presentCount,
        long lateCount,
        long absentCount,
        long excusedCount,
        int attendanceRate,
        long pendingSheets) {}
