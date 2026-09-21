package kz.jastalant.backend.academy.controller;

import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.service.AcademyAccessService;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import kz.jastalant.backend.academy.dto.AcademyView;

@RestController
@RequiredArgsConstructor
public class AcademyController {
    private final AcademyAccessService access;
    @GetMapping("/api/academies/{id}")
    public AcademyView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return access.get(UUID.fromString(jwt.getSubject()), id);
    }
}
