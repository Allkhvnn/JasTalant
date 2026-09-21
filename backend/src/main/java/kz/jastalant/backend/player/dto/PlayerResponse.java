package kz.jastalant.backend.player.dto;

import java.time.LocalDate;
import java.util.UUID;

public record PlayerResponse(UUID id, UUID academyId, UUID groupId, String fullName,
                             LocalDate dateOfBirth, String parentName, String parentPhone,
                             String parentEmail, long version) {}
