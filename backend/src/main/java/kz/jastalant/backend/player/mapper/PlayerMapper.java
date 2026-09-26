package kz.jastalant.backend.player.mapper;

import kz.jastalant.backend.player.dto.*;
import kz.jastalant.backend.player.entity.Player;
import java.util.UUID;

public final class PlayerMapper {
    private PlayerMapper() {}
    public static Player toEntity(UUID academyId, PlayerRequest request) {
        return new Player(academyId, request.groupId(), request.fullName(), request.dateOfBirth(),
                request.parentName(), request.parentPhone(), request.parentEmail());
    }
    public static void update(Player player, PlayerRequest request) {
        player.update(request.groupId(), request.fullName(), request.dateOfBirth(),
                request.parentName(), request.parentPhone(), request.parentEmail());
    }
    public static PlayerResponse toResponse(Player player) {
        return new PlayerResponse(player.getId(), player.getAcademyId(), player.getGroupId(), player.getFullName(),
                player.getDateOfBirth(), player.getParentName(), player.getParentPhone(), player.getParentEmail(),
                player.hasAvatar(), player.getVersion());
    }
}
