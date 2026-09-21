package kz.jastalant.backend.group.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.group.dto.*;
import kz.jastalant.backend.group.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/groups")
@RequiredArgsConstructor
public class GroupController {
    private final GroupService groups;

    @GetMapping
    public PageResponse<GroupResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return groups.list(UUID.fromString(jwt.getSubject()), academyId, page, size);
    }

    @GetMapping("/{id}")
    public GroupResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id) {
        return groups.get(UUID.fromString(jwt.getSubject()), academyId, id);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @Valid @RequestBody GroupRequest request) {
        return groups.create(UUID.fromString(jwt.getSubject()), academyId, request);
    }

    @PutMapping("/{id}")
    public GroupResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id,
            @Valid @RequestBody GroupUpdateRequest request) {
        return groups.update(UUID.fromString(jwt.getSubject()), academyId, id, request);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id) {
        groups.delete(UUID.fromString(jwt.getSubject()), academyId, id);
    }

    @GetMapping("/{id}/coaches")
    public List<CoachResponse> coaches(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id) {
        return groups.coaches(UUID.fromString(jwt.getSubject()), academyId, id);
    }

    @PutMapping("/{id}/coaches/{userId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assign(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id, @PathVariable UUID userId) {
        groups.assignCoach(UUID.fromString(jwt.getSubject()), academyId, id, userId);
    }

    @DeleteMapping("/{id}/coaches/{userId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassign(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId, @PathVariable UUID id, @PathVariable UUID userId) {
        groups.unassignCoach(UUID.fromString(jwt.getSubject()), academyId, id, userId);
    }
}
