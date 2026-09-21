package kz.jastalant.backend.training.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.training.dto.*;
import kz.jastalant.backend.training.service.ScheduledTrainingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/trainings")
@RequiredArgsConstructor
public class ScheduledTrainingController {
    private final ScheduledTrainingService trainings;

    @GetMapping
    public List<ScheduledTrainingResponse> list(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID groupId) {
        return trainings.list(UUID.fromString(jwt.getSubject()), academyId, from, to, groupId);
    }

    @GetMapping("/{trainingId}")
    public ScheduledTrainingResponse get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID trainingId) {
        return trainings.get(UUID.fromString(jwt.getSubject()), academyId, trainingId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduledTrainingResponse create(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @Valid @RequestBody ScheduledTrainingRequest request) {
        return trainings.create(UUID.fromString(jwt.getSubject()), academyId, request);
    }

    @PutMapping("/{trainingId}")
    public ScheduledTrainingResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID trainingId,
            @Valid @RequestBody ScheduledTrainingUpdateRequest request) {
        return trainings.update(UUID.fromString(jwt.getSubject()), academyId, trainingId, request);
    }

    @DeleteMapping("/{trainingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID trainingId) {
        trainings.delete(UUID.fromString(jwt.getSubject()), academyId, trainingId);
    }
}
