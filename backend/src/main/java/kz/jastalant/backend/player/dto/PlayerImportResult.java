package kz.jastalant.backend.player.dto;

import java.util.List;

public record PlayerImportResult(int totalRows, int validRows, int importedRows,
        List<PlayerImportError> errors) {}
