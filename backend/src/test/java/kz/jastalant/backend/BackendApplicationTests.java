package kz.jastalant.backend;

import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.membership.entity.AcademyMembership;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import java.sql.DriverManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@Transactional
class BackendApplicationTests {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");

	@Autowired
	JdbcTemplate jdbcTemplate;

	@Autowired AcademyRepository academies;
	@Autowired UserRepository users;
	@Autowired AcademyMembershipRepository memberships;
	@Autowired EntityManager entityManager;

	@Test
	void contextLoadsWithPostgresAndFlyway() {
		assertThat(jdbcTemplate.queryForObject("select current_database()", String.class))
				.isEqualTo(postgres.getDatabaseName());
		assertThat(jdbcTemplate.queryForObject(
				"select count(*) from flyway_schema_history where success = false", Integer.class))
				.isZero();
		assertThat(jdbcTemplate.queryForObject(
				"select count(*) from flyway_schema_history where version in ('1', '2') and success", Integer.class))
				.isEqualTo(2);
	}

	@Test
	void sameUserCanHaveDifferentRolesInDifferentAcademies() {
		var first = academies.save(new Academy("Almaty"));
		var second = academies.save(new Academy("Astana"));
		var user = users.save(new User(" Coach@Example.kz ", "Coach", "encoded-test-password"));
		memberships.save(new AcademyMembership(first, user, AcademyRole.ADMIN));
		memberships.save(new AcademyMembership(second, user, AcademyRole.COACH));
		entityManager.flush();
		entityManager.clear();
		assertThat(users.findByEmail("coach@example.kz")).isPresent();
		assertThat(memberships.findByAcademyIdAndUserId(first.getId(), user.getId()))
				.get().extracting(AcademyMembership::getRoles).isEqualTo(java.util.Set.of(AcademyRole.ADMIN));
		assertThat(memberships.findByAcademyIdAndUserId(second.getId(), user.getId()))
				.get().extracting(AcademyMembership::getRoles).isEqualTo(java.util.Set.of(AcademyRole.COACH));
	}

	@Test
	void membershipQueriesAreScopedToAcademy() {
		var first = academies.save(new Academy("First"));
		var second = academies.save(new Academy("Second"));
		var user = users.save(new User("admin@example.kz", "Admin", "encoded-test-password"));
		memberships.save(new AcademyMembership(first, user, AcademyRole.ADMIN));
		entityManager.flush();
		entityManager.clear();
		assertThat(memberships.findAllByAcademyId(first.getId())).hasSize(1);
		assertThat(memberships.findAllByAcademyId(second.getId())).isEmpty();
		assertThat(memberships.findByAcademyIdAndUserId(second.getId(), user.getId())).isEmpty();
	}

