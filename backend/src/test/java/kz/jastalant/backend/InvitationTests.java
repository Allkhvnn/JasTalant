package kz.jastalant.backend;

import com.jayway.jsonpath.JsonPath;
import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.group.entity.TrainingGroup;
import kz.jastalant.backend.group.repository.TrainingGroupRepository;
import kz.jastalant.backend.membership.entity.*;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.player.entity.Player;
import kz.jastalant.backend.player.repository.PlayerRepository;
import kz.jastalant.backend.security.JwtService;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class InvitationTests {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AcademyRepository academies;
    @Autowired UserRepository users;
    @Autowired AcademyMembershipRepository memberships;
    @Autowired TrainingGroupRepository groups;
    @Autowired PlayerRepository players;
    @Autowired JwtService jwt;
    @Autowired PasswordEncoder passwords;
    @MockitoBean JavaMailSender mail;

    Academy academyA;
    Academy academyB;
    User adminA;
    User adminB;
    Player childA;
    Player otherChildA;
    Player childB;
    String adminTokenA;
    String adminTokenB;

    @BeforeEach
    void fixtures() {
        jdbc.execute("delete from parent_players");
        jdbc.execute("delete from academy_invitations");
        jdbc.execute("delete from attendance_records");
        jdbc.execute("delete from attendance_sessions");
        jdbc.execute("delete from players");
        jdbc.execute("delete from training_groups");
        jdbc.execute("delete from academy_applications");
        jdbc.execute("delete from academy_memberships");
        jdbc.execute("delete from academies");
        jdbc.execute("delete from password_reset_tokens");
        jdbc.execute("delete from auth_refresh_tokens");
        jdbc.execute("delete from app_users");
        reset(mail);

        academyA = academies.save(new Academy("Academy A"));
        academyB = academies.save(new Academy("Academy B"));
        adminA = member(academyA, "admin-a", AcademyRole.ADMIN);
        adminB = member(academyB, "admin-b", AcademyRole.ADMIN);
        adminTokenA = bearer(adminA);
        adminTokenB = bearer(adminB);

        var groupA = groups.save(new TrainingGroup(academyA.getId(), "A U10", "U10"));
        var groupB = groups.save(new TrainingGroup(academyB.getId(), "B U10", "U10"));
        childA = players.save(new Player(academyA.getId(), groupA.getId(), "Child A",
                LocalDate.of(2015, 1, 1), null, null, null));
        otherChildA = players.save(new Player(academyA.getId(), groupA.getId(), "Other Child A",
                LocalDate.of(2014, 1, 1), null, null, null));
        childB = players.save(new Player(academyB.getId(), groupB.getId(), "Child B",
                LocalDate.of(2015, 2, 1), null, null, null));
        players.flush();
    }

    @Test
    void newParentAcceptsInvitationAndSeesOnlyLinkedChild() throws Exception {
        String invitationId = invite(adminTokenA, academyA, "new-parent@example.kz", "PARENT", childA.getId());
        String token = invitationToken();
        assertThat(jdbc.queryForObject("select token_hash from academy_invitations where id = ?", String.class,
                UUID.fromString(invitationId))).hasSize(64).isNotEqualTo(token);

        mvc.perform(post("/api/invitations/preview").contentType(MediaType.APPLICATION_JSON)
                        .content(tokenJson(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.academyName").value("Academy A"))
                .andExpect(jsonPath("$.maskedEmail").value("ne***@example.kz"))
                .andExpect(jsonPath("$.roles[0]").value("PARENT"));

        mvc.perform(post("/api/invitations/accept-new").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"fullName\":\"New Parent\","
                                + "\"password\":\"A-long-parent-password-42\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.academyId").value(academyA.getId().toString()))
                .andExpect(jsonPath("$.roles[0]").value("PARENT"));

        var parent = users.findByEmail("new-parent@example.kz").orElseThrow();
        assertThat(parent.isEmailVerified()).isTrue();
        assertThat(passwords.matches("A-long-parent-password-42", parent.getPasswordHash())).isTrue();
        String parentToken = bearer(parent);
        mvc.perform(get(base(academyA) + "/parent/players").header("Authorization", parentToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].id").value(childA.getId().toString()));
        mvc.perform(get(base(academyA) + "/parent/players/" + childA.getId()).header("Authorization", parentToken))
                .andExpect(status().isOk());

        UUID attendanceSession = UUID.randomUUID();
        jdbc.update("""
                insert into attendance_sessions (id, academy_id, group_id, training_date)
                values (?, ?, ?, ?)
                """, attendanceSession, academyA.getId(), childA.getGroupId(), LocalDate.now().minusDays(1));
        jdbc.update("""
                insert into attendance_records (id, academy_id, session_id, player_id, status, comment)
                values (?, ?, ?, ?, 'PRESENT', 'Хорошая тренировка')
                """, UUID.randomUUID(), academyA.getId(), attendanceSession, childA.getId());
        jdbc.update("""
                insert into attendance_records (id, academy_id, session_id, player_id, status)
                values (?, ?, ?, ?, 'ABSENT')
                """, UUID.randomUUID(), academyA.getId(), attendanceSession, otherChildA.getId());

        mvc.perform(get(base(academyA) + "/parent/players/" + childA.getId() + "/attendance")
                        .header("Authorization", parentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].status").value("PRESENT"))
                .andExpect(jsonPath("$.items[0].groupName").value("A U10"))
                .andExpect(jsonPath("$.items[0].comment").value("Хорошая тренировка"));
        mvc.perform(get(base(academyA) + "/parent/players/" + otherChildA.getId() + "/attendance")
                        .header("Authorization", parentToken))
                .andExpect(status().isNotFound());
        mvc.perform(get(base(academyA) + "/parent/players/" + otherChildA.getId()).header("Authorization", parentToken))
                .andExpect(status().isNotFound());
        mvc.perform(get(base(academyB) + "/parent/players/" + childB.getId()).header("Authorization", parentToken))
                .andExpect(status().isNotFound());
        mvc.perform(get(base(academyA) + "/players").header("Authorization", parentToken))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/invitations/accept-new").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"fullName\":\"Again\","
                                + "\"password\":\"A-long-parent-password-42\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void existingUserMustMatchEmailAndReceivesCoachRole() throws Exception {
        var coach = user("coach@example.kz", "Coach");
        var wrongUser = user("wrong@example.kz", "Wrong");
        invite(adminTokenA, academyA, coach.getEmail(), "COACH", null);
        String token = invitationToken();

        mvc.perform(post("/api/invitations/accept").header("Authorization", bearer(wrongUser))
                        .contentType(MediaType.APPLICATION_JSON).content(tokenJson(token)))
                .andExpect(status().isForbidden());
        assertThat(memberships.findByAcademyIdAndUserId(academyA.getId(), wrongUser.getId())).isEmpty();

        mvc.perform(post("/api/invitations/accept").header("Authorization", bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON).content(tokenJson(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("COACH"));
        assertThat(jdbc.queryForObject("""
                select count(*) from academy_membership_roles r
                join academy_memberships m on m.id = r.membership_id
                where m.academy_id = ? and m.user_id = ? and r.role = 'COACH'
                """, Integer.class, academyA.getId(), coach.getId())).isEqualTo(1);
        assertThat(users.findById(coach.getId()).orElseThrow().isEmailVerified()).isTrue();
    }

    @Test
    void duplicatePendingInvitationCanBeRecreatedOnlyAfterRevocation() throws Exception {
        String id = invite(adminTokenA, academyA, "coach@example.kz", "COACH", null);
        mvc.perform(post(base(academyA) + "/invitations").header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON).content(inviteJson("coach@example.kz", "COACH", null)))
                .andExpect(status().isConflict());
        mvc.perform(delete(base(academyA) + "/invitations/" + id).header("Authorization", adminTokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REVOKED"));
        mvc.perform(post(base(academyA) + "/invitations").header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON).content(inviteJson("coach@example.kz", "COACH", null)))
                .andExpect(status().isCreated());
        mvc.perform(get(base(academyA) + "/invitations").header("Authorization", adminTokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get(base(academyA) + "/invitations").header("Authorization", adminTokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void invitationValidatesRolesPlayersAndPermissions() throws Exception {
        var coach = member(academyA, "coach", AcademyRole.COACH);
        String coachToken = bearer(coach);
        for (String body : new String[]{
                inviteJson("parent@example.kz", "PARENT", null),
                inviteJson("coach@example.kz", "COACH", childA.getId()),
                inviteJson("admin@example.kz", "ADMIN", null)}) {
            mvc.perform(post(base(academyA) + "/invitations").header("Authorization", adminTokenA)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post(base(academyA) + "/invitations").header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inviteJson("parent@example.kz", "PARENT", childB.getId())))
                .andExpect(status().isNotFound());
        mvc.perform(post(base(academyA) + "/invitations").header("Authorization", coachToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inviteJson("new@example.kz", "COACH", null)))
                .andExpect(status().isForbidden());
        mvc.perform(get(base(academyA) + "/invitations").header("Authorization", coachToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void expiredAndRevokedTokensCannotBeAccepted() throws Exception {
        String id = invite(adminTokenA, academyA, "expired@example.kz", "COACH", null);
        String expired = invitationToken();
        jdbc.update("update academy_invitations set expires_at = now() - interval '1 second' where id = ?", UUID.fromString(id));
        mvc.perform(post("/api/invitations/preview").contentType(MediaType.APPLICATION_JSON).content(tokenJson(expired)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/invitations/accept-new").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + expired + "\",\"fullName\":\"Expired\","
                                + "\"password\":\"A-long-parent-password-42\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base(academyA) + "/invitations").header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inviteJson("expired@example.kz", "COACH", null)))
                .andExpect(status().isCreated());

        String activeId = invite(adminTokenA, academyA, "revoked@example.kz", "COACH", null);
        String revoked = invitationToken();
        mvc.perform(delete(base(academyA) + "/invitations/" + activeId).header("Authorization", adminTokenA))
                .andExpect(status().isOk());
        mvc.perform(post("/api/invitations/preview").contentType(MediaType.APPLICATION_JSON).content(tokenJson(revoked)))
                .andExpect(status().isConflict());
    }

    @Test
    void adminCanLinkAndUnlinkParentButCannotCrossAcademies() throws Exception {
        var parent = member(academyA, "parent", AcademyRole.PARENT);
        String parentToken = bearer(parent);
        String link = base(academyA) + "/parents/" + parent.getId() + "/players/";
        mvc.perform(put(link + childA.getId()).header("Authorization", adminTokenA)).andExpect(status().isNoContent());
        mvc.perform(put(link + childA.getId()).header("Authorization", adminTokenA)).andExpect(status().isNoContent());
        mvc.perform(get(base(academyA) + "/parent/players").header("Authorization", parentToken))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(put(link + childB.getId()).header("Authorization", adminTokenA)).andExpect(status().isNotFound());
        mvc.perform(delete(link + childA.getId()).header("Authorization", adminTokenA)).andExpect(status().isNoContent());
        mvc.perform(get(base(academyA) + "/parent/players").header("Authorization", parentToken))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(put(link + childA.getId()).header("Authorization", adminTokenB)).andExpect(status().isNotFound());
    }

    @Test
    void databaseRejectsCrossAcademyParentLinkAndRemovingParentRoleRemovesLinks() throws Exception {
        var parent = member(academyA, "parent", AcademyRole.PARENT);
        UUID membershipId = memberships.findByAcademyIdAndUserId(academyA.getId(), parent.getId()).orElseThrow().getId();
        assertThatThrownBy(() -> jdbc.update("""
                insert into parent_players (id, academy_id, parent_membership_id, player_id)
                values (?, ?, ?, ?)
                """, UUID.randomUUID(), academyB.getId(), membershipId, childB.getId()))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("fk_parent_player_membership");
        jdbc.update("insert into parent_players (id, academy_id, parent_membership_id, player_id) values (?, ?, ?, ?)",
                UUID.randomUUID(), academyA.getId(), membershipId, childA.getId());
        jdbc.update("delete from academy_membership_roles where membership_id = ? and role = 'PARENT'", membershipId);
        assertThat(jdbc.queryForObject("select count(*) from parent_players", Integer.class)).isZero();
    }

    @Test
    void mailFailureRollsBackInvitation() throws Exception {
        doThrow(new MailSendException("SMTP unavailable")).when(mail).send(any(SimpleMailMessage.class));
        mvc.perform(post(base(academyA) + "/invitations").header("Authorization", adminTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inviteJson("mail-failure@example.kz", "COACH", null)))
                .andExpect(status().isServiceUnavailable());
        assertThat(jdbc.queryForObject("select count(*) from academy_invitations", Integer.class)).isZero();
    }

    private String invite(String auth, Academy academy, String email, String role, UUID playerId) throws Exception {
        String response = mvc.perform(post(base(academy) + "/invitations").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON).content(inviteJson(email, role, playerId)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private String invitationToken() {
        var captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, atLeastOnce()).send(captor.capture());
        String text = captor.getValue().getText();
        return text.substring(text.indexOf("token=") + 6).split("\\s")[0];
    }

    private String inviteJson(String email, String role, UUID playerId) {
        String playersJson = playerId == null ? "[]" : "[\"" + playerId + "\"]";
        return "{\"email\":\"" + email + "\",\"roles\":[\"" + role + "\"],\"playerIds\":" + playersJson + "}";
    }

    private String tokenJson(String token) {
        return "{\"token\":\"" + token + "\"}";
    }

    private User user(String email, String name) {
        return users.save(new User(email, name, passwords.encode("A-long-existing-password-42")));
    }

    private User member(Academy academy, String name, AcademyRole... roles) {
        var user = new User(name + "@example.kz", name, passwords.encode("A-long-existing-password-42"));
        user.confirmEmail();
        user = users.save(user);
        memberships.save(new AcademyMembership(academy, user, roles));
        return user;
    }

    private String bearer(User user) {
        return "Bearer " + jwt.issue(user.getId()).accessToken();
    }

    private String base(Academy academy) {
        return "/api/academies/" + academy.getId();
    }
}
