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
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
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
}
