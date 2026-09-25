package kz.jastalant.backend.academy.dto;

import java.util.UUID;

public record PlatformAcademyAdminView(UUID userId, String fullName, String email) {}
