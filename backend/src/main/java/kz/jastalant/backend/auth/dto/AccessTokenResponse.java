package kz.jastalant.backend.auth.dto;

public record AccessTokenResponse(String accessToken, String tokenType, long expiresIn) {}
