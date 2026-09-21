package kz.jastalant.backend.player.repository;

import kz.jastalant.backend.group.entity.GroupCoach;
import kz.jastalant.backend.player.entity.Player;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import java.util.Optional;
import java.util.UUID;

public interface PlayerRepository extends Repository<Player, UUID> {
    Player save(Player player);
    void flush();
    void delete(Player player);
    Optional<Player> findByAcademyIdAndId(UUID academyId, UUID id);
    Page<Player> findAllByAcademyId(UUID academyId, Pageable pageable);
    Page<Player> findAllByAcademyIdAndGroupId(UUID academyId, UUID groupId, Pageable pageable);
    @Query("""
            select p from Player p where p.academyId = :academyId
            and exists (
                select c.id from GroupCoach c where c.academyId = :academyId
                and c.groupId = p.groupId and c.membership.id = :membershipId)
            """)
    Page<Player> findAssigned(UUID academyId, UUID membershipId, Pageable pageable);

    @Query("""
            select p from Player p where p.academyId = :academyId and p.groupId = :groupId
            and exists (select c.id from GroupCoach c where c.academyId = :academyId
                and c.groupId = p.groupId and c.membership.id = :membershipId)
            """)
    Page<Player> findAssignedInGroup(UUID academyId, UUID membershipId, UUID groupId, Pageable pageable);
}
