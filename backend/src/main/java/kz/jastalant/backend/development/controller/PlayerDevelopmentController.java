package kz.jastalant.backend.development.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.development.dto.*;
import kz.jastalant.backend.development.service.PlayerDevelopmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/players/{playerId}/development-assessments")
@RequiredArgsConstructor
public class PlayerDevelopmentController {
    private final PlayerDevelopmentService development;

    @GetMapping
    public PageResponse<DevelopmentAssessmentResponse> list(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID playerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return development.list(UUID.fromString(jwt.getSubject()), academyId, playerId, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DevelopmentAssessmentResponse create(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID playerId,
            @Valid @RequestBody DevelopmentAssessmentRequest request) {
        return development.create(UUID.fromString(jwt.getSubject()), academyId, playerId, request);
    }

    @PutMapping("/{assessmentId}")
    public DevelopmentAssessmentResponse update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID playerId,
            @PathVariable UUID assessmentId, @Valid @RequestBody DevelopmentAssessmentUpdateRequest request) {
        return development.update(UUID.fromString(jwt.getSubject()), academyId, playerId, assessmentId, request);
    }

    @DeleteMapping("/{assessmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID playerId,
            @PathVariable UUID assessmentId) {
        development.delete(UUID.fromString(jwt.getSubject()), academyId, playerId, assessmentId);
    }
}
