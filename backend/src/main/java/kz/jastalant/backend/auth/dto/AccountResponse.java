package kz.jastalant.backend.auth.dto;

import kz.jastalant.backend.user.entity.PlatformRole;
import java.util.UUID;

public record AccountResponse(UUID id, String email, String fullName, boolean emailVerified, PlatformRole platformRole) {}
