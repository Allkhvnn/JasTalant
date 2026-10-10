package kz.jastalant.backend.onboarding.service;

import kz.jastalant.backend.onboarding.repository.ApplicationDecisionMailRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;

@Service
@Slf4j
public class ApplicationMailDeliveryService {
    private final ApplicationDecisionMailRepository messages;
    private final JavaMailSender mail;
    private final Clock clock;
    private final String from;

    public ApplicationMailDeliveryService(ApplicationDecisionMailRepository messages, JavaMailSender mail,
            Clock clock, @Value("${app.mail.from}") String from) {
        this.messages = messages;
        this.mail = mail;
        this.clock = clock;
        this.from = from;
    }

    @Transactional
    public boolean deliverNext() {
        var next = messages.lockNextDue(clock.instant());
        if (next.isEmpty()) return false;
        var queued = next.orElseThrow();
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(queued.getRecipient());
        message.setSubject(queued.getSubject());
        message.setText(queued.getBody());
        try {
            mail.send(message);
            queued.delivered(clock.instant());
        } catch (MailException failure) {
            queued.retryLater(clock.instant());
            // Do not log addresses, message bodies or SMTP exception details.
            log.warn("Decision mail {} failed ({}); retry scheduled, attempt {}",
                    queued.getId(), failure.getClass().getSimpleName(), queued.getAttempts());
        }
        return true;
    }
}
