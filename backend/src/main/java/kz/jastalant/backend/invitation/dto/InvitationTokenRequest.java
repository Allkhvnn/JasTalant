package kz.jastalant.backend.invitation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record InvitationTokenRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String token) {}
