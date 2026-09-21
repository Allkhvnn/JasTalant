package kz.jastalant.backend.parent.controller;

import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.development.dto.DevelopmentAssessmentResponse;
import kz.jastalant.backend.parent.dto.ChildAttendanceResponse;
import kz.jastalant.backend.parent.service.ParentPlayerService;
import kz.jastalant.backend.player.dto.PlayerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}")
@RequiredArgsConstructor
public class ParentPlayerController {
    private final ParentPlayerService parentPlayers;

    @GetMapping("/parent/players")
    public PageResponse<PlayerResponse> myChildren(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return parentPlayers.myChildren(UUID.fromString(jwt.getSubject()), academyId, page, size);
    }

    @GetMapping("/parent/players/{playerId}")
    public PlayerResponse myChild(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
                                  @PathVariable UUID playerId) {
        return parentPlayers.myChild(UUID.fromString(jwt.getSubject()), academyId, playerId);
    }

    @GetMapping("/parent/players/{playerId}/attendance")
    public PageResponse<ChildAttendanceResponse> myChildAttendance(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID academyId,
            @PathVariable UUID playerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return parentPlayers.myChildAttendance(
                UUID.fromString(jwt.getSubject()), academyId, playerId, page, size);
    }

    @GetMapping("/parent/players/{playerId}/development-assessments")
    public PageResponse<DevelopmentAssessmentResponse> myChildDevelopment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID academyId,
            @PathVariable UUID playerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return parentPlayers.myChildDevelopment(
                UUID.fromString(jwt.getSubject()), academyId, playerId, page, size);
    }

    @PutMapping("/parents/{parentUserId}/players/{playerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void link(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
                     @PathVariable UUID parentUserId, @PathVariable UUID playerId) {
        parentPlayers.link(UUID.fromString(jwt.getSubject()), academyId, parentUserId, playerId);
    }

    @DeleteMapping("/parents/{parentUserId}/players/{playerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlink(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
                       @PathVariable UUID parentUserId, @PathVariable UUID playerId) {
        parentPlayers.unlink(UUID.fromString(jwt.getSubject()), academyId, parentUserId, playerId);
    }
}
