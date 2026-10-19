package kz.jastalant.backend.audit.dto;

import kz.jastalant.backend.audit.entity.AuditAction;
import java.time.Instant;
import java.util.UUID;

public record AuditEventResponse(UUID id, UUID academyId, UUID actorId, String actorName,
        AuditAction action, UUID targetId, String targetName, Instant occurredAt) {}
