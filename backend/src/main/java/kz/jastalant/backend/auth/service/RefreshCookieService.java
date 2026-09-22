package kz.jastalant.backend.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import java.time.Duration;

@Component
public class RefreshCookieService {
    public static final String NAME = "jastalant_refresh";
    private final boolean secure;
    private final Duration lifetime;

    public RefreshCookieService(@Value("${app.auth.refresh-cookie-secure:true}") boolean secure,
                                @Value("${app.auth.refresh-days:30}") long refreshDays) {
        this.secure = secure;
        this.lifetime = Duration.ofDays(refreshDays);
    }
    public String create(String token) { return base(token).maxAge(lifetime).build().toString(); }
    public String clear() { return base("").maxAge(Duration.ZERO).build().toString(); }
    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Lax").path("/api/auth");
    }
}
