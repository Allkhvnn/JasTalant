package kz.jastalant.backend.attendance.repository;

import jakarta.persistence.LockModeType;
import kz.jastalant.backend.attendance.entity.AttendanceSession;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceSessionRepository extends Repository<AttendanceSession, UUID> {
    AttendanceSession save(AttendanceSession session);
    void flush();

    Optional<AttendanceSession> findByAcademyIdAndGroupIdAndTrainingDateAndTrainingIdIsNull(
            UUID academyId, UUID groupId, LocalDate trainingDate);

    Optional<AttendanceSession> findByAcademyIdAndTrainingId(UUID academyId, UUID trainingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select session from AttendanceSession session
            where session.academyId = :academyId
              and session.groupId = :groupId
              and session.trainingDate = :trainingDate
              and session.trainingId is null
            """)
    Optional<AttendanceSession> lockByAcademyIdAndGroupIdAndTrainingDate(
            @Param("academyId") UUID academyId,
            @Param("groupId") UUID groupId,
            @Param("trainingDate") LocalDate trainingDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select session from AttendanceSession session
            where session.academyId = :academyId
              and session.trainingId = :trainingId
            """)
    Optional<AttendanceSession> lockByAcademyIdAndTrainingId(
            @Param("academyId") UUID academyId,
            @Param("trainingId") UUID trainingId);
}
