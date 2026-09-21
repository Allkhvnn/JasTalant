package kz.jastalant.backend.group.dto;

import java.util.UUID;

public record GroupResponse(UUID id, UUID academyId, String name, String ageCategory, long version) {}
