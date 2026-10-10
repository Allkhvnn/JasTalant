package kz.jastalant.backend.onboarding.service;

import kz.jastalant.backend.common.mail.MailLanguage;
import kz.jastalant.backend.onboarding.entity.AcademyApplication;
import kz.jastalant.backend.onboarding.entity.ApplicationDecisionMail;
import kz.jastalant.backend.onboarding.entity.ApplicationStatus;
import kz.jastalant.backend.onboarding.repository.ApplicationDecisionMailRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Clock;

@Component
public class ApplicationDecisionMailer {
    private final ApplicationDecisionMailRepository messages;
    private final Clock clock;
    private final String frontendUrl;

    public ApplicationDecisionMailer(ApplicationDecisionMailRepository messages, Clock clock,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.messages = messages;
        this.clock = clock;
        this.frontendUrl = frontendUrl;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(AcademyApplication application) {
        var language = MailLanguage.forTag(application.getMailLanguage());
        String link = UriComponentsBuilder.fromUriString(frontendUrl).path("/application")
                .queryParam("lang", language.tag()).build().toUriString();
        boolean approved = application.getStatus() == ApplicationStatus.APPROVED;
        String key = approved ? "application.approved" : "application.rejected";
        String body = approved ? language.text(key + ".body", application.getAcademyName(), link)
                : language.text(key + ".body", application.getAcademyName(), application.getRejectionReason(), link);
        messages.save(new ApplicationDecisionMail(application.getId(), application.getApplicant().getEmail(),
                language.text(key + ".subject"), body, clock.instant()));
    }
}
