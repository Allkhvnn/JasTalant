package kz.jastalant.backend.audit.dto;

import java.util.UUID;

public record AuditActorResponse(UUID id, String name) {}
