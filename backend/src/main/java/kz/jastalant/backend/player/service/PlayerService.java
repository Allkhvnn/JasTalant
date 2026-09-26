package kz.jastalant.backend.player.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.common.exception.*;
import kz.jastalant.backend.common.service.PageRequests;
import kz.jastalant.backend.group.service.GroupService;
import kz.jastalant.backend.player.dto.*;
import kz.jastalant.backend.player.entity.Player;
import kz.jastalant.backend.player.mapper.PlayerMapper;
import kz.jastalant.backend.player.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;
import kz.jastalant.backend.common.dto.AvatarData;
import kz.jastalant.backend.common.service.AvatarFiles;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlayerService {
    private final PlayerRepository players;
    private final GroupService groups;
    private final AcademyPermissionService permissions;
    private final AvatarFiles avatarFiles;

    public PageResponse<PlayerResponse> list(UUID actor, UUID academyId, UUID groupId, int page, int size) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        if (groupId != null) groups.requireVisible(scope, academyId, groupId);
        var pageable = PageRequests.of(page, size);
        var result = !scope.manager() ? (groupId == null ? players.findAssigned(academyId, scope.membershipId(), pageable)
                : players.findAssignedInGroup(academyId, scope.membershipId(), groupId, pageable))
                : groupId == null ? players.findAllByAcademyId(academyId, pageable)
                : players.findAllByAcademyIdAndGroupId(academyId, groupId, pageable);
        return new PageResponse<>(result.map(PlayerMapper::toResponse).getContent(), page, size, result.getTotalElements());
    }

    public PlayerResponse get(UUID actor, UUID academyId, UUID id) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        var player = find(academyId, id);
        groups.requireVisible(scope, academyId, player.getGroupId());
        return PlayerMapper.toResponse(player);
    }

    @Transactional
    public PlayerResponse create(UUID actor, UUID academyId, PlayerRequest request) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireManager();
        groups.requireVisible(scope, academyId, request.groupId());
        var player = players.save(PlayerMapper.toEntity(academyId, request));
        players.flush();
        return PlayerMapper.toResponse(player);
    }

    @Transactional
    public PlayerResponse update(UUID actor, UUID academyId, UUID id, PlayerUpdateRequest request) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireManager();
        var player = find(academyId, id);
        if (player.getVersion() != request.version()) throw new BusinessException(ErrorCode.CONFLICT, "Player has changed; reload it");
        groups.requireVisible(scope, academyId, request.details().groupId());
        PlayerMapper.update(player, request.details());
        players.flush();
        return PlayerMapper.toResponse(player);
    }

    @Transactional
    public void delete(UUID actor, UUID academyId, UUID id) {
        permissions.resolve(actor, academyId).requireManager();
        players.delete(find(academyId, id));
        players.flush();
    }

    public AvatarData avatar(UUID actor, UUID academyId, UUID id) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        var player = find(academyId, id);
        groups.requireVisible(scope, academyId, player.getGroupId());
        if (!player.hasAvatar()) throw new BusinessException(ErrorCode.NOT_FOUND, "Avatar not found");
        return new AvatarData(player.getAvatarData(), player.getAvatarContentType(), player.getVersion());
    }

    @Transactional
    public PlayerResponse updateAvatar(UUID actor, UUID academyId, UUID id, long version, MultipartFile file) {
        permissions.resolve(actor, academyId).requireManager();
        var player = find(academyId, id);
        requireVersion(player, version);
        var avatar = avatarFiles.read(file);
        player.updateAvatar(avatar.bytes(), avatar.contentType());
        players.flush();
        return PlayerMapper.toResponse(player);
    }

    @Transactional
    public PlayerResponse removeAvatar(UUID actor, UUID academyId, UUID id, long version) {
        permissions.resolve(actor, academyId).requireManager();
        var player = find(academyId, id);
        requireVersion(player, version);
        player.removeAvatar();
        players.flush();
        return PlayerMapper.toResponse(player);
    }

    private void requireVersion(Player player, long version) {
        if (player.getVersion() != version) {
            throw new BusinessException(ErrorCode.CONFLICT, "Player has changed; reload it");
        }
    }

    private Player find(UUID academyId, UUID id) {
        return players.findByAcademyIdAndId(academyId, id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Player not found"));
    }
}
