package kz.jastalant.backend.parent.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.common.service.PageRequests;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.parent.entity.ParentPlayer;
import kz.jastalant.backend.parent.repository.ParentPlayerRepository;
import kz.jastalant.backend.player.dto.PlayerResponse;
import kz.jastalant.backend.player.mapper.PlayerMapper;
import kz.jastalant.backend.player.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ParentPlayerService {
    private final ParentPlayerRepository parentPlayers;
    private final PlayerRepository players;
    private final AcademyMembershipRepository memberships;
    private final AcademyPermissionService permissions;

    public PageResponse<PlayerResponse> myChildren(UUID actor, UUID academyId, int page, int size) {
        var scope = requireParent(actor, academyId);
        var result = parentPlayers.findPlayers(academyId, scope.membershipId(), PageRequests.of(page, size));
        return new PageResponse<>(result.map(PlayerMapper::toResponse).getContent(),
                page, size, result.getTotalElements());
    }

    public PlayerResponse myChild(UUID actor, UUID academyId, UUID playerId) {
        var scope = requireParent(actor, academyId);
        return parentPlayers.findPlayer(academyId, scope.membershipId(), playerId)
                .map(PlayerMapper::toResponse)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Player not found"));
    }

    @Transactional
    public void link(UUID actor, UUID academyId, UUID parentUserId, UUID playerId) {
        permissions.resolve(actor, academyId).requireManager();
        var membership = memberships.findByAcademyIdAndUserId(academyId, parentUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Parent not found in this academy"));
        if (!membership.getRoles().contains(AcademyRole.PARENT)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "The member must have the PARENT role");
        }
        players.findByAcademyIdAndId(academyId, playerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Player not found"));
        if (!parentPlayers.existsByAcademyIdAndMembershipIdAndPlayerId(academyId, membership.getId(), playerId)) {
            parentPlayers.save(new ParentPlayer(academyId, membership, playerId));
            parentPlayers.flush();
        }
    }

    @Transactional
    public void unlink(UUID actor, UUID academyId, UUID parentUserId, UUID playerId) {
        permissions.resolve(actor, academyId).requireManager();
        memberships.findByAcademyIdAndUserId(academyId, parentUserId).ifPresent(membership ->
                parentPlayers.findByAcademyIdAndMembershipIdAndPlayerId(academyId, membership.getId(), playerId)
                        .ifPresent(parentPlayers::delete));
        parentPlayers.flush();
    }

    private AcademyPermissionService.Scope requireParent(UUID actor, UUID academyId) {
        var scope = permissions.resolve(actor, academyId);
        if (!scope.roles().contains(AcademyRole.PARENT)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Parent access required");
        }
        return scope;
    }
}
