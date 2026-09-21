package kz.jastalant.backend.onboarding.dto;

import java.util.List;

public record ApplicationPage(List<ApplicationView> items, int page, int size, long totalElements) {}
