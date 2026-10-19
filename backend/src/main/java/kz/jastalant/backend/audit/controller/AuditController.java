package kz.jastalant.backend.audit.controller;

import kz.jastalant.backend.audit.dto.AuditActorResponse;
import kz.jastalant.backend.audit.dto.AuditEventResponse;
import kz.jastalant.backend.audit.entity.AuditAction;
import kz.jastalant.backend.audit.service.AuditService;
import kz.jastalant.backend.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AuditController {
    private final AuditService audit;

    @GetMapping({"/api/academies/{academyId}/audit", "/api/platform/audit"})
    public PageResponse<AuditEventResponse> list(@AuthenticationPrincipal Jwt jwt,
            @PathVariable(required = false) UUID academyId,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant until,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return audit.list(UUID.fromString(jwt.getSubject()), academyId, action, actorId, from, until, page, size);
    }

    @GetMapping({"/api/academies/{academyId}/audit/actors", "/api/platform/audit/actors"})
    public List<AuditActorResponse> actors(@AuthenticationPrincipal Jwt jwt, @PathVariable(required = false) UUID academyId) {
        return audit.actors(UUID.fromString(jwt.getSubject()), academyId);
    }
}
