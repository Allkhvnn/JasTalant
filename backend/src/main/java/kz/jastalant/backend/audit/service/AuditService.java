package kz.jastalant.backend.audit.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.audit.dto.AuditActorResponse;
import kz.jastalant.backend.audit.dto.AuditEventResponse;
import kz.jastalant.backend.audit.entity.AuditAction;
import kz.jastalant.backend.audit.entity.AuditEvent;
import kz.jastalant.backend.audit.repository.AuditEventRepository;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.common.service.PageRequests;
import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditService {
    private final AuditEventRepository events;
    private final AcademyPermissionService permissions;
    private final UserRepository users;

    public PageResponse<AuditEventResponse> list(UUID actor, UUID academyId, AuditAction action, UUID author,
            Instant from, Instant until, int page, int size) {
        requireAccess(actor, academyId);
        if (from != null && until != null && !from.isBefore(until)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Audit start must be before end");
        }
        var pageable = PageRequests.of(page, size, Sort.by(Sort.Order.desc("occurredAt"), Sort.Order.desc("id")));
        Specification<AuditEvent> scope = (root, query, builder) -> academyId == null
                ? builder.isNull(root.get("academyId")) : builder.equal(root.get("academyId"), academyId);
        if (action != null) scope = scope.and((root, query, builder) -> builder.equal(root.get("action"), action));
        if (author != null) scope = scope.and((root, query, builder) -> builder.equal(root.get("actorId"), author));
        if (from != null) scope = scope.and((root, query, builder) -> builder.greaterThanOrEqualTo(root.get("occurredAt"), from));
        if (until != null) scope = scope.and((root, query, builder) -> builder.lessThan(root.get("occurredAt"), until));
        var result = events.findAll(scope, pageable);
        return new PageResponse<>(result.map(event -> new AuditEventResponse(event.getId(), event.getAcademyId(),
                event.getActorId(), event.getActorName(), event.getAction(), event.getTargetId(), event.getTargetName(),
                event.getOccurredAt())).getContent(), page, size, result.getTotalElements());
    }

    public List<AuditActorResponse> actors(UUID actor, UUID academyId) {
        requireAccess(actor, academyId);
        return (academyId == null ? events.platformActors() : events.academyActors(academyId)).stream()
                .map(value -> new AuditActorResponse(value.getActorId(), value.getActorName()))
                .sorted(Comparator.comparing(AuditActorResponse::name).thenComparing(AuditActorResponse::id)).toList();
    }

    private void requireAccess(UUID actor, UUID academyId) {
        if (academyId != null) {
            permissions.resolve(actor, academyId).requireManager();
        } else {
            var user = users.findById(actor).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
            if (!user.isEmailVerified() || user.getPlatformRole() != PlatformRole.SUPER_ADMIN) {
                throw new BusinessException(ErrorCode.FORBIDDEN);
            }
        }
    }
}
