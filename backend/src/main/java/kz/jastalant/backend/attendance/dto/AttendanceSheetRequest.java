package kz.jastalant.backend.attendance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AttendanceSheetRequest(
        @Min(0) long version,
        @NotEmpty List<@Valid AttendanceMarkRequest> records) {}
