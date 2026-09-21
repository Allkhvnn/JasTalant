package kz.jastalant.backend.player.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;

public record PlayerRequest(
        @NotNull UUID groupId,
        @NotBlank @Size(max = 200) String fullName,
        @NotNull @Past LocalDate dateOfBirth,
        @Size(max = 200) String parentName,
        @Pattern(regexp = "[+0-9() .-]{7,30}") String parentPhone,
        @Email @Size(max = 254) String parentEmail) {}
