package kz.jastalant.backend.attendance.repository;

import kz.jastalant.backend.attendance.entity.AttendanceRecord;
import kz.jastalant.backend.attendance.entity.AttendanceStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AttendanceRecordRepository extends Repository<AttendanceRecord, UUID> {
    interface StatusCount {
        AttendanceStatus getStatus();
        long getRecordCount();
    }

    List<AttendanceRecord> saveAll(Iterable<AttendanceRecord> records);
    void flush();
    List<AttendanceRecord> findAllByAcademyIdAndSessionId(UUID academyId, UUID sessionId);

    @Query("""
            select record.status as status, count(record.id) as recordCount
            from AttendanceRecord record, AttendanceSession session
            where record.academyId = :academyId and session.id = record.sessionId
              and session.trainingDate between :from and :to
            group by record.status
            """)
    List<StatusCount> countByStatus(UUID academyId, LocalDate from, LocalDate to);

    @Query("""
            select record.status as status, count(record.id) as recordCount
            from AttendanceRecord record, AttendanceSession session
            where record.academyId = :academyId and session.id = record.sessionId
              and session.trainingDate between :from and :to
              and exists (select assignment.id from GroupCoach assignment
                  where assignment.academyId = :academyId
                    and assignment.groupId = session.groupId
                    and assignment.membership.id = :membershipId)
            group by record.status
            """)
    List<StatusCount> countAssignedByStatus(
            UUID academyId, UUID membershipId, LocalDate from, LocalDate to);
}
