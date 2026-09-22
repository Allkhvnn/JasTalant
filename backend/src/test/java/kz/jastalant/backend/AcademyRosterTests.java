package kz.jastalant.backend;

import com.jayway.jsonpath.JsonPath;
import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.membership.entity.*;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.security.JwtService;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class AcademyRosterTests {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AcademyRepository academies;
    @Autowired UserRepository users;
    @Autowired AcademyMembershipRepository memberships;
    @Autowired JwtService jwt;
    Academy a, b;
    User adminA, adminB, coach, parent;
    String tokenA, tokenB, tokenCoach, tokenParent;

    @BeforeEach
    void fixtures() {
        jdbc.execute("delete from attendance_records");
        jdbc.execute("delete from attendance_sessions");
        jdbc.execute("delete from scheduled_trainings");
        jdbc.execute("delete from players");
        jdbc.execute("delete from training_groups");
        jdbc.execute("delete from academy_applications");
        jdbc.execute("delete from academy_memberships");
        jdbc.execute("delete from academies");
        jdbc.execute("delete from app_users");
        a = academies.save(new Academy("Academy A"));
        b = academies.save(new Academy("Academy B"));
        adminA = member(a, "admin-a", AcademyRole.ADMIN);
        adminB = member(b, "admin-b", AcademyRole.ADMIN);
        coach = member(a, "coach", AcademyRole.COACH, AcademyRole.PARENT);
        parent = member(a, "parent", AcademyRole.PARENT);
        tokenA = token(adminA);
        tokenB = token(adminB);
        tokenCoach = token(coach);
        tokenParent = token(parent);
    }

    @Test
    void adminCanManageGroupsAndPlayersWithVersionChecks() throws Exception {
        String group = group(tokenA, a, "U10");
        String second = group(tokenA, a, "U12");
        String player = player(tokenA, a, group);
        mvc.perform(get(base(a) + "/players").header("Authorization", tokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(put(base(a) + "/groups/" + group).header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"version":0,"details":{"name":"Updated","ageCategory":"U11"}}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(put(base(a) + "/groups/" + group).header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"version":0,"details":{"name":"Stale","ageCategory":"U11"}}
                        """))
                .andExpect(status().isConflict());
        mvc.perform(delete(base(a) + "/groups/" + group).header("Authorization", tokenA)).andExpect(status().isConflict());
        mvc.perform(put(base(a) + "/players/" + player).header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(updatePlayer(second, 0)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.groupId").value(second)).andExpect(jsonPath("$.version").value(1));
        mvc.perform(put(base(a) + "/players/" + player).header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(updatePlayer(group, 0)))
                .andExpect(status().isConflict());
        mvc.perform(delete(base(a) + "/groups/" + group).header("Authorization", tokenA)).andExpect(status().isNoContent());
        mvc.perform(delete(base(a) + "/players/" + player).header("Authorization", tokenA)).andExpect(status().isNoContent());
        mvc.perform(get(base(a) + "/players/" + player).header("Authorization", tokenA)).andExpect(status().isNotFound());
        mvc.perform(delete(base(a) + "/groups/" + second).header("Authorization", tokenA)).andExpect(status().isNoContent());
    }

    @Test
    void foreignIdsCannotBeUsedToReadModifyDeleteOrMoveData() throws Exception {
        String ownGroup = group(tokenA, a, "Own");
        String foreignGroup = group(tokenB, b, "Foreign");
        String ownPlayer = player(tokenA, a, ownGroup);
        String foreignPlayer = player(tokenB, b, foreignGroup);
        mvc.perform(get(base(b) + "/groups").header("Authorization", tokenA)).andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/groups/" + foreignGroup).header("Authorization", tokenA)).andExpect(status().isNotFound());
        mvc.perform(put(base(a) + "/groups/" + foreignGroup).header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"details\":{\"name\":\"No\",\"ageCategory\":\"U10\"}}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete(base(a) + "/groups/" + foreignGroup).header("Authorization", tokenA)).andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/players/" + foreignPlayer).header("Authorization", tokenA)).andExpect(status().isNotFound());
        mvc.perform(delete(base(a) + "/players/" + foreignPlayer).header("Authorization", tokenA)).andExpect(status().isNotFound());
        mvc.perform(put(base(a) + "/players/" + foreignPlayer).header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(updatePlayer(ownGroup, 0))).andExpect(status().isNotFound());
        mvc.perform(put(base(a) + "/players/" + ownPlayer).header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(updatePlayer(foreignGroup, 0))).andExpect(status().isNotFound());
        mvc.perform(post(base(a) + "/players").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(playerJson(foreignGroup))).andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/players?groupId=" + foreignGroup).header("Authorization", tokenA)).andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/players").header("Authorization", tokenA))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].id").value(ownPlayer));
    }

    @Test
    void coachOnlyReadsAssignedGroupsAndTheirPlayers() throws Exception {
        String assigned = group(tokenA, a, "Assigned");
        String other = group(tokenA, a, "Other");
        String visiblePlayer = player(tokenA, a, assigned);
        String hiddenPlayer = player(tokenA, a, other);
        mvc.perform(get(base(a) + "/groups/" + assigned).header("Authorization", tokenCoach)).andExpect(status().isNotFound());
        String assignment = base(a) + "/groups/" + assigned + "/coaches/" + coach.getId();
        mvc.perform(put(assignment).header("Authorization", tokenA)).andExpect(status().isNoContent());
        mvc.perform(put(assignment).header("Authorization", tokenA)).andExpect(status().isNoContent());
        mvc.perform(get(base(a) + "/groups").header("Authorization", tokenCoach))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].id").value(assigned));
        mvc.perform(get(base(a) + "/players").header("Authorization", tokenCoach))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].id").value(visiblePlayer));
        mvc.perform(get(base(a) + "/players?groupId=" + assigned).header("Authorization", tokenCoach))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get(base(a) + "/players?groupId=" + other).header("Authorization", tokenCoach)).andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/players/" + hiddenPlayer).header("Authorization", tokenCoach)).andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/players/" + visiblePlayer).header("Authorization", tokenCoach)).andExpect(status().isOk());
        mvc.perform(post(base(a) + "/players").header("Authorization", tokenCoach)
                .contentType(MediaType.APPLICATION_JSON).content(playerJson(assigned))).andExpect(status().isForbidden());
        mvc.perform(put(base(a) + "/players/" + visiblePlayer).header("Authorization", tokenCoach)
                .contentType(MediaType.APPLICATION_JSON).content(updatePlayer(assigned, 0))).andExpect(status().isForbidden());
        mvc.perform(delete(base(a) + "/players/" + visiblePlayer).header("Authorization", tokenCoach)).andExpect(status().isForbidden());
        mvc.perform(delete(base(a) + "/groups/" + assigned).header("Authorization", tokenCoach)).andExpect(status().isForbidden());
        mvc.perform(put(base(a) + "/groups/" + other + "/coaches/" + coach.getId()).header("Authorization", tokenCoach)).andExpect(status().isForbidden());
        mvc.perform(delete(assignment).header("Authorization", tokenA)).andExpect(status().isNoContent());
        mvc.perform(get(base(a) + "/players/" + visiblePlayer).header("Authorization", tokenCoach)).andExpect(status().isNotFound());
    }

    @Test
    void assigningCoachRequiresCoachMembershipInSameAcademy() throws Exception {
        String group = group(tokenA, a, "Group");
        var foreignCoach = member(b, "foreign-coach", AcademyRole.COACH);
        mvc.perform(put(base(a) + "/groups/" + group + "/coaches/" + foreignCoach.getId()).header("Authorization", tokenA))
                .andExpect(status().isNotFound());
        mvc.perform(put(base(a) + "/groups/" + group + "/coaches/" + parent.getId()).header("Authorization", tokenA))
                .andExpect(status().isBadRequest());
        mvc.perform(put(base(a) + "/groups/" + group + "/coaches/" + coach.getId()).header("Authorization", tokenA))
                .andExpect(status().isNoContent());
        mvc.perform(get(base(a) + "/groups/" + group + "/coaches").header("Authorization", tokenA))
                .andExpect(jsonPath("$[0].userId").value(coach.getId().toString()));
        UUID membershipId = memberships.findByAcademyIdAndUserId(a.getId(), coach.getId()).orElseThrow().getId();
        jdbc.update("delete from academy_membership_roles where membership_id = ? and role = 'COACH'", membershipId);
        assertThat(jdbc.queryForObject("select count(*) from group_coaches", Integer.class)).isZero();
        mvc.perform(get(base(a) + "/groups/" + group).header("Authorization", tokenCoach)).andExpect(status().isForbidden());
    }

    @Test
    void adminCanListCoachesOnlyInsideOwnAcademy() throws Exception {
        mvc.perform(get(base(a) + "/members?role=COACH").header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].userId").value(coach.getId().toString()))
                .andExpect(jsonPath("$[0].fullName").value(coach.getFullName()))
                .andExpect(jsonPath("$[0].email").value(coach.getEmail()))
                .andExpect(jsonPath("$[0].roles.length()").value(2));
        mvc.perform(get(base(b) + "/members?role=COACH").header("Authorization", tokenA))
                .andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/members?role=COACH").header("Authorization", tokenCoach))
                .andExpect(status().isForbidden());
        mvc.perform(get(base(a) + "/members?role=COACH"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get(base(a) + "/members?role=UNKNOWN").header("Authorization", tokenA))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminManagesMemberRolesAndAccessWithoutLosingLastAdministrator() throws Exception {
        String memberPath = base(a) + "/members/" + coach.getId();
        mvc.perform(get(base(a) + "/members").header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[1].userId").value(coach.getId().toString()))
                .andExpect(jsonPath("$[1].active").value(true));

        mvc.perform(put(base(a) + "/members/" + adminA.getId()).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"COACH\"],\"active\":true}"))
                .andExpect(status().isConflict());
        mvc.perform(put(base(a) + "/members/" + adminA.getId()).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"ADMIN\"],\"active\":false}"))
                .andExpect(status().isConflict());

        mvc.perform(put(memberPath).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"ADMIN\",\"COACH\"],\"active\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.roles", hasItems("ADMIN", "COACH")));
        mvc.perform(put(memberPath).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"ADMIN\"],\"active\":true}"))
                .andExpect(status().isConflict());

        mvc.perform(put(base(a) + "/members/" + adminA.getId()).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"ADMIN\"],\"active\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        mvc.perform(get(base(a) + "/groups").header("Authorization", tokenA)).andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/academies").header("Authorization", tokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));

        mvc.perform(put(base(a) + "/members/" + adminA.getId()).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":1,\"roles\":[\"ADMIN\"],\"active\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void roleRemovalCleansAssignmentsAndMembershipUpdatesStayInsideAcademy() throws Exception {
        String group = group(tokenA, a, "Managed");
        mvc.perform(put(base(a) + "/groups/" + group + "/coaches/" + coach.getId())
                        .header("Authorization", tokenA)).andExpect(status().isNoContent());

        mvc.perform(put(base(a) + "/members/" + coach.getId()).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"PARENT\"],\"active\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get(base(a) + "/groups/" + group + "/coaches").header("Authorization", tokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get(base(a) + "/groups").header("Authorization", tokenCoach)).andExpect(status().isForbidden());
        mvc.perform(get(base(a) + "/members?role=COACH").header("Authorization", tokenA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));

        mvc.perform(put(base(a) + "/members/" + adminB.getId()).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"ADMIN\"],\"active\":false}"))
                .andExpect(status().isNotFound());
        mvc.perform(put(base(a) + "/members/" + parent.getId()).header("Authorization", tokenParent)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[\"PARENT\"],\"active\":false}"))
                .andExpect(status().isForbidden());
        mvc.perform(put(base(a) + "/members/" + parent.getId()).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"roles\":[],\"active\":true}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCanRecordAndUpdateAttendanceWithVersionCheck() throws Exception {
        String group = group(tokenA, a, "U10");
        String player = player(tokenA, a, group);
        String date = LocalDate.now().minusDays(1).toString();
        String path = base(a) + "/groups/" + group + "/attendance/" + date;

        mvc.perform(get(path).header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(false))
                .andExpect(jsonPath("$.version").value(0))
                .andExpect(jsonPath("$.players.length()").value(1))
                .andExpect(jsonPath("$.players[0].status").doesNotExist());

        mvc.perform(put(path).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, player, "PRESENT", "Вовремя")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saved").value(true))
                .andExpect(jsonPath("$.version").value(0))
                .andExpect(jsonPath("$.players[0].status").value("PRESENT"));

        mvc.perform(put(path).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(1, player, "ABSENT", null)))
                .andExpect(status().isConflict());
        mvc.perform(put(path).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, player, "ABSENT", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.players[0].status").value("ABSENT"));
    }

    @Test
    void coachCanMarkOnlyAssignedGroupAndParentCannotAccessAttendance() throws Exception {
        String assigned = group(tokenA, a, "Assigned");
        String other = group(tokenA, a, "Other");
        String player = player(tokenA, a, assigned);
        String date = LocalDate.now().toString();
        String assignedPath = base(a) + "/groups/" + assigned + "/attendance/" + date;
        String otherPath = base(a) + "/groups/" + other + "/attendance/" + date;

        mvc.perform(get(assignedPath).header("Authorization", tokenCoach)).andExpect(status().isNotFound());
        mvc.perform(put(base(a) + "/groups/" + assigned + "/coaches/" + coach.getId())
                        .header("Authorization", tokenA))
                .andExpect(status().isNoContent());
        mvc.perform(put(assignedPath).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, player, "LATE", "Опоздал на 10 минут")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players[0].status").value("LATE"));
        mvc.perform(get(otherPath).header("Authorization", tokenCoach)).andExpect(status().isNotFound());
        mvc.perform(get(assignedPath).header("Authorization", tokenParent)).andExpect(status().isForbidden());
    }

    @Test
    void staffCanManageDevelopmentAssessmentsWithVersionAndDateChecks() throws Exception {
        String assigned = group(tokenA, a, "Assigned");
        String other = group(tokenA, a, "Other");
        String player = player(tokenA, a, assigned);
        String hiddenPlayer = player(tokenA, a, other);
        String path = base(a) + "/players/" + player + "/development-assessments";
        String date = LocalDate.now().minusDays(1).toString();

        mvc.perform(get(path).header("Authorization", tokenCoach)).andExpect(status().isNotFound());
        mvc.perform(put(base(a) + "/groups/" + assigned + "/coaches/" + coach.getId())
                        .header("Authorization", tokenA))
                .andExpect(status().isNoContent());

        String response = mvc.perform(post(path).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assessmentJson(date, "8.4", "First assessment")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.technique").value(8.4))
                .andExpect(jsonPath("$.createdByName").value(coach.getFullName()))
                .andReturn().getResponse().getContentAsString();
        String assessmentId = JsonPath.read(response, "$.id");

        mvc.perform(post(path).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assessmentJson(date, "7.0", null)))
                .andExpect(status().isConflict());
        mvc.perform(put(path + "/" + assessmentId).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"details\":" + assessmentJson(date, "9.0", "Progress") + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.technique").value(9.0));
        mvc.perform(put(path + "/" + assessmentId).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"details\":" + assessmentJson(date, "6.0", null) + "}"))
                .andExpect(status().isConflict());
        mvc.perform(post(path).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assessmentJson(LocalDate.now().plusDays(1).toString(), "7.0", null)))
                .andExpect(status().isBadRequest());
        mvc.perform(post(path).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assessmentJson(LocalDate.now().toString(), "10.1", null)))
                .andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/players/" + hiddenPlayer + "/development-assessments")
                        .header("Authorization", tokenCoach))
                .andExpect(status().isNotFound());
    }

    @Test
    void parentReadsOnlyLinkedChildDevelopmentAndTenantsStayIsolated() throws Exception {
        String groupA = group(tokenA, a, "A");
        String groupB = group(tokenB, b, "B");
        String child = player(tokenA, a, groupA);
        String otherChild = player(tokenA, a, groupA);
        String foreignChild = player(tokenB, b, groupB);
        String date = LocalDate.now().minusDays(2).toString();

        mvc.perform(post(base(a) + "/players/" + child + "/development-assessments")
                        .header("Authorization", tokenA).contentType(MediaType.APPLICATION_JSON)
                        .content(assessmentJson(date, "8.5", "Good progress")))
                .andExpect(status().isCreated());
        mvc.perform(put(base(a) + "/parents/" + parent.getId() + "/players/" + child)
                        .header("Authorization", tokenA))
                .andExpect(status().isNoContent());

        mvc.perform(get(base(a) + "/parent/players/" + child + "/development-assessments")
                        .header("Authorization", tokenParent))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].comment").value("Good progress"));
        mvc.perform(get(base(a) + "/parent/players/" + otherChild + "/development-assessments")
                        .header("Authorization", tokenParent))
                .andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/parent/players/" + foreignChild + "/development-assessments")
                        .header("Authorization", tokenParent))
                .andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/players/" + child + "/development-assessments")
                        .header("Authorization", tokenParent))
                .andExpect(status().isForbidden());
        mvc.perform(get(base(a) + "/players/" + foreignChild + "/development-assessments")
                        .header("Authorization", tokenA))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminManagesScheduleAndCoachSeesOnlyAssignedGroups() throws Exception {
        String assigned = group(tokenA, a, "Assigned");
        String other = group(tokenA, a, "Other");
        var otherCoach = member(a, "other-schedule-coach", AcademyRole.COACH);
        mvc.perform(put(base(a) + "/groups/" + assigned + "/coaches/" + coach.getId())
                        .header("Authorization", tokenA)).andExpect(status().isNoContent());
        mvc.perform(put(base(a) + "/groups/" + other + "/coaches/" + otherCoach.getId())
                        .header("Authorization", tokenA)).andExpect(status().isNoContent());

        String date = LocalDate.now().plusDays(2).toString();
        String assignedTraining = training(tokenA, a, assigned, coach.getId(), date, "10:00", "11:30");
        String otherTraining = training(tokenA, a, other, otherCoach.getId(), date, "12:00", "13:30");

        mvc.perform(get(base(a) + "/trainings?from=" + date + "&to=" + date)
                        .header("Authorization", tokenCoach))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(assignedTraining))
                .andExpect(jsonPath("$[0].coachName").value(coach.getFullName()));
        mvc.perform(get(base(a) + "/trainings/" + otherTraining).header("Authorization", tokenCoach))
                .andExpect(status().isNotFound());
        mvc.perform(get(base(a) + "/trainings?from=" + date + "&to=" + date)
                        .header("Authorization", tokenParent))
                .andExpect(status().isForbidden());

        String updated = "{\"version\":0,\"details\":"
                + trainingJson(assigned, coach.getId(), date, "10:30", "12:00", "CANCELLED") + "}";
        mvc.perform(put(base(a) + "/trainings/" + assignedTraining).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON).content(updated))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.version").value(1));
        mvc.perform(put(base(a) + "/trainings/" + assignedTraining).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON).content(updated))
                .andExpect(status().isConflict());
    }

    @Test
    void scheduleValidatesCoachTimeSlotRangeAndTenant() throws Exception {
        String groupA = group(tokenA, a, "A");
        String groupB = group(tokenB, b, "B");
        var coachB = member(b, "schedule-coach-b", AcademyRole.COACH);
        mvc.perform(put(base(a) + "/groups/" + groupA + "/coaches/" + coach.getId())
                        .header("Authorization", tokenA)).andExpect(status().isNoContent());
        mvc.perform(put(base(b) + "/groups/" + groupB + "/coaches/" + coachB.getId())
                        .header("Authorization", tokenB)).andExpect(status().isNoContent());
        String date = LocalDate.now().plusDays(1).toString();
        String foreignTraining = training(tokenB, b, groupB, coachB.getId(), date, "09:00", "10:00");

        mvc.perform(post(base(a) + "/trainings").header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(groupA, parent.getId(), date, "09:00", "10:00", "SCHEDULED")))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base(a) + "/trainings").header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(groupA, coach.getId(), date, "10:00", "09:00", "SCHEDULED")))
                .andExpect(status().isBadRequest());
        training(tokenA, a, groupA, coach.getId(), date, "09:00", "10:00");
        mvc.perform(post(base(a) + "/trainings").header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(groupA, coach.getId(), date, "09:00", "11:00", "SCHEDULED")))
                .andExpect(status().isConflict());
        mvc.perform(get(base(a) + "/trainings?from=" + date + "&to=" + LocalDate.now().plusDays(100))
                        .header("Authorization", tokenA))
                .andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/trainings/" + foreignTraining).header("Authorization", tokenA))
                .andExpect(status().isNotFound());
    }

    @Test
    void scheduledTrainingsHaveIndependentAttendanceOnSameDay() throws Exception {
        String group = group(tokenA, a, "Double session");
        String player = player(tokenA, a, group);
        mvc.perform(put(base(a) + "/groups/" + group + "/coaches/" + coach.getId())
                        .header("Authorization", tokenA)).andExpect(status().isNoContent());
        String date = LocalDate.now().minusDays(1).toString();
        String morning = training(tokenA, a, group, coach.getId(), date, "09:00", "10:00");
        String evening = training(tokenA, a, group, coach.getId(), date, "18:00", "19:00");

        String morningPath = base(a) + "/trainings/" + morning + "/attendance";
        String eveningPath = base(a) + "/trainings/" + evening + "/attendance";
        mvc.perform(put(morningPath).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, player, "PRESENT", "Morning")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trainingId").value(morning));
        mvc.perform(put(eveningPath).header("Authorization", tokenCoach)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, player, "ABSENT", "Evening")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trainingId").value(evening));
        mvc.perform(get(morningPath).header("Authorization", tokenCoach))
                .andExpect(jsonPath("$.players[0].status").value("PRESENT"));
        mvc.perform(get(eveningPath).header("Authorization", tokenCoach))
                .andExpect(jsonPath("$.players[0].status").value("ABSENT"));

        mvc.perform(delete(base(a) + "/trainings/" + morning).header("Authorization", tokenA))
                .andExpect(status().isConflict());
    }

    @Test
    void attendanceValidatesRosterDateAndDatabaseTenantBoundaries() throws Exception {
        String groupA = group(tokenA, a, "A");
        String playerA = player(tokenA, a, groupA);
        String groupB = group(tokenB, b, "B");
        String playerB = player(tokenB, b, groupB);
        String date = LocalDate.now().toString();
        String path = base(a) + "/groups/" + groupA + "/attendance/" + date;

        mvc.perform(put(path).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, playerB, "PRESENT", null)))
                .andExpect(status().isBadRequest());
        mvc.perform(put(base(a) + "/groups/" + groupA + "/attendance/" + LocalDate.now().plusDays(1))
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, playerA, "PRESENT", null)))
                .andExpect(status().isBadRequest());
        mvc.perform(put(path).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"version":0,"records":[
                                  {"playerId":"%s","status":"PRESENT"},
                                  {"playerId":"%s","status":"ABSENT"}
                                ]}
                                """.formatted(playerA, playerA)))
                .andExpect(status().isBadRequest());

        mvc.perform(put(path).header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attendanceJson(0, playerA, "PRESENT", null)))
                .andExpect(status().isOk());
        UUID sessionId = jdbc.queryForObject("select id from attendance_sessions where academy_id = ? and group_id = ?",
                UUID.class, a.getId(), UUID.fromString(groupA));
        assertThatThrownBy(() -> jdbc.update("""
                insert into attendance_records (id, academy_id, session_id, player_id, status)
                values (?, ?, ?, ?, 'PRESENT')
                """, UUID.randomUUID(), a.getId(), sessionId, UUID.fromString(playerB)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_attendance_record_player");
        assertThatThrownBy(() -> jdbc.update("""
                insert into attendance_sessions (id, academy_id, group_id, training_date)
                values (?, ?, ?, ?)
                """, UUID.randomUUID(), a.getId(), UUID.fromString(groupB), LocalDate.now().minusDays(2)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_attendance_session_group");
    }

    @Test
    void parentAndUnverifiedStaffCannotAccessRoster() throws Exception {
        String group = group(tokenA, a, "Group");
        String player = player(tokenA, a, group);
        for (String path : new String[]{"/groups", "/players", "/groups/" + group, "/players/" + player}) {
            mvc.perform(get(base(a) + path).header("Authorization", tokenParent)).andExpect(status().isForbidden());
        }
        jdbc.update("update app_users set email_verified = false where id = ?", adminA.getId());
        mvc.perform(get(base(a) + "/groups").header("Authorization", tokenA)).andExpect(status().isForbidden());
        mvc.perform(get(base(a) + "/groups")).andExpect(status().isUnauthorized());
    }

    @Test
    void databaseRejectsCrossAcademyRelationsWithoutRelyingOnApi() throws Exception {
        UUID group = UUID.fromString(group(tokenA, a, "Group"));
        assertThatThrownBy(() -> jdbc.update("insert into players (id, academy_id, group_id, full_name, date_of_birth) values (?, ?, ?, 'Player', '2015-01-01')",
                UUID.randomUUID(), b.getId(), group)).isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("fk_player_group");
        var foreignCoach = member(b, "foreign-coach", AcademyRole.COACH);
        UUID foreignMembership = memberships.findByAcademyIdAndUserId(b.getId(), foreignCoach.getId()).orElseThrow().getId();
        assertThatThrownBy(() -> jdbc.update("insert into group_coaches (id, academy_id, group_id, membership_id) values (?, ?, ?, ?)",
                UUID.randomUUID(), a.getId(), group, foreignMembership))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("fk_coach_membership");
        assertThatThrownBy(() -> jdbc.update("""
                insert into scheduled_trainings
                    (id, academy_id, group_id, coach_membership_id, training_date, start_time, end_time, status)
                values (?, ?, ?, ?, ?, '10:00', '11:00', 'SCHEDULED')
                """, UUID.randomUUID(), a.getId(), group, foreignMembership, LocalDate.now()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("fk_scheduled_training_coach");
        UUID parentMembership = memberships.findByAcademyIdAndUserId(a.getId(), parent.getId()).orElseThrow().getId();
        assertThatThrownBy(() -> jdbc.update("insert into group_coaches (id, academy_id, group_id, membership_id) values (?, ?, ?, ?)",
                UUID.randomUUID(), a.getId(), group, parentMembership))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("fk_coach_role");
    }

    @Test
    void validatesInputAndPaginationAndAllowsOwner() throws Exception {
        String group = group(tokenA, a, "Group");
        mvc.perform(post(base(a) + "/groups").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \",\"ageCategory\":\"U10\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base(a) + "/players").header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(playerJson(group).replace("2015-01-01", "2999-01-01")))
                .andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/groups?size=101").header("Authorization", tokenA)).andExpect(status().isBadRequest());
        mvc.perform(get(base(a) + "/players?page=-1").header("Authorization", tokenA)).andExpect(status().isBadRequest());
        var owner = users.save(User.platformOwner("owner@example.kz", "Owner", "test-encoded-password"));
        mvc.perform(get(base(a) + "/groups").header("Authorization", token(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }

    private User member(Academy academy, String name, AcademyRole... roles) {
        User user = new User(name + "@example.kz", name, "test-encoded-password");
        user.confirmEmail();
        user = users.save(user);
        memberships.save(new AcademyMembership(academy, user, roles));
        return user;
    }
    private String token(User user) { return "Bearer " + jwt.issue(user.getId()).accessToken(); }
    private String base(Academy academy) { return "/api/academies/" + academy.getId(); }
    private String group(String token, Academy academy, String name) throws Exception {
        String response = mvc.perform(post(base(academy) + "/groups").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + name + "\",\"ageCategory\":\"U10\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }
    private String player(String token, Academy academy, String group) throws Exception {
        String response = mvc.perform(post(base(academy) + "/players").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(playerJson(group)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }
    private String playerJson(String group) {
        return """
                {"groupId":"%s","fullName":"Player","dateOfBirth":"2015-01-01",
                 "parentName":"Parent","parentPhone":"+77001234567","parentEmail":"parent@example.kz"}
                """.formatted(group);
    }
    private String updatePlayer(String group, int version) {
        return "{\"version\":" + version + ",\"details\":" + playerJson(group) + "}";
    }
    private String attendanceJson(long version, String playerId, String status, String comment) {
        String commentJson = comment == null ? "null" : "\"" + comment + "\"";
        return """
                {"version":%d,"records":[{"playerId":"%s","status":"%s","comment":%s}]}
                """.formatted(version, playerId, status, commentJson);
    }

    private String assessmentJson(String date, String technique, String comment) {
        String commentJson = comment == null ? "null" : "\"" + comment + "\"";
        return """
                {"assessmentDate":"%s","technique":%s,"speed":7.5,"endurance":8.0,
                 "physicalFitness":7.8,"gameIntelligence":8.2,"comment":%s}
                """.formatted(date, technique, commentJson);
    }

    private String training(String token, Academy academy, String groupId, UUID coachUserId,
            String date, String startTime, String endTime) throws Exception {
        String response = mvc.perform(post(base(academy) + "/trainings").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(groupId, coachUserId, date, startTime, endTime, "SCHEDULED")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private String trainingJson(String groupId, UUID coachUserId, String date,
            String startTime, String endTime, String status) {
        return """
                {"groupId":"%s","coachUserId":"%s","trainingDate":"%s",
                 "startTime":"%s","endTime":"%s","location":"Main field","status":"%s"}
                """.formatted(groupId, coachUserId, date, startTime, endTime, status);
    }
}