	@Test
	void databaseRejectsDuplicateMembership() {
		var academy = academies.save(new Academy("Academy"));
		var user = users.save(new User("admin@example.kz", "Admin", "encoded-test-password"));
		memberships.save(new AcademyMembership(academy, user, AcademyRole.ADMIN));
		entityManager.flush();
		assertThatThrownBy(() -> insertMembership(academy.getId(), user.getId(), "COACH"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void databaseRejectsUnknownRole() {
		var academy = academies.save(new Academy("Academy"));
		var user = users.save(new User("admin@example.kz", "Admin", "encoded-test-password"));
		entityManager.flush();
		assertThatThrownBy(() -> insertMembership(academy.getId(), user.getId(), "SUPERUSER"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void databaseRejectsMembershipWithMissingAcademy() {
		var user = users.save(new User("admin@example.kz", "Admin", "encoded-test-password"));
		entityManager.flush();
		assertThatThrownBy(() -> insertMembership(UUID.randomUUID(), user.getId(), "COACH"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void databaseRejectsDuplicateEmail() {
		users.save(new User("Admin@Example.kz", "Admin", "encoded-test-password"));
		entityManager.flush();
		assertThatThrownBy(() -> jdbcTemplate.update(
				"insert into app_users (id, email, full_name, password_hash) values (?, ?, ?, ?)",
				UUID.randomUUID(), "admin@example.kz", "Another", "encoded-test-password"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	private void insertMembership(UUID academyId, UUID userId, String role) {
		UUID membershipId = UUID.randomUUID();
		jdbcTemplate.update("insert into academy_memberships (id, academy_id, user_id) values (?, ?, ?)",
				membershipId, academyId, userId);
		jdbcTemplate.update("insert into academy_membership_roles (membership_id, role) values (?, ?)",
				membershipId, role);
	}

	@Test
	void coachCanAlsoBeParentWithoutGainingPlatformPrivileges() {
		var academy = academies.save(new Academy("Academy"));
		var user = users.save(new User("parent@example.kz", "Parent Coach", "encoded-test-password"));
		memberships.save(new AcademyMembership(academy, user, AcademyRole.COACH, AcademyRole.PARENT));
		entityManager.flush();
		entityManager.clear();
		assertThat(memberships.findByAcademyIdAndUserId(academy.getId(), user.getId()).orElseThrow().getRoles())
				.containsExactlyInAnyOrder(AcademyRole.COACH, AcademyRole.PARENT);
		assertThat(users.findByEmail("parent@example.kz").orElseThrow().getPlatformRole()).isEqualTo(PlatformRole.USER);
	}

	@Test
	void databaseRejectsSuperAdminAsAcademyRole() {
		var academy = academies.save(new Academy("Academy"));
		var user = users.save(new User("admin@example.kz", "Admin", "encoded-test-password"));
		entityManager.flush();
		assertThatThrownBy(() -> insertMembership(academy.getId(), user.getId(), "SUPER_ADMIN"))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("ck_academy_membership_role");
	}

	@Test
	void databaseRejectsDuplicateRole() {
		var academy = academies.save(new Academy("Academy"));
		var user = users.save(new User("parent@example.kz", "Parent", "encoded-test-password"));
		var membership = memberships.save(new AcademyMembership(academy, user, AcademyRole.PARENT));
		entityManager.flush();
		assertThatThrownBy(() -> jdbcTemplate.update(
				"insert into academy_membership_roles (membership_id, role) values (?, 'PARENT')", membership.getId()))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void platformSuperAdminDoesNotRequireAcademyMembership() {
		jdbcTemplate.update("insert into app_users (id, email, full_name, password_hash, platform_role) values (?, ?, ?, ?, ?)",
				UUID.randomUUID(), "owner@example.kz", "Owner", "encoded-test-password", "SUPER_ADMIN");
		assertThat(users.findByEmail("owner@example.kz").orElseThrow().getPlatformRole()).isEqualTo(PlatformRole.SUPER_ADMIN);
	}

	@Test
	void databaseRejectsAcademyRoleAsPlatformRole() {
		assertThatThrownBy(() -> jdbcTemplate.update(
				"insert into app_users (id, email, full_name, password_hash, platform_role) values (?, ?, ?, ?, ?)",
				UUID.randomUUID(), "admin@example.kz", "Admin", "encoded-test-password", "ADMIN"))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("ck_users_platform_role");
	}

	@Test
	void membershipRequiresAtLeastOneRole() {
		assertThatThrownBy(() -> new AcademyMembership(new Academy("Academy"),
				new User("parent@example.kz", "Parent", "encoded-test-password")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void migrationPreservesExistingMembershipRoles() throws Exception {
		String schema = "upgrade_roles";
		Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
				.defaultSchema(schema).target("1").load().migrate();
		try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
			 var statement = connection.createStatement()) {
			statement.execute("set search_path to upgrade_roles");
			statement.execute("insert into academies (id, name) values ('00000000-0000-0000-0000-000000000001', 'Existing')");
			statement.execute("insert into app_users (id, email, full_name, password_hash) values ('00000000-0000-0000-0000-000000000002', 'existing@example.kz', 'Existing', 'encoded-test-password')");
			statement.execute("insert into academy_memberships (id, academy_id, user_id, role) select gen_random_uuid(), a.id, u.id, 'ADMIN' from academies a cross join app_users u");
			statement.execute("insert into academies (id, name) values ('00000000-0000-0000-0000-000000000003', 'Second')");
			statement.execute("insert into academy_memberships (id, academy_id, user_id, role) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'COACH')");
			Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
					.defaultSchema(schema).load().migrate();
			try (var result = statement.executeQuery("select role from academy_membership_roles order by role")) {
				assertThat(result.next()).isTrue();
				assertThat(result.getString(1)).isEqualTo("ADMIN");
				assertThat(result.next()).isTrue();
				assertThat(result.getString(1)).isEqualTo("COACH");
				assertThat(result.next()).isFalse();
			}
			try (var result = statement.executeQuery("select platform_role from app_users")) {
				assertThat(result.next()).isTrue();
				assertThat(result.getString(1)).isEqualTo("USER");
			}
		}
	}

}
