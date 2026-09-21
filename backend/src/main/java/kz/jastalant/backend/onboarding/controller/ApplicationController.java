package kz.jastalant.backend.onboarding.controller;

import kz.jastalant.backend.onboarding.dto.ApplicationView;
import kz.jastalant.backend.onboarding.entity.ApplicationStatus;
import kz.jastalant.backend.onboarding.service.ApplicationService;

import jakarta.validation.Valid;
import kz.jastalant.backend.onboarding.dto.ApplicationPage;
import kz.jastalant.backend.onboarding.dto.RejectionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ApplicationController {
    private final ApplicationService applications;

    @GetMapping("/api/applications/mine")
    public ApplicationView mine(@AuthenticationPrincipal Jwt jwt) {
        return applications.mine(UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/api/platform/applications")
    public ApplicationPage list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "PENDING") ApplicationStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return applications.list(UUID.fromString(jwt.getSubject()), status, page, size);
    }

    @PostMapping("/api/platform/applications/{id}/approve")
    public ApplicationView approve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return applications.approve(UUID.fromString(jwt.getSubject()), id);
    }

    @PostMapping("/api/platform/applications/{id}/reject")
    public ApplicationView reject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody RejectionRequest request) {
        return applications.reject(UUID.fromString(jwt.getSubject()), id, request.reason());
    }
}
