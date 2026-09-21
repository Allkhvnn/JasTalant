package kz.jastalant.backend.security;

import kz.jastalant.backend.auth.dto.AccessTokenResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final Clock clock;
    private final String issuer;
    public JwtService(JwtEncoder encoder, Clock clock, @Value("${app.jwt.issuer}") String issuer) {
        this.encoder = encoder;
        this.clock = clock;
        this.issuer = issuer;
    }

    public AccessTokenResponse issue(UUID userId) {
        Instant now = clock.instant();
        var claims = JwtClaimsSet.builder().issuer(issuer).subject(userId.toString())
                .audience(List.of("jastalant-api")).issuedAt(now).expiresAt(now.plusSeconds(900))
                .id(UUID.randomUUID().toString()).build();
        String token = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new AccessTokenResponse(token, "Bearer", 900);
    }
}
