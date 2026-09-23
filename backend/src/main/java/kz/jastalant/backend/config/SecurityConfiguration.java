package kz.jastalant.backend.config;

import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import java.util.List;
import java.util.UUID;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfiguration {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, UserRepository users) throws Exception {
        return http
                .csrf(csrf -> csrf.disable()) // API accepts Bearer headers, never session cookies.
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable()).logout(logout -> logout.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login", "/api/auth/verify-email",
                                "/api/auth/refresh", "/api/auth/logout", "/api/auth/forgot-password", "/api/auth/reset-password",
                                "/api/invitations/preview", "/api/invitations/accept-new").permitAll()
                        .requestMatchers("/api/platform/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/academies/*/groups", "/api/academies/*/groups/**",
                                "/api/academies/*/players", "/api/academies/*/players/**",
                                "/api/academies/*/trainings", "/api/academies/*/trainings/**",
                                "/api/academies/*/members", "/api/academies/*/members/**",
                                "/api/academies/*/invitations", "/api/academies/*/invitations/**",
                                "/api/academies/*/parent/**", "/api/academies/*/parents/**",
                                "/api/invitations/accept").authenticated()
                        .requestMatchers("/api/auth/me", "/api/auth/academies", "/api/auth/resend-verification", "/api/applications/mine", "/api/academies/*").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(token -> {
                    var user = users.findById(UUID.fromString(token.getSubject()))
                            .orElseThrow(() -> new OAuth2AuthenticationException(new OAuth2Error("invalid_token")));
                    String role = user.isEmailVerified() ? user.getPlatformRole().name() : "USER";
                    return new JwtAuthenticationToken(token, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                })))
                .build();
    }
}
