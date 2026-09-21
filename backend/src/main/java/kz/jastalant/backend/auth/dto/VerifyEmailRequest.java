package kz.jastalant.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String token) {}
