package kz.jastalant.backend.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GroupRequest(@NotBlank @Size(max = 200) String name,
                           @NotBlank @Size(max = 30) String ageCategory) {}
