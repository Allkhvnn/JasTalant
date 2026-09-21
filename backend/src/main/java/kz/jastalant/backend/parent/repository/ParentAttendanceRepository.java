package kz.jastalant.backend.parent.repository;

import kz.jastalant.backend.attendance.entity.AttendanceRecord;
import kz.jastalant.backend.parent.dto.ChildAttendanceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ParentAttendanceRepository extends Repository<AttendanceRecord, UUID> {
    @Query(value = """
            select new kz.jastalant.backend.parent.dto.ChildAttendanceResponse(
                session.id, session.trainingDate, group.id, group.name, record.status, record.comment)
            from AttendanceRecord record, AttendanceSession session, TrainingGroup group
            where record.academyId = :academyId
              and record.playerId = :playerId
              and session.id = record.sessionId
              and session.academyId = record.academyId
              and group.id = session.groupId
              and group.academyId = session.academyId
            order by session.trainingDate desc, session.id
            """, countQuery = """
            select count(record.id)
            from AttendanceRecord record, AttendanceSession session
            where record.academyId = :academyId
              and record.playerId = :playerId
              and session.id = record.sessionId
              and session.academyId = record.academyId
            """)
    Page<ChildAttendanceResponse> findHistory(
            @Param("academyId") UUID academyId,
            @Param("playerId") UUID playerId,
            Pageable pageable);
}
