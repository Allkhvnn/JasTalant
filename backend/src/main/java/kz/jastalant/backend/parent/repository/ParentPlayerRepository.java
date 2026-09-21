package kz.jastalant.backend.parent.repository;

import kz.jastalant.backend.parent.entity.ParentPlayer;
import kz.jastalant.backend.player.entity.Player;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

public interface ParentPlayerRepository extends Repository<ParentPlayer, UUID> {
    ParentPlayer save(ParentPlayer link);
    void delete(ParentPlayer link);
    void flush();
    boolean existsByAcademyIdAndMembershipIdAndPlayerId(UUID academyId, UUID membershipId, UUID playerId);
    Optional<ParentPlayer> findByAcademyIdAndMembershipIdAndPlayerId(UUID academyId, UUID membershipId, UUID playerId);

    @Query("""
            select p from Player p where p.academyId = :academyId and exists (
                select l.id from ParentPlayer l where l.academyId = :academyId
                and l.membership.id = :membershipId and l.playerId = p.id)
            """)
    Page<Player> findPlayers(UUID academyId, UUID membershipId, Pageable pageable);

    @Query("""
            select p from Player p where p.academyId = :academyId and p.id = :playerId and exists (
                select l.id from ParentPlayer l where l.academyId = :academyId
                and l.membership.id = :membershipId and l.playerId = p.id)
            """)
    Optional<Player> findPlayer(UUID academyId, UUID membershipId, UUID playerId);
}
