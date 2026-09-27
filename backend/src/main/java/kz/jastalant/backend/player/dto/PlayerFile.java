package kz.jastalant.backend.player.dto;

public record PlayerFile(byte[] bytes, String contentType, String filename) {}
