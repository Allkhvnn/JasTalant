package kz.jastalant.backend.onboarding.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResubmitApplicationRequest(@NotBlank @Size(max = 200) String academyName) {}
