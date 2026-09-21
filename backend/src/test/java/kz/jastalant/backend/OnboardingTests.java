package kz.jastalant.backend;

import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.onboarding.service.ApplicationService;
import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.util.UUID;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class OnboardingTests {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired ApplicationService applications;
    @Autowired JwtEncoder jwtEncoder;
    @MockitoBean JavaMailSender mail;
    static final String PASSWORD = "A-long-test-password-42";

    @BeforeEach
    void clearData() {
        jdbc.execute("delete from academy_applications");
        jdbc.execute("delete from academy_memberships");
        jdbc.execute("delete from academies");
        jdbc.execute("delete from app_users");
        reset(mail);
    }

    @Test
    void registrationVerificationApprovalAndAcademyAccess() throws Exception {
        String id = register("admin@example.kz");
        var saved = users.findByEmail("admin@example.kz").orElseThrow();
        assertThat(saved.getPlatformRole()).isEqualTo(PlatformRole.USER);
        assertThat(saved.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(passwords.matches(PASSWORD, saved.getPasswordHash())).isTrue();
        String code = verificationCode();
        assertThat(saved.getVerificationTokenHash()).isNotEqualTo(code).hasSize(64);
        String token = login("admin@example.kz");
        mvc.perform(get("/api/auth/academies").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/applications/mine").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("EMAIL_UNVERIFIED"));
        String owner = ownerToken();
        mvc.perform(post("/api/platform/applications/" + id + "/approve").header("Authorization", bearer(owner)))
                .andExpect(status().isConflict());
        verifyEmail(code, 204);
        verifyEmail(code, 400);
        mvc.perform(get("/api/applications/mine").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.status").value("PENDING"));
        mvc.perform(get("/api/platform/applications").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        String response = mvc.perform(post("/api/platform/applications/" + id + "/approve").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn().getResponse().getContentAsString();
        String academyId = JsonPath.read(response, "$.academyId");
        mvc.perform(get("/api/auth/academies").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].academyId").value(academyId))
                .andExpect(jsonPath("$[0].academyName").value("Test Academy"))
                .andExpect(jsonPath("$[0].roles[0]").value("ADMIN"));
        mvc.perform(get("/api/academies/" + academyId).header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ADMIN"));
        mvc.perform(post("/api/platform/applications/" + id + "/approve").header("Authorization", bearer(owner)))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from academies", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from academy_memberships", Integer.class)).isEqualTo(1);
    }

    @Test
    void applicantCannotReviewOrReadAnotherAcademy() throws Exception {
        String id = register("first@example.kz");
        verifyEmail(verificationCode(), 204);
        String owner = ownerToken();
        String approved = mvc.perform(post("/api/platform/applications/" + id + "/approve").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String academyId = JsonPath.read(approved, "$.academyId");
        String secondId = register("second@example.kz");
        verifyEmail(verificationCode(), 204);
        String token = login("second@example.kz");
        mvc.perform(get("/api/platform/applications").header("Authorization", bearer(token))).andExpect(status().isForbidden());
        mvc.perform(post("/api/platform/applications/" + id + "/approve").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/platform/applications/" + id + "/reject").header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Denied\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/applications/mine").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.id").value(secondId));
        mvc.perform(get("/api/academies/" + academyId).header("Authorization", bearer(token))).andExpect(status().isNotFound());
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.verificationTokenHash").doesNotExist());
    }

    @Test
    void rejectionDoesNotCreateAcademyAndCannotBeReapproved() throws Exception {
        String id = register("rejected@example.kz");
        verifyEmail(verificationCode(), 204);
        String owner = ownerToken();
        mvc.perform(post("/api/platform/applications/" + id + "/reject").header("Authorization", bearer(owner))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\" \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/platform/applications/" + id + "/reject").header("Authorization", bearer(owner))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\" Please clarify academy details \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        mvc.perform(get("/api/applications/mine").header("Authorization", bearer(login("rejected@example.kz"))))
                .andExpect(jsonPath("$.rejectionReason").value("Please clarify academy details"));
        mvc.perform(post("/api/platform/applications/" + id + "/approve").header("Authorization", bearer(owner)))
                .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from academies", Integer.class)).isZero();
    }

    @Test
    void expiredCodeAndResendInvalidateOldCode() throws Exception {
        register("resend@example.kz");
        String oldCode = verificationCode();
        String token = login("resend@example.kz");
        mvc.perform(post("/api/auth/resend-verification").header("Authorization", bearer(token))).andExpect(status().isTooManyRequests());
        jdbc.update("update app_users set verification_expires_at = now() - interval '1 second' where email = 'resend@example.kz'");
        verifyEmail(oldCode, 400);
        mvc.perform(post("/api/auth/resend-verification").header("Authorization", bearer(token))).andExpect(status().isNoContent());
        String newCode = verificationCode();
        assertThat(newCode).isNotEqualTo(oldCode);
        verifyEmail(oldCode, 400);
        verifyEmail(newCode, 204);
    }

    @Test
    void registrationCannotAssignPlatformRoleAndRejectsDuplicates() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                {"academyName":"Academy","fullName":"Applicant","email":"SELF@example.kz",
                 "password":"A-long-test-password-42","platformRole":"SUPER_ADMIN","emailVerified":true}
                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("EMAIL_UNVERIFIED"));
        var user = users.findByEmail("self@example.kz").orElseThrow();
        assertThat(user.getPlatformRole()).isEqualTo(PlatformRole.USER);
        assertThat(user.isEmailVerified()).isFalse();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registrationJson("self@example.kz")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void badCredentialsAndTamperedTokensAreRejected() throws Exception {
        register("login@example.kz");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"login@example.kz\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        String token = login("login@example.kz");
        String[] parts = token.split("\\.");
        String forged = parts[0] + "." + parts[1] + "." + (parts[2].charAt(0) == 'A' ? "B" : "A") + parts[2].substring(1);
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(forged))).andExpect(status().isUnauthorized());
    }

    @Test
    void ownerPrivilegeRemovalTakesEffectForExistingToken() throws Exception {
        String token = ownerToken();
        mvc.perform(get("/api/platform/applications").header("Authorization", bearer(token))).andExpect(status().isOk());
        jdbc.update("update app_users set platform_role = 'USER' where email = 'owner@example.kz'");
        mvc.perform(get("/api/platform/applications").header("Authorization", bearer(token))).andExpect(status().isForbidden());
    }

    @Test
    void smtpFailureRollsBackRegistration() throws Exception {
        doThrow(new MailSendException("SMTP unavailable")).when(mail).send(any(SimpleMailMessage.class));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registrationJson("mail@example.kz")))
                .andExpect(status().isServiceUnavailable());
        assertThat(users.findByEmail("mail@example.kz")).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from academy_applications", Integer.class)).isZero();
    }

    @Test
    void concurrentApprovalsCreateOnlyOneAcademy() throws Exception {
        UUID id = UUID.fromString(register("race@example.kz"));
        verifyEmail(verificationCode(), 204);
        ownerToken();
        UUID owner = users.findByEmail("owner@example.kz").orElseThrow().getId();
        CountDownLatch start = new CountDownLatch(1);
        Callable<Integer> approve = () -> {
            start.await(10, TimeUnit.SECONDS);
            try { applications.approve(owner, id); return 200; }
            catch (BusinessException exception) { if (exception.getCode() == ErrorCode.CONFLICT) return 409; throw exception; }
        };
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(approve);
            var second = executor.submit(approve);
            start.countDown();
            assertThat(java.util.List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(jdbc.queryForObject("select count(*) from academies", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from academy_memberships", Integer.class)).isEqualTo(1);
    }

    @Test
    void expiredAndWrongAudienceTokensAreRejected() throws Exception {
        var user = users.save(User.platformOwner("owner@example.kz", "Owner", passwords.encode(PASSWORD)));
        for (var claims : List.of(
                JwtClaimsSet.builder().issuer("jastalant").subject(user.getId().toString())
                        .audience(List.of("jastalant-api")).issuedAt(Instant.now().minusSeconds(3600))
                        .expiresAt(Instant.now().minusSeconds(120)).build(),
                JwtClaimsSet.builder().issuer("jastalant").subject(user.getId().toString())
                        .audience(List.of("another-api")).expiresAt(Instant.now().plusSeconds(900)).build(),
                JwtClaimsSet.builder().issuer("another-issuer").subject(user.getId().toString())
                        .audience(List.of("jastalant-api")).expiresAt(Instant.now().plusSeconds(900)).build())) {
            String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
            mvc.perform(get("/api/auth/me").header("Authorization", bearer(token))).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void approvalRollsBackAcademyWhenMembershipCannotBeCreated() throws Exception {
        String id = register("rollback@example.kz");
        verifyEmail(verificationCode(), 204);
        String owner = ownerToken();
        // A temporary constraint in this test database simulates a failure after academy insertion.
        jdbc.execute("alter table academy_memberships add constraint simulated_insert_failure check (false)");
        try {
            mvc.perform(post("/api/platform/applications/" + id + "/approve").header("Authorization", bearer(owner)))
                    .andExpect(status().isConflict());
            assertThat(jdbc.queryForObject("select count(*) from academies", Integer.class)).isZero();
            assertThat(jdbc.queryForObject("select status from academy_applications where id = ?", String.class, UUID.fromString(id)))
                    .isEqualTo("PENDING");
        } finally {
            jdbc.execute("alter table academy_memberships drop constraint simulated_insert_failure");
        }
    }

    @Test
    void offlineBootstrapCreatesVerifiedOwnerAndRefusesSecondOwner() {
        try (var context = bootstrapOwner()) {
            assertThat(context.isActive()).isFalse();
        }
        var owner = users.findByEmail("bootstrap@example.kz").orElseThrow();
        assertThat(owner.getPlatformRole()).isEqualTo(PlatformRole.SUPER_ADMIN);
        assertThat(owner.isEmailVerified()).isTrue();
        assertThat(passwords.matches(PASSWORD, owner.getPasswordHash())).isTrue();
        assertThatThrownBy(this::bootstrapOwner).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("select count(*) from app_users where platform_role = 'SUPER_ADMIN'", Integer.class)).isEqualTo(1);
    }

    private org.springframework.context.ConfigurableApplicationContext bootstrapOwner() {
        return new SpringApplicationBuilder(BackendApplication.class).web(WebApplicationType.NONE)
                .profiles("test", "bootstrap-admin").run(
                        "--spring.main.web-application-type=none",
                        "--spring.datasource.url=" + postgres.getJdbcUrl(),
                        "--spring.datasource.username=" + postgres.getUsername(),
                        "--spring.datasource.password=" + postgres.getPassword(),
                        "--BOOTSTRAP_ADMIN_EMAIL=bootstrap@example.kz",
                        "--BOOTSTRAP_ADMIN_NAME=Owner",
                        "--BOOTSTRAP_ADMIN_PASSWORD=" + PASSWORD);
    }

    private String register(String email) throws Exception {
        String response = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(registrationJson(email)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    private String registrationJson(String email) {
        return """
                {"academyName":"Test Academy","fullName":"Applicant","email":"%s","password":"%s"}
                """.formatted(email, PASSWORD);
    }

    private String verificationCode() {
        var captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, atLeastOnce()).send(captor.capture());
        return captor.getValue().getText().split("\n\n")[1];
    }

    private void verifyEmail(String token, int expected) throws Exception {
        mvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().is(expected));
    }

    private String login(String email) throws Exception {
        String response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.accessToken");
    }

    private String ownerToken() throws Exception {
        users.save(User.platformOwner("owner@example.kz", "Owner", passwords.encode(PASSWORD)));
        return login("owner@example.kz");
    }

    private String bearer(String token) { return "Bearer " + token; }
}
