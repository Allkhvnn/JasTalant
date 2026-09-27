package kz.jastalant.backend.player.dto;

public record PlayerImportError(int row, String field, String message) {}
