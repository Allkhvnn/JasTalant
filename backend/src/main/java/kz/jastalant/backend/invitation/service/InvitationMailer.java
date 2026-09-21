package kz.jastalant.backend.invitation.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

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
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("JasTalant — приглашение в академию");
        message.setText("Вас пригласили в академию «" + academyName + "».\n\n"
                + "Откройте ссылку (действует 72 часа):\n"
                + frontendUrl + "/accept-invitation?token=" + token
                + "\n\nЕсли вы не ожидали приглашение, проигнорируйте письмо.");
        mail.send(message);
    }
}
