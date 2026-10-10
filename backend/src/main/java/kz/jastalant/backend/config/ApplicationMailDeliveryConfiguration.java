package kz.jastalant.backend.config;

import kz.jastalant.backend.onboarding.service.ApplicationMailDeliveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@ConditionalOnWebApplication
@ConditionalOnProperty(name = "app.mail.delivery-enabled", havingValue = "true", matchIfMissing = true)
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class ApplicationMailDeliveryConfiguration {
    private final ApplicationMailDeliveryService delivery;

    @Scheduled(fixedDelayString = "${app.mail.delivery-delay-ms:10000}", initialDelayString = "${app.mail.delivery-delay-ms:10000}")
    public void deliver() {
        try {
            for (int i = 0; i < 20 && delivery.deliverNext(); i++) {
                // Each call commits independently so one failed transaction cannot undo other deliveries.
            }
        } catch (RuntimeException failure) {
            log.error("Decision mail worker failed ({})", failure.getClass().getSimpleName());
        }
    }
}
