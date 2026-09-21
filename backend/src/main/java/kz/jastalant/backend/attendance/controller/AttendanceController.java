package kz.jastalant.backend.attendance.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.attendance.dto.AttendanceSheetRequest;
import kz.jastalant.backend.attendance.dto.AttendanceSheetResponse;
import kz.jastalant.backend.attendance.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/groups/{groupId}/attendance")
@RequiredArgsConstructor
public class AttendanceController {
    private final AttendanceService attendance;

    @GetMapping("/{trainingDate}")
    public AttendanceSheetResponse get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID academyId,
            @PathVariable UUID groupId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate trainingDate) {
        return attendance.get(UUID.fromString(jwt.getSubject()), academyId, groupId, trainingDate);
    }

    @PutMapping("/{trainingDate}")
    public AttendanceSheetResponse save(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID academyId,
            @PathVariable UUID groupId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate trainingDate,
            @Valid @RequestBody AttendanceSheetRequest request) {
        return attendance.save(UUID.fromString(jwt.getSubject()), academyId, groupId, trainingDate, request);
    }
}
