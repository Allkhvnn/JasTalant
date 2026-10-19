package kz.jastalant.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class MailTransportConfigurationTests {
    // No application components are registered: no database access or SMTP connections.
    private ApplicationContextRunner context(String profiles) {
        return new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("spring.profiles.active=" + profiles,
                        "SMTP_HOST=smtp.gmail.com", "SMTP_PORT=587",
                        "SMTP_USERNAME=demo@example.com", "SMTP_PASSWORD=dummy-app-password",
                        "SMTP_AUTH=true", "SMTP_STARTTLS=true", "SMTP_TEST_CONNECTION=true",
                        "MAIL_FROM=demo@example.com");
    }

    @Test
    void localCapturesEmailEvenWhenGmailCredentialsAreConfigured() {
        context("local").run(application -> {
            assertThat(application).hasNotFailed();
            var environment = application.getEnvironment();
            assertThat(environment.getProperty("spring.mail.host")).isEqualTo("localhost");
            assertThat(environment.getProperty("spring.mail.port", Integer.class)).isEqualTo(1025);
            assertThat(environment.getProperty("spring.mail.username").isEmpty()).isTrue();
            assertThat(environment.getProperty("spring.mail.password").isEmpty()).isTrue();
            assertThat(environment.getProperty("spring.mail.properties.mail.smtp.auth", Boolean.class)).isFalse();
            assertThat(environment.getProperty("spring.mail.test-connection", Boolean.class)).isFalse();
            assertThat(environment.getProperty("app.mail.from")).isEqualTo("no-reply@jastalant.local");
        });
    }

    @Test
    void explicitSmtpProfileOverridesLocalCaptureForDemoAndPilot() {
        context("local,smtp").run(application -> {
            assertThat(application).hasNotFailed();
            var environment = application.getEnvironment();
            assertThat(environment.getProperty("spring.mail.host")).isEqualTo("smtp.gmail.com");
            assertThat(environment.getProperty("spring.mail.port", Integer.class)).isEqualTo(587);
            assertThat(environment.getProperty("spring.mail.username")).isEqualTo("demo@example.com");
            assertThat(environment.getProperty("spring.mail.properties.mail.smtp.auth", Boolean.class)).isTrue();
            assertThat(environment.getProperty("spring.mail.properties.mail.smtp.starttls.required", Boolean.class)).isTrue();
            assertThat(environment.getProperty("spring.mail.properties.mail.smtp.ssl.checkserveridentity", Boolean.class)).isTrue();
            assertThat(environment.getProperty("spring.mail.test-connection", Boolean.class)).isTrue();
            assertThat(environment.getProperty("app.mail.from")).isEqualTo("demo@example.com");
        });
    }
}
