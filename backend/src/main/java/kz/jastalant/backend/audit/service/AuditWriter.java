package kz.jastalant.backend.audit.service;

import kz.jastalant.backend.audit.entity.AuditAction;
import kz.jastalant.backend.audit.entity.AuditEvent;
import kz.jastalant.backend.audit.repository.AuditEventRepository;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditWriter {
    private final AuditEventRepository events;
    private final UserRepository users;
    private final AcademyMembershipRepository memberships;
    private final Clock clock;

    /** Internal only: caller has already checked access, and supplies a specific safe label. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actor, UUID academyId, AuditAction action, UUID targetId, String targetName) {
        if (action.platform() != (academyId == null)) {
            throw new IllegalArgumentException("Audit action does not match scope");
        }
        var user = users.findById(actor).orElseThrow();
        String name = academyId == null ? user.getFullName()
                : memberships.findByAcademyIdAndUserId(academyId, actor)
                        .map(membership -> membership.effectiveName()).orElse(user.getFullName());
        String safeLabel = targetName == null ? "" : targetName.strip().codePoints().limit(300)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append).toString();
        events.save(new AuditEvent(academyId, actor, name, action, targetId, safeLabel, clock.instant()));
    }
}
