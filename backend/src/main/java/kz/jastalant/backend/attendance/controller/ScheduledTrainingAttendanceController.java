package kz.jastalant.backend.attendance.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.attendance.dto.AttendanceSheetRequest;
import kz.jastalant.backend.attendance.dto.AttendanceSheetResponse;
import kz.jastalant.backend.attendance.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/trainings/{trainingId}/attendance")
@RequiredArgsConstructor
public class ScheduledTrainingAttendanceController {
    private final AttendanceService attendance;

    @GetMapping
    public AttendanceSheetResponse get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID trainingId) {
        return attendance.getForTraining(UUID.fromString(jwt.getSubject()), academyId, trainingId);
    }

    @PutMapping
    public AttendanceSheetResponse save(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID trainingId,
            @Valid @RequestBody AttendanceSheetRequest request) {
        return attendance.saveForTraining(UUID.fromString(jwt.getSubject()), academyId, trainingId, request);
    }
}
