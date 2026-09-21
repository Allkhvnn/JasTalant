package kz.jastalant.backend.group.repository;

import kz.jastalant.backend.group.entity.GroupCoach;

import org.springframework.data.repository.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupCoachRepository extends Repository<GroupCoach, UUID> {
    GroupCoach save(GroupCoach coach);
    void flush();
    void delete(GroupCoach coach);
    boolean existsByAcademyIdAndGroupIdAndMembershipId(UUID academyId, UUID groupId, UUID membershipId);
    Optional<GroupCoach> findByAcademyIdAndGroupIdAndMembershipId(UUID academyId, UUID groupId, UUID membershipId);
    List<GroupCoach> findAllByAcademyIdAndGroupIdOrderById(UUID academyId, UUID groupId);
}
