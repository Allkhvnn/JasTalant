package kz.jastalant.backend.academy.controller;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import kz.jastalant.backend.academy.dto.*;
import kz.jastalant.backend.academy.entity.AcademyStatus;
import kz.jastalant.backend.academy.service.PlatformAcademyService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/platform/academies")
@RequiredArgsConstructor
public class PlatformAcademyController {
    private final PlatformAcademyService academies;

    @GetMapping
    public PlatformAcademyPage list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) AcademyStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return academies.list(actor(jwt), status, search, page, size);
    }

    @GetMapping("/{academyId}")
    public PlatformAcademyView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId) {
        return academies.get(actor(jwt), academyId);
    }

    @PutMapping("/{academyId}/status")
    public PlatformAcademyView changeStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @Valid @RequestBody AcademyStatusUpdateRequest request) {
        return academies.changeStatus(actor(jwt), academyId, request);
    }

    private UUID actor(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
