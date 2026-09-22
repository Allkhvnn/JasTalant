package kz.jastalant.backend.auth.dto;

import jakarta.validation.constraints.*;

public record ResetPasswordRequest(@NotBlank @Size(max = 1000) String token,
                                   @NotBlank @Size(min = 12, max = 128) String password) {}
