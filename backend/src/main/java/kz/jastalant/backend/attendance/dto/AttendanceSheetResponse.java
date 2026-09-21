package kz.jastalant.backend.attendance.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AttendanceSheetResponse(
        UUID id,
        UUID academyId,
        UUID groupId,
        UUID trainingId,
        LocalDate trainingDate,
        long version,
        boolean saved,
        List<AttendancePlayerResponse> players) {}
