package kz.jastalant.backend.auth.service;

import kz.jastalant.backend.common.mail.MailLanguage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class PasswordResetMailer {
    private final JavaMailSender mail;
    private final String from;
    private final String frontendUrl;
    public PasswordResetMailer(JavaMailSender mail, @Value("${app.mail.from}") String from,
                               @Value("${app.frontend-url}") String frontendUrl) {
        this.mail = mail; this.from = from; this.frontendUrl = frontendUrl;
    }
    public void send(String email, String token) {
        var language = MailLanguage.current();
        String link = UriComponentsBuilder.fromUriString(frontendUrl).path("/reset-password")
                .queryParam("token", token).queryParam("lang", language.tag()).build().toUriString();
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(language.text("reset.subject"));
        message.setText(language.text("reset.body", link));
        mail.send(message);
    }
}
