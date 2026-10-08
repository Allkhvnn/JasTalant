package kz.jastalant.backend;

import kz.jastalant.backend.auth.service.PasswordResetMailer;
import kz.jastalant.backend.auth.service.VerificationMailer;
import kz.jastalant.backend.config.LocaleConfiguration;
import kz.jastalant.backend.invitation.service.InvitationMailer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.util.UriComponentsBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MailLocalizationTests {
    @AfterEach
    void clearRequestLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @ParameterizedTest
    @CsvSource({
            "ru-RU,ru,подтверждение email,восстановление пароля,приглашение в академию",
            "kk-KZ,kk,email растау,құпиясөзді қалпына келтіру,академияға шақыру",
            "en-US,en,email verification,password recovery,academy invitation",
            "de-DE,ru,подтверждение email,восстановление пароля,приглашение в академию",
            "'de-DE,en;q=0.8',en,email verification,password recovery,academy invitation",
            "'',ru,подтверждение email,восстановление пароля,приглашение в академию"
    })
    void requestLanguageSelectsEveryMailAndPreservesTokens(String header, String language,
            String verificationSubject, String resetSubject, String invitationSubject) {
        var request = new MockHttpServletRequest();
        if (!header.isEmpty()) request.addHeader("Accept-Language", header);
        var resolver = new LocaleConfiguration().localeResolver();
        LocaleContextHolder.setLocale(resolver.resolveLocale(request));
        var sender = mock(JavaMailSender.class);
        var verification = new VerificationMailer(sender, "noreply@example.kz");
        var reset = new PasswordResetMailer(sender, "noreply@example.kz", "https://crm.example.kz");
        var invitation = new InvitationMailer(sender, "noreply@example.kz", "https://crm.example.kz/");

        verification.send("user@example.kz", "safe-token_123");
        reset.send("user@example.kz", "safe-token_123");
        invitation.send("user@example.kz", "Academy %s — Балалар", "safe-token_123");

        var captor = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender, times(3)).send(captor.capture());
        var sent = captor.getAllValues();
        assertThat(sent.get(0).getSubject()).isEqualTo("JasTalant — " + verificationSubject);
        assertThat(sent.get(1).getSubject()).isEqualTo("JasTalant — " + resetSubject);
        assertThat(sent.get(2).getSubject()).isEqualTo("JasTalant — " + invitationSubject);
        assertThat(sent.get(0).getText().split("\n\n")[1]).isEqualTo("safe-token_123");
        assertThat(sent.get(2).getText()).contains("Academy %s — Балалар");
        for (int i = 1; i <= 2; i++) {
            var message = sent.get(i);
            String text = message.getText();
            String link = text.substring(text.indexOf("https://")).split("\\s")[0];
            var uri = UriComponentsBuilder.fromUriString(link).build();
            assertThat(uri.getQueryParams().getFirst("token")).isEqualTo("safe-token_123");
            assertThat(uri.getQueryParams().getFirst("lang")).isEqualTo(language);
            assertThat(uri.getPath()).isEqualTo(i == 1 ? "/reset-password" : "/accept-invitation");
            assertThat(message.getTo()).containsExactly("user@example.kz");
            assertThat(message.getFrom()).isEqualTo("noreply@example.kz");
        }
    }
}
