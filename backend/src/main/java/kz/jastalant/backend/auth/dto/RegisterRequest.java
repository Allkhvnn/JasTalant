package kz.jastalant.backend.auth.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(@NotBlank @Size(max = 200) String academyName,
                              @NotBlank @Size(max = 200) String fullName,
                              @NotBlank @Email @Size(max = 254) String email,
                              @NotBlank @Size(min = 12, max = 128) String password) {}
