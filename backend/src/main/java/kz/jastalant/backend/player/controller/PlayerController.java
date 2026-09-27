package kz.jastalant.backend.player.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.player.dto.*;
import kz.jastalant.backend.player.service.PlayerService;
import kz.jastalant.backend.player.service.PlayerFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/players")
@RequiredArgsConstructor
public class PlayerController {
    private final PlayerService players;
    private final PlayerFileService playerFiles;

    @GetMapping
    public PageResponse<PlayerResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam(required = false) UUID groupId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return players.list(UUID.fromString(jwt.getSubject()), academyId, groupId, page, size);
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> template(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam(defaultValue = "xlsx") String format) {
        return download(playerFiles.template(UUID.fromString(jwt.getSubject()), academyId, format));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam(defaultValue = "xlsx") String format) {
        return download(playerFiles.export(UUID.fromString(jwt.getSubject()), academyId, format));
    }

    @PostMapping(path = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PlayerImportResult importPlayers(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestPart("file") MultipartFile file, @RequestParam(defaultValue = "true") boolean dryRun) {
        return playerFiles.importPlayers(UUID.fromString(jwt.getSubject()), academyId, file, dryRun);
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

    @GetMapping("/{id}/avatar")
    public ResponseEntity<byte[]> avatar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @PathVariable UUID id) {
        var avatar = players.avatar(UUID.fromString(jwt.getSubject()), academyId, id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(avatar.contentType()))
                .cacheControl(CacheControl.noCache()).eTag("\"" + avatar.version() + "\"").body(avatar.bytes());
    }

    @PutMapping(path = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PlayerResponse updateAvatar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @PathVariable UUID id, @RequestParam long version, @RequestPart("file") MultipartFile file) {
        return players.updateAvatar(UUID.fromString(jwt.getSubject()), academyId, id, version, file);
    }

    @DeleteMapping("/{id}/avatar")
    public PlayerResponse removeAvatar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @PathVariable UUID id, @RequestParam long version) {
        return players.removeAvatar(UUID.fromString(jwt.getSubject()), academyId, id, version);
    }

    private ResponseEntity<byte[]> download(PlayerFile file) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.filename(), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .cacheControl(CacheControl.noStore()).body(file.bytes());
    }
}
