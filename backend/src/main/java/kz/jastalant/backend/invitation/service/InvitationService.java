package kz.jastalant.backend.invitation.service;

import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.common.service.PageRequests;
import kz.jastalant.backend.common.service.TokenDigests;
import kz.jastalant.backend.invitation.dto.*;
import kz.jastalant.backend.invitation.entity.*;
import kz.jastalant.backend.invitation.mapper.InvitationMapper;
import kz.jastalant.backend.invitation.repository.AcademyInvitationRepository;
import kz.jastalant.backend.membership.entity.*;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.onboarding.repository.AcademyApplicationRepository;
import kz.jastalant.backend.parent.entity.ParentPlayer;
import kz.jastalant.backend.parent.repository.ParentPlayerRepository;
import kz.jastalant.backend.player.repository.PlayerRepository;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvitationService {
    private static final Set<AcademyRole> INVITABLE_ROLES = Set.of(AcademyRole.COACH, AcademyRole.PARENT);

    private final AcademyInvitationRepository invitations;
    private final AcademyRepository academies;
    private final AcademyMembershipRepository memberships;
    private final ParentPlayerRepository parentPlayers;
    private final PlayerRepository players;
    private final UserRepository users;
    private final AcademyApplicationRepository applications;
    private final AcademyPermissionService permissions;
    private final PasswordEncoder passwords;
    private final InvitationMailer mailer;
    private final Clock clock;

    @Transactional
    public InvitationResponse create(UUID actor, UUID academyId, CreateInvitationRequest request) {
        permissions.resolve(actor, academyId).requireManager();
        var academy = academies.findById(academyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
        Set<AcademyRole> roles = Set.copyOf(request.roles());
        Set<UUID> playerIds = request.playerIds() == null ? Set.of() : Set.copyOf(request.playerIds());
        validateInvitation(academyId, roles, playerIds);

        var now = clock.instant();
        String email = User.normalizeEmail(request.email());
        invitations.findByAcademyIdAndEmailAndStatus(academyId, email, InvitationStatus.PENDING)
                .ifPresent(existing -> {
                    if (!existing.isExpired(now)) {
                        throw new BusinessException(ErrorCode.CONFLICT, "An active invitation already exists for this email");
                    }
                    existing.revoke();
                    invitations.flush();
                });
        String token = TokenDigests.generate();
        var invitation = invitations.save(new AcademyInvitation(academyId,
                email, TokenDigests.hash(token), roles, playerIds,
                now.plus(72, ChronoUnit.HOURS), now, actor));
        invitations.flush();
        mailer.send(invitation.getEmail(), academy.getName(), token);
        return InvitationMapper.toResponse(invitation, now);
    }

    public PageResponse<InvitationResponse> list(UUID actor, UUID academyId, int page, int size) {
        permissions.resolve(actor, academyId).requireManager();
        var result = invitations.findAllByAcademyId(academyId, PageRequests.of(page, size));
        var now = clock.instant();
        return new PageResponse<>(result.map(item -> InvitationMapper.toResponse(item, now)).getContent(),
                page, size, result.getTotalElements());
    }

    @Transactional
    public InvitationResponse revoke(UUID actor, UUID academyId, UUID invitationId) {
        permissions.resolve(actor, academyId).requireManager();
        var invitation = invitations.lockByAcademyIdAndId(academyId, invitationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Invitation not found"));
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only pending invitations can be revoked");
        }
        invitation.revoke();
        return InvitationMapper.toResponse(invitation, clock.instant());
    }

    public InvitationPreviewResponse preview(String token) {
        var invitation = validPending(invitations.findByTokenHash(TokenDigests.hash(token))
                .orElseThrow(this::invalidToken));
        var academy = academies.findById(invitation.getAcademyId())
                .orElseThrow(this::invalidToken);
        return new InvitationPreviewResponse(academy.getName(), mask(invitation.getEmail()),
                Set.copyOf(invitation.getRoles()), invitation.getExpiresAt());
    }

    @Transactional
    public AcceptedMembershipResponse acceptExisting(UUID actor, String token) {
        var user = users.findById(actor)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
        return accept(user, token);
    }

    @Transactional
    public AcceptedMembershipResponse acceptNew(AcceptNewUserRequest request) {
        var invitation = lockValid(request.token());
        if (users.findByEmail(invitation.getEmail()).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "An account already exists; sign in to accept the invitation");
        }
        var user = new User(invitation.getEmail(), request.fullName(), passwords.encode(request.password()));
        user.confirmEmail();
        users.save(user);
        return acceptLocked(user, invitation);
    }

    private AcceptedMembershipResponse accept(User user, String token) {
        var invitation = lockValid(token);
        if (!invitation.getEmail().equals(user.getEmail())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Invitation belongs to another email address");
        }
        if (!user.isEmailVerified()) {
            user.confirmEmail();
            applications.findByApplicantId(user.getId()).ifPresent(application -> application.emailConfirmed());
        }
        return acceptLocked(user, invitation);
    }

    private AcceptedMembershipResponse acceptLocked(User user, AcademyInvitation invitation) {
        if (invitation.getRoles().contains(AcademyRole.PARENT) && invitation.getPlayerIds().isEmpty()) {
            throw new BusinessException(ErrorCode.CONFLICT, "The invited players are no longer available");
        }
        var academy = academies.findById(invitation.getAcademyId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
        var membership = memberships.findByAcademyIdAndUserId(invitation.getAcademyId(), user.getId())
                .orElseGet(() -> memberships.save(new AcademyMembership(academy, user,
                        invitation.getRoles().toArray(AcademyRole[]::new))));
        membership.addRoles(invitation.getRoles());
        memberships.flush();

        if (invitation.getRoles().contains(AcademyRole.PARENT)) {
            for (UUID playerId : invitation.getPlayerIds()) {
                if (!parentPlayers.existsByAcademyIdAndMembershipIdAndPlayerId(
                        invitation.getAcademyId(), membership.getId(), playerId)) {
                    parentPlayers.save(new ParentPlayer(invitation.getAcademyId(), membership, playerId));
                }
            }
            parentPlayers.flush();
        }
        invitation.accept(user.getId(), clock.instant());
        return new AcceptedMembershipResponse(invitation.getAcademyId(), user.getId(), Set.copyOf(membership.getRoles()));
    }

    private AcademyInvitation lockValid(String token) {
        return validPending(invitations.lockByTokenHash(TokenDigests.hash(token))
                .orElseThrow(this::invalidToken));
    }

    private AcademyInvitation validPending(AcademyInvitation invitation) {
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new BusinessException(ErrorCode.CONFLICT, "Invitation has already been used or revoked");
        }
        if (invitation.isExpired(clock.instant())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Invitation has expired");
        }
        return invitation;
    }

    private void validateInvitation(UUID academyId, Set<AcademyRole> roles, Set<UUID> playerIds) {
        if (roles.isEmpty() || !INVITABLE_ROLES.containsAll(roles)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Only COACH and PARENT can be invited");
        }
        if (roles.contains(AcademyRole.PARENT) != !playerIds.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "A parent invitation requires at least one player; coach-only invitations cannot contain players");
        }
        playerIds.forEach(playerId -> players.findByAcademyIdAndId(academyId, playerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Player not found")));
    }

    private BusinessException invalidToken() {
        return new BusinessException(ErrorCode.INVALID_REQUEST, "Invalid invitation token");
    }

    private static String mask(String email) {
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String visible = local.substring(0, Math.min(2, local.length()));
        return visible + "***" + email.substring(at);
    }
}
