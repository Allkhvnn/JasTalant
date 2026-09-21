package kz.jastalant.backend.training.repository;

import kz.jastalant.backend.training.entity.ScheduledTraining;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduledTrainingRepository extends Repository<ScheduledTraining, UUID> {
    ScheduledTraining save(ScheduledTraining training);
    void delete(ScheduledTraining training);
    void flush();
    Optional<ScheduledTraining> findByAcademyIdAndId(UUID academyId, UUID id);
    List<ScheduledTraining> findAllByAcademyIdAndTrainingDateBetweenOrderByTrainingDateAscStartTimeAscIdAsc(
            UUID academyId, LocalDate from, LocalDate to);
    List<ScheduledTraining> findAllByAcademyIdAndGroupIdAndTrainingDateBetweenOrderByTrainingDateAscStartTimeAscIdAsc(
            UUID academyId, UUID groupId, LocalDate from, LocalDate to);

    @Query("""
            select training from ScheduledTraining training
            where training.academyId = :academyId
              and training.trainingDate between :from and :to
              and exists (select assignment.id from GroupCoach assignment
                  where assignment.academyId = :academyId
                    and assignment.groupId = training.groupId
                    and assignment.membership.id = :membershipId)
            order by training.trainingDate, training.startTime, training.id
            """)
    List<ScheduledTraining> findAssigned(
            UUID academyId, UUID membershipId, LocalDate from, LocalDate to);

    boolean existsByAcademyIdAndGroupIdAndTrainingDateAndStartTime(
            UUID academyId, UUID groupId, LocalDate trainingDate, LocalTime startTime);
    boolean existsByAcademyIdAndGroupIdAndTrainingDateAndStartTimeAndIdNot(
            UUID academyId, UUID groupId, LocalDate trainingDate, LocalTime startTime, UUID id);
}
