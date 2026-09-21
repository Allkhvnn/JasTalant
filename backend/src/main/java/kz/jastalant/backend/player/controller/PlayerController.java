package kz.jastalant.backend.player.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.player.dto.*;
import kz.jastalant.backend.player.service.PlayerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/players")
@RequiredArgsConstructor
public class PlayerController {
    private final PlayerService players;

    @GetMapping
    public PageResponse<PlayerResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam(required = false) UUID groupId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return players.list(UUID.fromString(jwt.getSubject()), academyId, groupId, page, size);
    }

    @GetMapping("/{id}")
    public PlayerResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id) {
        return players.get(UUID.fromString(jwt.getSubject()), academyId, id);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public PlayerResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @Valid @RequestBody PlayerRequest request) {
        return players.create(UUID.fromString(jwt.getSubject()), academyId, request);
    }

    @PutMapping("/{id}")
    public PlayerResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id,
            @Valid @RequestBody PlayerUpdateRequest request) {
        return players.update(UUID.fromString(jwt.getSubject()), academyId, id, request);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id) {
        players.delete(UUID.fromString(jwt.getSubject()), academyId, id);
    }
}
