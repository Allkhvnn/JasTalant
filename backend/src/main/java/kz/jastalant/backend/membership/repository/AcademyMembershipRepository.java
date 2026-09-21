package kz.jastalant.backend.membership.repository;

import kz.jastalant.backend.membership.entity.AcademyMembership;
import kz.jastalant.backend.membership.entity.AcademyRole;

import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AcademyMembershipRepository extends Repository<AcademyMembership, UUID> {
    AcademyMembership save(AcademyMembership membership);
    void flush();
    Optional<AcademyMembership> findByAcademyIdAndUserId(UUID academyId, UUID userId);
    List<AcademyMembership> findAllByAcademyId(UUID academyId);

    @Query("select membership from AcademyMembership membership join fetch membership.academy "
            + "where membership.user.id = :userId order by membership.academy.name, membership.id")
    List<AcademyMembership> findAllByUserIdWithAcademy(@Param("userId") UUID userId);

    @Query("""
            select distinct membership
            from AcademyMembership membership
            join fetch membership.user user
            left join fetch membership.roles
            where membership.academy.id = :academyId
              and :role member of membership.roles
            order by user.fullName, user.id
            """)
    List<AcademyMembership> findAllByAcademyIdAndRoleWithUser(
            @Param("academyId") UUID academyId,
            @Param("role") AcademyRole role);
}
