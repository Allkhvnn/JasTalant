package kz.jastalant.backend.attendance.repository;

import kz.jastalant.backend.attendance.entity.AttendanceRecord;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.UUID;

public interface AttendanceRecordRepository extends Repository<AttendanceRecord, UUID> {
    List<AttendanceRecord> saveAll(Iterable<AttendanceRecord> records);
    void flush();
    List<AttendanceRecord> findAllByAcademyIdAndSessionId(UUID academyId, UUID sessionId);
}
