package kz.jastalant.backend.academy.dto;

import java.util.List;

public record PlatformAcademyPage(List<PlatformAcademyView> items, int page, int size, long totalElements) {}
