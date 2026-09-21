package kz.jastalant.backend.auth.bootstrap;

import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;

import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import lombok.RequiredArgsConstructor;

@Component
@Profile("bootstrap-admin")
@RequiredArgsConstructor
public class OwnerBootstrap implements CommandLineRunner {
    private final Environment environment;
    private final Validator validator;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final ConfigurableApplicationContext context;

    private record Owner(@NotBlank @Email @Size(max = 254) String email,
                         @NotBlank @Size(max = 200) String name,
                         @NotBlank @Size(min = 12, max = 128) String password) {}

    @Override
    public void run(String... args) {
        if (!"none".equalsIgnoreCase(environment.getProperty("spring.main.web-application-type"))) {
            throw new IllegalStateException("Owner bootstrap requires spring.main.web-application-type=none");
        }
        var owner = new Owner(environment.getRequiredProperty("BOOTSTRAP_ADMIN_EMAIL"),
                environment.getRequiredProperty("BOOTSTRAP_ADMIN_NAME"),
                environment.getRequiredProperty("BOOTSTRAP_ADMIN_PASSWORD"));
        if (!validator.validate(owner).isEmpty()) throw new IllegalArgumentException("Invalid bootstrap credentials: valid email, name and 12–128 character password required");
        transactions.executeWithoutResult(status -> {
            jdbc.execute("select pg_advisory_xact_lock(746193820)");
            if (users.existsByPlatformRole(PlatformRole.SUPER_ADMIN)) throw new IllegalStateException("Platform owner already exists");
            if (users.findByEmail(User.normalizeEmail(owner.email())).isPresent()) throw new IllegalStateException("Email already registered; automatic privilege elevation is forbidden");
            users.save(User.platformOwner(owner.email(), owner.name(), passwords.encode(owner.password())));
        });
        SpringApplication.exit(context);
    }
}
