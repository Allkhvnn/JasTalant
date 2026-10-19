package kz.jastalant.backend;

import com.jayway.jsonpath.JsonPath;
import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.group.entity.TrainingGroup;
import kz.jastalant.backend.group.repository.TrainingGroupRepository;
import kz.jastalant.backend.membership.entity.AcademyMembership;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.onboarding.entity.AcademyApplication;
import kz.jastalant.backend.onboarding.repository.AcademyApplicationRepository;
import kz.jastalant.backend.player.dto.PlayerRequest;
import kz.jastalant.backend.player.service.PlayerService;
import kz.jastalant.backend.security.JwtService;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class AuditLogTests {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AcademyRepository academies;
    @Autowired UserRepository users;
    @Autowired AcademyMembershipRepository memberships;
    @Autowired TrainingGroupRepository groups;
    @Autowired AcademyApplicationRepository applications;
    @Autowired PlayerService players;
    @Autowired PlatformTransactionManager transactions;
    @Autowired JwtService jwt;
    @MockitoBean JavaMailSender mail;
    Academy a, b;
    User adminA, adminB, coach, parent, owner;
    UUID groupA, groupB;
    String tokenA, tokenB, tokenCoach, tokenParent, tokenOwner;

    @BeforeEach
    void fixtures() {
        for (String table : new String[]{"audit_events", "attendance_records", "attendance_sessions", "scheduled_trainings",
                "players", "training_groups", "academy_applications", "academy_memberships", "academies",
                "password_reset_tokens", "auth_refresh_tokens", "app_users"}) {
            jdbc.execute("delete from " + table);
        }
        a = academies.save(new Academy("Academy A"));
        b = academies.save(new Academy("Academy B"));
        adminA = member(a, "Admin A", AcademyRole.ADMIN);
        adminB = member(b, "Admin B", AcademyRole.ADMIN);
        coach = member(a, "Coach", AcademyRole.COACH);
        parent = member(a, "Parent", AcademyRole.PARENT);
        owner = users.save(User.platformOwner("owner@example.kz", "Owner", "unused-test-hash"));
        groupA = groups.save(new TrainingGroup(a.getId(), "U10", "U10")).getId();
        groupB = groups.save(new TrainingGroup(b.getId(), "U12", "U12")).getId();
        tokenA = token(adminA); tokenB = token(adminB); tokenCoach = token(coach);
        tokenParent = token(parent); tokenOwner = token(owner);
    }

    @Test
    void playerHistorySurvivesDeletionAndDoesNotExposeContactData() throws Exception {
        String id = player(tokenA, a, groupA, "Player A");
        mvc.perform(put(base(a) + "/players/" + id).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"details\":" + playerJson(groupA, "Renamed player") + "}"))
                .andExpect(status().isOk());
        mvc.perform(delete(base(a) + "/players/" + id).header("Authorization", tokenA))
                .andExpect(status().isNoContent());
        String history = mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.items[0].action").value("PLAYER_DELETED"))
                .andExpect(jsonPath("$.items[0].targetName").value("Renamed player"))
                .andExpect(jsonPath("$.items[0].targetId").value(id))
                .andExpect(jsonPath("$.items[0].actorName").value("Admin A"))
                .andReturn().getResponse().getContentAsString();
        assertThat(history).doesNotContain("parent-private@example.kz", "+77001234567", "Private parent", "unused-test-hash");
        assertThat(jdbc.queryForObject("select count(*) from players", Integer.class)).isZero();
        mvc.perform(get(base(a) + "/audit/actors").header("Authorization", tokenA))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(adminA.getId().toString()));
    }

    @Test
    void academyAndPlatformScopesEnforceCurrentPermissions() throws Exception {
        player(tokenA, a, groupA, "Player A");
        player(tokenB, b, groupB, "Player B");
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].targetName").value("Player A"));
        mvc.perform(get(base(b) + "/audit").header("Authorization", tokenB))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].targetName").value("Player B"));
        for (String suffix : new String[]{"/audit", "/audit/actors"}) {
            mvc.perform(get(base(a) + suffix)).andExpect(status().isUnauthorized());
            mvc.perform(get(base(a) + suffix).header("Authorization", tokenB)).andExpect(status().isNotFound());
            mvc.perform(get(base(a) + suffix).header("Authorization", tokenCoach)).andExpect(status().isForbidden());
            mvc.perform(get(base(a) + suffix).header("Authorization", tokenParent)).andExpect(status().isForbidden());
            mvc.perform(get("/api/platform" + suffix).header("Authorization", tokenA)).andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/platform/audit").header("Authorization", tokenOwner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenOwner)).andExpect(status().isOk());
        jdbc.update("update academy_memberships set active = false where academy_id = ? and user_id = ?", a.getId(), adminA.getId());
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA)).andExpect(status().isForbidden());
        jdbc.update("update app_users set platform_role = 'USER' where id = ?", owner.getId());
        mvc.perform(get("/api/platform/audit").header("Authorization", tokenOwner)).andExpect(status().isForbidden());
    }

    @Test
    void filtersUseInclusiveStartExclusiveEndAndStablePagination() throws Exception {
        String first = player(tokenA, a, groupA, "First");
        String second = player(tokenOwner, a, groupA, "Second");
        String third = player(tokenA, a, groupA, "Third");
        player(tokenB, b, groupB, "Other academy");
        jdbc.update("update audit_events set occurred_at = '2026-01-01T00:00:00Z' where target_id = ?", UUID.fromString(first));
        jdbc.update("update audit_events set occurred_at = '2026-01-01T12:00:00Z' where target_id = ?", UUID.fromString(second));
        jdbc.update("update audit_events set occurred_at = '2026-01-02T00:00:00Z' where target_id = ?", UUID.fromString(third));
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA)
                        .param("from", "2026-01-01T00:00:00Z").param("until", "2026-01-02T00:00:00Z"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.items[0].targetName").value("Second"));
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA)
                        .param("action", "PLAYER_CREATED").param("actorId", adminA.getId().toString()).param("size", "1").param("page", "1"))
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items[0].targetName").value("First"));
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA).param("actorId", adminB.getId().toString()))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get(base(a) + "/audit/actors").header("Authorization", tokenA))
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[*].name", hasItems("Admin A", "Owner")));
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA).param("page", "-1")).andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA).param("size", "101")).andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA).param("action", "INVENTED")).andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA).param("actorId", "invalid")).andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA)
                        .param("from", "2026-01-02T00:00:00Z").param("until", "2026-01-01T00:00:00Z"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void coachAttendanceAndAssessmentChangesAreRecordedWithoutComments() throws Exception {
        String player = player(tokenA, a, groupA, "Player");
        mvc.perform(put(base(a) + "/groups/" + groupA + "/coaches/" + coach.getId()).header("Authorization", tokenA))
                .andExpect(status().isNoContent());
        String date = LocalDate.now().minusDays(1).toString();
        String attendance = base(a) + "/groups/" + groupA + "/attendance/" + date;
        for (String mark : new String[]{"PRESENT", "ABSENT"}) {
            mvc.perform(put(attendance).header("Authorization", tokenCoach).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"version\":0,\"records\":[{\"playerId\":\"" + player + "\",\"status\":\"" + mark
                                    + "\",\"comment\":\"private attendance comment\"}]}"))
                    .andExpect(status().isOk());
        }
        mvc.perform(put(attendance).header("Authorization", tokenCoach).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"records\":[{\"playerId\":\"" + player + "\",\"status\":\"PRESENT\"}]}"))
                .andExpect(status().isConflict());
        String assessmentPath = base(a) + "/players/" + player + "/development-assessments";
        String details = "{\"assessmentDate\":\"" + date + "\",\"technique\":7,\"speed\":7,\"endurance\":7,"
                + "\"physicalFitness\":7,\"gameIntelligence\":7,\"comment\":\"private assessment comment\"}";
        String assessment = mvc.perform(post(assessmentPath).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON).content(details))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String assessmentId = JsonPath.read(assessment, "$.id");
        mvc.perform(put(assessmentPath + "/" + assessmentId).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"details\":" + details.replace("technique\":7", "technique\":8") + "}"))
                .andExpect(status().isOk());
        mvc.perform(delete(assessmentPath + "/" + assessmentId).header("Authorization", tokenCoach)).andExpect(status().isNoContent());
        String history = mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA).param("actorId", coach.getId().toString()))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.items[*].action", hasItems("ATTENDANCE_CREATED", "ATTENDANCE_UPDATED", "DEVELOPMENT_CREATED", "DEVELOPMENT_UPDATED", "DEVELOPMENT_DELETED")))
                .andReturn().getResponse().getContentAsString();
        assertThat(history).doesNotContain("private attendance comment", "private assessment comment");
    }

    @Test
    void transactionRollbackAndAuditFailureLeaveNeitherBusinessDataNorEvent() throws Exception {
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            players.create(adminA.getId(), a.getId(), new PlayerRequest(groupA, "Rolled back", LocalDate.of(2015, 1, 1), null, null, null));
            status.setRollbackOnly();
        });
        assertThat(jdbc.queryForObject("select count(*) from players", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from audit_events", Integer.class)).isZero();
        jdbc.execute("alter table audit_events add constraint simulate_audit_failure check (action <> 'PLAYER_CREATED')");
        try {
            mvc.perform(post(base(a) + "/players").header("Authorization", tokenA).contentType(MediaType.APPLICATION_JSON)
                            .content(playerJson(groupA, "Audit failed")))
                    .andExpect(status().isConflict());
            assertThat(jdbc.queryForObject("select count(*) from players", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("select count(*) from audit_events", Integer.class)).isZero();
        } finally {
            jdbc.execute("alter table audit_events drop constraint simulate_audit_failure");
        }
    }

    @Test
    void platformDecisionsAndStatusChangesAreSeparateFromAcademyHistory() throws Exception {
        var applicant = users.save(verified("Applicant"));
        var application = new AcademyApplication(applicant, "New Academy");
        application.emailConfirmed();
        application = applications.save(application);
        String approved = mvc.perform(post("/api/platform/applications/" + application.getId() + "/approve")
                        .header("Authorization", tokenOwner))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String academyId = JsonPath.read(approved, "$.academyId");
        var rejected = new AcademyApplication(users.save(verified("Rejected")), "Rejected Academy");
        rejected.emailConfirmed(); rejected = applications.save(rejected);
        mvc.perform(post("/api/platform/applications/" + rejected.getId() + "/reject").header("Authorization", tokenOwner)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"private rejection reason\"}"))
                .andExpect(status().isOk());
        String statusPath = "/api/platform/academies/" + academyId + "/status";
        mvc.perform(put(statusPath).header("Authorization", tokenOwner).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"status\":\"SUSPENDED\",\"reason\":\"private suspension reason\"}"))
                .andExpect(status().isOk());
        mvc.perform(put(statusPath).header("Authorization", tokenOwner).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":1,\"status\":\"ACTIVE\",\"reason\":\"\"}"))
                .andExpect(status().isOk());
        String history = mvc.perform(get("/api/platform/audit").header("Authorization", tokenOwner))
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.items[*].action", hasItems("APPLICATION_APPROVED", "APPLICATION_REJECTED", "ACADEMY_SUSPENDED", "ACADEMY_ACTIVATED")))
                .andReturn().getResponse().getContentAsString();
        assertThat(history).doesNotContain("private rejection reason", "private suspension reason");
        mvc.perform(get("/api/platform/audit/actors").header("Authorization", tokenOwner)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA)).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void memberRoleNameAndAccessChangesProduceSpecificEvents() throws Exception {
        String path = base(a) + "/members/" + coach.getId();
        mvc.perform(put(path).header("Authorization", tokenA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"COACH\",\"PARENT\"],\"active\":false,\"displayName\":\"New Coach\"}"))
                .andExpect(status().isOk());
        String history = mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.items[*].action", hasItems("MEMBER_PROFILE_UPDATED", "MEMBER_ROLES_UPDATED", "MEMBER_ACCESS_DISABLED")))
                .andReturn().getResponse().getContentAsString();
        assertThat(history).contains("New Coach");
        mvc.perform(put(path).header("Authorization", tokenA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":1,\"roles\":[\"COACH\",\"PARENT\"],\"active\":true,\"displayName\":\"New Coach\"}"))
                .andExpect(status().isOk());
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA).param("action", "MEMBER_ACCESS_ENABLED"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void importPreviewCreatesNoHistoryAndCommittedImportCreatesOneSummary() throws Exception {
        String csv = "group;full_name;date_of_birth;parent_name;parent_phone;parent_email\n"
                + "U10;Imported Player;2015-01-01;Private parent;+77001234567;parent-private@example.kz\n";
        var file = new MockMultipartFile("file", "players.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart(base(a) + "/players/import").file(file).param("dryRun", "true").header("Authorization", tokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.importedRows").value(0));
        assertThat(jdbc.queryForObject("select count(*) from audit_events", Integer.class)).isZero();
        mvc.perform(multipart(base(a) + "/players/import").file(file).param("dryRun", "false").header("Authorization", tokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.importedRows").value(1));
        mvc.perform(get(base(a) + "/audit").header("Authorization", tokenA))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].action").value("PLAYERS_IMPORTED"))
                .andExpect(jsonPath("$.items[0].targetName").value("1"));
    }

    @Test
    void clientsCannotForgeModifyOrDeleteHistory() throws Exception {
        player(tokenA, a, groupA, "Player");
        String event = jdbc.queryForObject("select id from audit_events", UUID.class).toString();
        mvc.perform(post(base(a) + "/audit").header("Authorization", tokenA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actorId\":\"" + owner.getId() + "\",\"action\":\"PLAYER_CREATED\"}"))
                .andExpect(status().isMethodNotAllowed());
        mvc.perform(delete(base(a) + "/audit/" + event).header("Authorization", tokenA)).andExpect(status().is4xxClientError());
        mvc.perform(put(base(a) + "/audit/" + event).header("Authorization", tokenA).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().is4xxClientError());
        assertThat(jdbc.queryForObject("select count(*) from audit_events", Integer.class)).isEqualTo(1);
    }

    private User verified(String name) {
        var user = new User(name.replace(" ", "").toLowerCase() + "@example.kz", name, "unused-test-hash");
        user.confirmEmail();
        return user;
    }
    private User member(Academy academy, String name, AcademyRole role) {
        var user = users.save(verified(name));
        memberships.save(new AcademyMembership(academy, user, role));
        return user;
    }
    private String token(User user) { return "Bearer " + jwt.issue(user.getId()).accessToken(); }
    private String base(Academy academy) { return "/api/academies/" + academy.getId(); }
    private String player(String token, Academy academy, UUID group, String name) throws Exception {
        String response = mvc.perform(post(base(academy) + "/players").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(playerJson(group, name)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }
    private String playerJson(UUID group, String name) {
        return """
                {"groupId":"%s","fullName":"%s","dateOfBirth":"2015-01-01",
                 "parentName":"Private parent","parentPhone":"+77001234567","parentEmail":"parent-private@example.kz"}
                """.formatted(group, name);
    }
}
