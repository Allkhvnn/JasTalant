package kz.jastalant.backend.membership.repository;

import kz.jastalant.backend.membership.entity.AcademyMembership;

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
}
