package kz.jastalant.backend.invitation.repository;

import jakarta.persistence.LockModeType;
import kz.jastalant.backend.invitation.entity.AcademyInvitation;
import kz.jastalant.backend.invitation.entity.InvitationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

public interface AcademyInvitationRepository extends Repository<AcademyInvitation, UUID> {
    AcademyInvitation save(AcademyInvitation invitation);
    void flush();
    Page<AcademyInvitation> findAllByAcademyId(UUID academyId, Pageable pageable);
    Optional<AcademyInvitation> findByAcademyIdAndId(UUID academyId, UUID id);
    Optional<AcademyInvitation> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AcademyInvitation> findByAcademyIdAndEmailAndStatus(
            UUID academyId, String email, InvitationStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from AcademyInvitation i where i.tokenHash = :tokenHash")
    Optional<AcademyInvitation> lockByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from AcademyInvitation i where i.academyId = :academyId and i.id = :id")
    Optional<AcademyInvitation> lockByAcademyIdAndId(UUID academyId, UUID id);
}
