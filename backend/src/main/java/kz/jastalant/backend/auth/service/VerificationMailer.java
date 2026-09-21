package kz.jastalant.backend.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class VerificationMailer {
    private final JavaMailSender mail;
    private final String from;
    public VerificationMailer(JavaMailSender mail, @Value("${app.mail.from}") String from) {
        this.mail = mail;
        this.from = from;
    }

    public void send(String email, String token) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("JasTalant — подтверждение email");
        message.setText("Код подтверждения email в JasTalant (действует 24 часа):\n\n" + token
                + "\n\nЕсли вы не регистрировались, проигнорируйте письмо.");
        mail.send(message);
    }
}
