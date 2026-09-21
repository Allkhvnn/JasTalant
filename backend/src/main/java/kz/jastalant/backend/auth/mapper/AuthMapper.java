package kz.jastalant.backend.auth.mapper;

import kz.jastalant.backend.auth.dto.AccountResponse;

import kz.jastalant.backend.user.entity.User;

public final class AuthMapper {
    private AuthMapper() {}
    public static AccountResponse toAccount(User user) {
        return new AccountResponse(user.getId(), user.getEmail(), user.getFullName(), user.isEmailVerified(), user.getPlatformRole());
    }
}
