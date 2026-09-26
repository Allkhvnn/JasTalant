package kz.jastalant.backend.common.dto;

public record AvatarData(byte[] bytes, String contentType, long version) {}
