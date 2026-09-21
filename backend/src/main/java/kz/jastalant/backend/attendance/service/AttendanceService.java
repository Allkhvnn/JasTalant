package kz.jastalant.backend.attendance.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.attendance.dto.AttendanceMarkRequest;
import kz.jastalant.backend.attendance.dto.AttendancePlayerResponse;
import kz.jastalant.backend.attendance.dto.AttendanceSheetRequest;
import kz.jastalant.backend.attendance.dto.AttendanceSheetResponse;
import kz.jastalant.backend.attendance.entity.AttendanceRecord;
import kz.jastalant.backend.attendance.entity.AttendanceSession;
import kz.jastalant.backend.attendance.repository.AttendanceRecordRepository;
import kz.jastalant.backend.attendance.repository.AttendanceSessionRepository;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.group.service.GroupService;
import kz.jastalant.backend.player.entity.Player;
import kz.jastalant.backend.player.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendanceService {
    private final AttendanceSessionRepository sessions;
    private final AttendanceRecordRepository records;
    private final PlayerRepository players;
    private final GroupService groups;
    private final AcademyPermissionService permissions;
    private final Clock clock;

    public AttendanceSheetResponse get(UUID actor, UUID academyId, UUID groupId, LocalDate trainingDate) {
        validateDate(trainingDate);
        var roster = visibleRoster(actor, academyId, groupId);
        var session = sessions.findByAcademyIdAndGroupIdAndTrainingDate(academyId, groupId, trainingDate)
                .orElse(null);
        return response(academyId, groupId, trainingDate, roster, session);
    }

    @Transactional
    public AttendanceSheetResponse save(UUID actor, UUID academyId, UUID groupId, LocalDate trainingDate,
                                        AttendanceSheetRequest request) {
        validateDate(trainingDate);
        var roster = visibleRoster(actor, academyId, groupId);
        if (roster.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "The group has no players");
        }

        Map<UUID, AttendanceMarkRequest> requested = new LinkedHashMap<>();
        for (var mark : request.records()) {
            if (requested.put(mark.playerId(), mark) != null) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "Each player can be marked only once");
            }
        }
        Set<UUID> rosterIds = roster.stream().map(Player::getId).collect(Collectors.toSet());
        if (!requested.keySet().equals(rosterIds)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Attendance must include every player in the group");
        }

        var existing = sessions.lockByAcademyIdAndGroupIdAndTrainingDate(academyId, groupId, trainingDate);
        boolean created = existing.isEmpty();
        var session = existing.orElseGet(() -> sessions.save(
                new AttendanceSession(academyId, groupId, trainingDate, clock.instant())));
        sessions.flush();
        if (session.getVersion() != request.version()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Attendance has changed; reload it before saving");
        }

        Map<UUID, AttendanceRecord> stored = records
                .findAllByAcademyIdAndSessionId(academyId, session.getId()).stream()
                .collect(Collectors.toMap(AttendanceRecord::getPlayerId, Function.identity()));
        List<AttendanceRecord> changed = roster.stream().map(player -> {
            var mark = requested.get(player.getId());
            var record = stored.get(player.getId());
            if (record == null) {
                return new AttendanceRecord(academyId, session.getId(), player.getId(), mark.status(), mark.comment());
            }
            record.update(mark.status(), mark.comment());
            return record;
        }).toList();
        records.saveAll(changed);
        records.flush();
        if (!created) {
            session.touch(clock.instant());
            sessions.flush();
        }
        return response(academyId, groupId, trainingDate, roster, session);
    }

    private List<Player> visibleRoster(UUID actor, UUID academyId, UUID groupId) {
        var scope = permissions.resolve(actor, academyId);
        groups.requireVisible(scope, academyId, groupId);
        return players.findAllByAcademyIdAndGroupIdOrderByFullNameAscIdAsc(academyId, groupId);
    }

    private AttendanceSheetResponse response(UUID academyId, UUID groupId, LocalDate trainingDate,
                                             List<Player> roster, AttendanceSession session) {
        Map<UUID, AttendanceRecord> marks = session == null ? Map.of() : records
                .findAllByAcademyIdAndSessionId(academyId, session.getId()).stream()
                .collect(Collectors.toMap(AttendanceRecord::getPlayerId, Function.identity()));
        var items = roster.stream().map(player -> {
            var mark = marks.get(player.getId());
            return new AttendancePlayerResponse(player.getId(), player.getFullName(),
                    mark == null ? null : mark.getStatus(), mark == null ? null : mark.getComment());
        }).toList();
        return new AttendanceSheetResponse(session == null ? null : session.getId(), academyId, groupId,
                trainingDate, session == null ? 0 : session.getVersion(), session != null, items);
    }

    private void validateDate(LocalDate trainingDate) {
        if (trainingDate.isAfter(LocalDate.now(clock))) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Attendance cannot be recorded for a future date");
        }
    }
}
