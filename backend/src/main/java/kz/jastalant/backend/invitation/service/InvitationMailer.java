package kz.jastalant.backend.invitation.service;

import kz.jastalant.backend.common.mail.MailLanguage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class InvitationMailer {
    private final JavaMailSender mail;
    private final String from;
    private final String frontendUrl;

    public InvitationMailer(JavaMailSender mail, @Value("${app.mail.from}") String from,
                            @Value("${app.frontend-url}") String frontendUrl) {
        this.mail = mail;
        this.from = from;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public void send(String email, String academyName, String token) {
        var language = MailLanguage.current();
        String link = UriComponentsBuilder.fromUriString(frontendUrl).path("/accept-invitation")
                .queryParam("token", token).queryParam("lang", language.tag()).build().toUriString();
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(language.text("invitation.subject"));
        message.setText(language.text("invitation.body", academyName, link));
        mail.send(message);
    }
}
