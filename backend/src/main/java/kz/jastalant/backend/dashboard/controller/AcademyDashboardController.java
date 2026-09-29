package kz.jastalant.backend.dashboard.controller;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import kz.jastalant.backend.dashboard.dto.AcademyDashboardResponse;
import kz.jastalant.backend.dashboard.service.AcademyDashboardService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/academies/{academyId}/dashboard")
@RequiredArgsConstructor
public class AcademyDashboardController {
    private final AcademyDashboardService dashboards;

    @GetMapping
    public AcademyDashboardResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId) {
        return dashboards.get(UUID.fromString(jwt.getSubject()), academyId);
    }
}
