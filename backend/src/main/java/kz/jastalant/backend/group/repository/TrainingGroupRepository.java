package kz.jastalant.backend.group.repository;

import kz.jastalant.backend.group.entity.GroupCoach;
import kz.jastalant.backend.group.entity.TrainingGroup;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import java.util.Optional;
import java.util.UUID;

public interface TrainingGroupRepository extends Repository<TrainingGroup, UUID> {
    TrainingGroup save(TrainingGroup group);
    void flush();
    void delete(TrainingGroup group);
    Optional<TrainingGroup> findByAcademyIdAndId(UUID academyId, UUID id);
    Page<TrainingGroup> findAllByAcademyId(UUID academyId, Pageable pageable);
    long countByAcademyId(UUID academyId);
    @Query("""
            select g from TrainingGroup g where g.academyId = :academyId and exists (
                select c.id from GroupCoach c where c.academyId = :academyId
                and c.groupId = g.id and c.membership.id = :membershipId)
            """)
    Page<TrainingGroup> findAssigned(UUID academyId, UUID membershipId, Pageable pageable);
}
