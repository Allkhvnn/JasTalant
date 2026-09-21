package kz.jastalant.backend.invitation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AcceptNewUserRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String token,
        @NotBlank @Size(max = 200) String fullName,
        @NotBlank @Size(min = 12, max = 128) String password) {}
