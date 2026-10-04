package kz.jastalant.backend.dashboard.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.attendance.entity.AttendanceStatus;
import kz.jastalant.backend.attendance.repository.AttendanceRecordRepository;
import kz.jastalant.backend.attendance.repository.AttendanceSessionRepository;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.dashboard.dto.AcademyDashboardResponse;
import kz.jastalant.backend.dashboard.dto.AgeDistributionItem;
import kz.jastalant.backend.dashboard.dto.AttendanceSummary;
import kz.jastalant.backend.group.repository.TrainingGroupRepository;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.player.repository.PlayerRepository;
import kz.jastalant.backend.training.entity.TrainingStatus;
import kz.jastalant.backend.training.repository.ScheduledTrainingRepository;
import kz.jastalant.backend.training.service.ScheduledTrainingService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AcademyDashboardService {
    private final AcademyPermissionService permissions;
    private final AcademyRepository academies;
    private final TrainingGroupRepository groups;
    private final PlayerRepository players;
    private final AcademyMembershipRepository memberships;
    private final ScheduledTrainingService trainings;
    private final ScheduledTrainingRepository trainingRepository;
    private final AttendanceSessionRepository attendanceSessions;
    private final AttendanceRecordRepository attendanceRecords;
    private final Clock clock;

    public AcademyDashboardResponse get(UUID actor, UUID academyId) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        var academy = academies.findById(academyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
        boolean manager = scope.manager();
        long groupCount = manager ? groups.countByAcademyId(academyId)
                : groups.countAssigned(academyId, scope.membershipId());
        long playerCount = manager ? players.countByAcademyId(academyId)
                : players.countAssigned(academyId, scope.membershipId());
        var distribution = (manager ? players.countByBirthYear(academyId)
                : players.countAssignedByBirthYear(academyId, scope.membershipId())).stream()
                .map(item -> new AgeDistributionItem(item.getBirthYear(), item.getPlayerCount()))
                .toList();
        LocalDate today = LocalDate.now(clock);
        var upcoming = trainings.list(actor, academyId, today, today.plusDays(7), null).stream()
                .filter(training -> training.status() == TrainingStatus.SCHEDULED)
                .toList();
        Long coachCount = manager
                ? memberships.countActiveByAcademyIdAndRole(academyId, AcademyRole.COACH)
                : null;
        var attendance = attendance(scope, academyId, today);
        return new AcademyDashboardResponse(academyId, academy.getName(), scope.roles(), groupCount,
                playerCount, coachCount, upcoming.size(), attendance, distribution,
                upcoming.stream().limit(4).toList());
    }

    private AttendanceSummary attendance(AcademyPermissionService.Scope scope, UUID academyId, LocalDate today) {
        LocalDate periodStart = today.minusDays(29);
        var counts = (scope.manager()
                ? attendanceRecords.countByStatus(academyId, periodStart, today)
                : attendanceRecords.countAssignedByStatus(
                        academyId, scope.membershipId(), periodStart, today));
        long present = statusCount(counts, AttendanceStatus.PRESENT);
        long late = statusCount(counts, AttendanceStatus.LATE);
        long absent = statusCount(counts, AttendanceStatus.ABSENT);
        long excused = statusCount(counts, AttendanceStatus.EXCUSED);
        long total = present + late + absent + excused;
        int rate = total == 0 ? 0 : (int) Math.round((present + late) * 100.0 / total);
        long sessions = scope.manager()
                ? attendanceSessions.countInPeriod(academyId, periodStart, today)
                : attendanceSessions.countAssignedInPeriod(
                        academyId, scope.membershipId(), periodStart, today);
        LocalDate missingFrom = today.minusDays(7);
        long pending = scope.manager()
                ? trainingRepository.countWithoutAttendance(
                        academyId, TrainingStatus.SCHEDULED, missingFrom, today)
                : trainingRepository.countAssignedWithoutAttendance(
                        academyId, scope.membershipId(), TrainingStatus.SCHEDULED, missingFrom, today);
        return new AttendanceSummary(periodStart, today, sessions, total, present, late,
                absent, excused, rate, pending);
    }

    private long statusCount(
            java.util.List<AttendanceRecordRepository.StatusCount> counts, AttendanceStatus status) {
        return counts.stream()
                .filter(count -> count.getStatus() == status)
                .mapToLong(AttendanceRecordRepository.StatusCount::getRecordCount)
                .findFirst()
                .orElse(0);
    }
}
