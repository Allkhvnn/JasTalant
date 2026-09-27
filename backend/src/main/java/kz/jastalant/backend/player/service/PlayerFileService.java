package kz.jastalant.backend.player.service;

import jakarta.validation.Validator;
import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.group.entity.TrainingGroup;
import kz.jastalant.backend.group.repository.TrainingGroupRepository;
import kz.jastalant.backend.player.dto.PlayerFile;
import kz.jastalant.backend.player.dto.PlayerImportError;
import kz.jastalant.backend.player.dto.PlayerImportResult;
import kz.jastalant.backend.player.dto.PlayerRequest;
import kz.jastalant.backend.player.mapper.PlayerMapper;
import kz.jastalant.backend.player.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlayerFileService {
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_ROWS = 5_000;
    private static final List<String> HEADERS = List.of(
            "group", "full_name", "date_of_birth", "parent_name", "parent_phone", "parent_email");

    private final PlayerRepository players;
    private final TrainingGroupRepository groups;
    private final AcademyPermissionService permissions;
    private final Validator validator;

    public PlayerFile template(UUID actor, UUID academyId, String format) {
        permissions.resolve(actor, academyId).requireManager();
        return write(format, List.of(), academyId, true);
    }

    public PlayerFile export(UUID actor, UUID academyId, String format) {
        permissions.resolve(actor, academyId).requireManager();
        return write(format, players.findAllByAcademyIdOrderByFullNameAscIdAsc(academyId), academyId, false);
    }

    @Transactional
    public PlayerImportResult importPlayers(UUID actor, UUID academyId, MultipartFile file, boolean dryRun) {
        permissions.resolve(actor, academyId).requireManager();
        validateFile(file);
        var academyGroups = groups.findAllByAcademyIdOrderByNameAscIdAsc(academyId);
        var rows = read(file);
        var errors = new ArrayList<PlayerImportError>();
        var requests = new ArrayList<PlayerRequest>();

        if (rows.size() > MAX_ROWS) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player import cannot exceed 5000 rows");
        }
        for (var row : rows) {
            var request = toRequest(row, academyGroups, errors);
            if (request != null) requests.add(request);
        }

        int validRows = rows.size() - distinctErrorRows(errors);
        if (!errors.isEmpty() || dryRun) {
            return new PlayerImportResult(rows.size(), validRows, 0, List.copyOf(errors));
        }
        requests.stream().map(request -> PlayerMapper.toEntity(academyId, request)).forEach(players::save);
        players.flush();
        return new PlayerImportResult(rows.size(), requests.size(), requests.size(), List.of());
    }

    private PlayerRequest toRequest(ImportRow row, List<TrainingGroup> academyGroups,
            List<PlayerImportError> errors) {
        int before = errors.size();
        UUID groupId = resolveGroup(row.number(), row.value("group"), academyGroups, errors);
        LocalDate birthDate = parseDate(row.number(), row.value("date_of_birth"), errors);
        var request = new PlayerRequest(groupId, clean(row.value("full_name")), birthDate,
                nullable(row.value("parent_name")), nullable(row.value("parent_phone")),
                nullable(row.value("parent_email")));
        validator.validate(request).stream()
                .sorted(Comparator.comparing(v -> v.getPropertyPath().toString()))
                .forEach(v -> {
                    String field = fileField(v.getPropertyPath().toString());
                    if (errors.stream().noneMatch(error -> error.row() == row.number() && error.field().equals(field))) {
                        errors.add(new PlayerImportError(row.number(), field,
                                validationMessage(v.getPropertyPath().toString())));
                    }
                });
        return errors.size() == before ? request : null;
    }

    private UUID resolveGroup(int row, String raw, List<TrainingGroup> academyGroups,
            List<PlayerImportError> errors) {
        String value = clean(raw);
        if (value.isEmpty()) {
            errors.add(new PlayerImportError(row, "group", "Group is required"));
            return null;
        }
        try {
            UUID id = UUID.fromString(value);
            return academyGroups.stream().filter(group -> group.getId().equals(id)).map(TrainingGroup::getId)
                    .findFirst().orElseGet(() -> {
                        errors.add(new PlayerImportError(row, "group", "Group does not belong to this academy"));
                        return null;
                    });
        } catch (IllegalArgumentException ignored) {
            var matches = academyGroups.stream().filter(group -> group.getName().equalsIgnoreCase(value)).toList();
            if (matches.size() == 1) return matches.getFirst().getId();
            errors.add(new PlayerImportError(row, "group",
                    matches.isEmpty() ? "Group was not found in this academy" : "Group name is ambiguous; use its UUID"));
            return null;
        }
    }

    private LocalDate parseDate(int row, String raw, List<PlayerImportError> errors) {
        try {
            return LocalDate.parse(clean(raw));
        } catch (DateTimeParseException exception) {
            errors.add(new PlayerImportError(row, "date_of_birth", "Use date format YYYY-MM-DD"));
            return null;
        }
    }

    private List<ImportRow> read(MultipartFile file) {
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
        try {
            if (name.endsWith(".csv")) return readCsv(file.getBytes());
            if (name.endsWith(".xlsx")) return readXlsx(file.getInputStream());
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player file could not be read");
        }
        throw new BusinessException(ErrorCode.INVALID_REQUEST, "Only CSV and XLSX player files are supported");
    }

    private List<ImportRow> readCsv(byte[] bytes) {
        String text = new String(bytes, StandardCharsets.UTF_8);
        if (text.startsWith("\uFEFF")) text = text.substring(1);
        char separator = csvSeparator(text);
        var records = parseCsv(text, separator);
        if (records.isEmpty()) throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player file is empty");
        var indexes = headerIndexes(records.getFirst());
        var result = new ArrayList<ImportRow>();
        for (int index = 1; index < records.size(); index++) {
            var cells = records.get(index);
            if (cells.stream().allMatch(String::isBlank)) continue;
            if (result.size() == MAX_ROWS) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player import cannot exceed 5000 rows");
            }
            result.add(new ImportRow(index + 1, rowValues(cells, indexes)));
        }
        return result;
    }

    private List<ImportRow> readXlsx(InputStream input) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(input)) {
            Sheet sheet = workbook.getSheet("Players");
            if (sheet == null) sheet = workbook.getNumberOfSheets() == 0 ? null : workbook.getSheetAt(0);
            if (sheet == null || sheet.getRow(sheet.getFirstRowNum()) == null) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player file is empty");
            }
            if (sheet.getLastRowNum() - sheet.getFirstRowNum() > MAX_ROWS) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player import cannot exceed 5000 rows");
            }
            var formatter = new DataFormatter(Locale.ROOT);
            Row header = sheet.getRow(sheet.getFirstRowNum());
            var headerCells = new ArrayList<String>();
            for (int i = 0; i < header.getLastCellNum(); i++) headerCells.add(formatter.formatCellValue(header.getCell(i)));
            var indexes = headerIndexes(headerCells);
            var result = new ArrayList<ImportRow>();
            for (int rowIndex = header.getRowNum() + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row excelRow = sheet.getRow(rowIndex);
                if (excelRow == null) continue;
                var cells = new ArrayList<String>();
                for (int i = 0; i < headerCells.size(); i++) {
                    Cell cell = excelRow.getCell(i);
                    if (cell != null && "date_of_birth".equals(headerAt(indexes, i))
                            && cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                        cells.add(cell.getLocalDateTimeCellValue().toLocalDate().toString());
                    } else {
                        cells.add(cell == null ? "" : formatter.formatCellValue(cell));
                    }
                }
                if (cells.stream().allMatch(String::isBlank)) continue;
                result.add(new ImportRow(rowIndex + 1, rowValues(cells, indexes)));
            }
            return result;
        }
    }

    private PlayerFile write(String rawFormat, List<kz.jastalant.backend.player.entity.Player> academyPlayers,
            UUID academyId, boolean template) {
        String format = normalizeFormat(rawFormat);
        var groupNames = groups.findAllByAcademyIdOrderByNameAscIdAsc(academyId).stream()
                .collect(Collectors.toMap(TrainingGroup::getId, TrainingGroup::getName));
        String prefix = template ? "players-template" : "players";
        return format.equals("csv") ? csvFile(academyPlayers, groupNames, prefix)
                : xlsxFile(academyPlayers, groupNames, prefix, template);
    }

    private PlayerFile csvFile(List<kz.jastalant.backend.player.entity.Player> academyPlayers,
            Map<UUID, String> groupNames, String prefix) {
        var output = new StringBuilder("\uFEFF").append(String.join(";", HEADERS)).append("\r\n");
        for (var player : academyPlayers) {
            var values = List.of(groupNames.getOrDefault(player.getGroupId(), player.getGroupId().toString()),
                    player.getFullName(), player.getDateOfBirth().toString(), value(player.getParentName()),
                    value(player.getParentPhone()), value(player.getParentEmail()));
            output.append(values.stream().map(this::csvCell).collect(Collectors.joining(";"))).append("\r\n");
        }
        return new PlayerFile(output.toString().getBytes(StandardCharsets.UTF_8),
                "text/csv;charset=UTF-8", prefix + ".csv");
    }

    private PlayerFile xlsxFile(List<kz.jastalant.backend.player.entity.Player> academyPlayers,
            Map<UUID, String> groupNames, String prefix, boolean template) {
        try (var workbook = new XSSFWorkbook(); var bytes = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Players");
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.size(); i++) {
                Cell cell = header.createCell(i, CellType.STRING);
                cell.setCellValue(HEADERS.get(i));
                cell.setCellStyle(headerStyle);
            }
            int rowIndex = 1;
            for (var player : academyPlayers) {
                Row row = sheet.createRow(rowIndex++);
                List<String> values = List.of(groupNames.getOrDefault(player.getGroupId(), player.getGroupId().toString()),
                        player.getFullName(), player.getDateOfBirth().toString(), value(player.getParentName()),
                        value(player.getParentPhone()), value(player.getParentEmail()));
                for (int i = 0; i < values.size(); i++) row.createCell(i, CellType.STRING).setCellValue(values.get(i));
            }
            int[] widths = {28, 34, 18, 34, 22, 32};
            for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i] * 256);
            sheet.createFreezePane(0, 1);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, Math.max(0, rowIndex - 1), 0, HEADERS.size() - 1));
            if (template) addInstructions(workbook);
            workbook.write(bytes);
            return new PlayerFile(bytes.toByteArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", prefix + ".xlsx");
        } catch (IOException exception) {
            throw new IllegalStateException("Could not create player workbook", exception);
        }
    }

    private void addInstructions(Workbook workbook) {
        Sheet sheet = workbook.createSheet("Instructions");
        String[] lines = {
                "Fill the Players sheet without renaming its columns.",
                "group: exact academy group name or group UUID (required)",
                "full_name: player full name (required, up to 200 characters)",
                "date_of_birth: YYYY-MM-DD (required, past date)",
                "parent_name, parent_phone, parent_email: optional",
                "Maximum: 5000 players per file."
        };
        for (int i = 0; i < lines.length; i++) sheet.createRow(i).createCell(0).setCellValue(lines[i]);
        sheet.setColumnWidth(0, 80 * 256);
    }

    private Map<String, Integer> headerIndexes(List<String> cells) {
        var aliases = Map.ofEntries(
                Map.entry("group", "group"), Map.entry("groupid", "group"), Map.entry("groupname", "group"),
                Map.entry("группа", "group"), Map.entry("fullname", "full_name"), Map.entry("фио", "full_name"),
                Map.entry("фиоигрока", "full_name"), Map.entry("dateofbirth", "date_of_birth"),
                Map.entry("датарождения", "date_of_birth"), Map.entry("parentname", "parent_name"),
                Map.entry("имяродителя", "parent_name"), Map.entry("parentphone", "parent_phone"),
                Map.entry("телефонродителя", "parent_phone"), Map.entry("parentemail", "parent_email"),
                Map.entry("emailродителя", "parent_email"));
        var indexes = new HashMap<String, Integer>();
        for (int i = 0; i < cells.size(); i++) {
            String normalized = normalizeHeader(cells.get(i));
            String canonical = aliases.get(normalized);
            if (canonical != null) indexes.putIfAbsent(canonical, i);
        }
        for (String required : List.of("group", "full_name", "date_of_birth")) {
            if (!indexes.containsKey(required)) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "Missing required column: " + required);
            }
        }
        return indexes;
    }

    private Map<String, String> rowValues(List<String> cells, Map<String, Integer> indexes) {
        return HEADERS.stream().collect(Collectors.toMap(Function.identity(),
                header -> indexes.containsKey(header) && indexes.get(header) < cells.size()
                        ? unprotect(cells.get(indexes.get(header))) : ""));
    }

    private List<List<String>> parseCsv(String text, char separator) {
        var rows = new ArrayList<List<String>>();
        var row = new ArrayList<String>();
        var cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char current = text.charAt(i);
            if (current == '"') {
                if (quoted && i + 1 < text.length() && text.charAt(i + 1) == '"') {
                    cell.append('"'); i++;
                } else quoted = !quoted;
            } else if (current == separator && !quoted) {
                row.add(cell.toString()); cell.setLength(0);
            } else if ((current == '\n' || current == '\r') && !quoted) {
                if (current == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') i++;
                row.add(cell.toString()); cell.setLength(0); rows.add(row); row = new ArrayList<>();
            } else cell.append(current);
        }
        if (quoted) throw new BusinessException(ErrorCode.INVALID_REQUEST, "CSV contains an unclosed quoted value");
        if (!row.isEmpty() || !cell.isEmpty()) { row.add(cell.toString()); rows.add(row); }
        return rows;
    }

    private char csvSeparator(String text) {
        boolean quoted = false;
        int commas = 0, semicolons = 0;
        for (int i = 0; i < text.length() && text.charAt(i) != '\n' && text.charAt(i) != '\r'; i++) {
            char current = text.charAt(i);
            if (current == '"') quoted = !quoted;
            else if (!quoted && current == ',') commas++;
            else if (!quoted && current == ';') semicolons++;
        }
        return semicolons >= commas ? ';' : ',';
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player file is required");
        if (file.getSize() > MAX_FILE_SIZE) throw new BusinessException(ErrorCode.INVALID_REQUEST, "Player file must not exceed 5 MB");
    }

    private String normalizeFormat(String format) {
        String value = Objects.requireNonNullElse(format, "xlsx").toLowerCase(Locale.ROOT);
        if (!value.equals("xlsx") && !value.equals("csv")) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Only CSV and XLSX formats are supported");
        }
        return value;
    }

    private String csvCell(String raw) {
        String value = protect(raw);
        return '"' + value.replace("\"", "\"\"") + '"';
    }

    private String protect(String value) {
        return !value.isEmpty() && "=+-@".indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
    }

    private String unprotect(String value) {
        return value.length() > 1 && value.charAt(0) == '\'' && "=+-@".indexOf(value.charAt(1)) >= 0
                ? value.substring(1) : value;
    }

    private String headerAt(Map<String, Integer> indexes, int index) {
        return indexes.entrySet().stream().filter(entry -> entry.getValue() == index).map(Map.Entry::getKey)
                .findFirst().orElse("");
    }

    private int distinctErrorRows(List<PlayerImportError> errors) {
        return (int) errors.stream().map(PlayerImportError::row).distinct().count();
    }

    private String validationMessage(String property) {
        return switch (property) {
            case "fullName" -> "Full name is required and must not exceed 200 characters";
            case "dateOfBirth" -> "Date of birth must be in the past";
            case "parentName" -> "Parent name must not exceed 200 characters";
            case "parentPhone" -> "Parent phone format is invalid";
            case "parentEmail" -> "Parent email format is invalid";
            default -> "Value is invalid";
        };
    }

    private String fileField(String property) {
        return switch (property) {
            case "fullName" -> "full_name";
            case "dateOfBirth" -> "date_of_birth";
            case "parentName" -> "parent_name";
            case "parentPhone" -> "parent_phone";
            case "parentEmail" -> "parent_email";
            case "groupId" -> "group";
            default -> property;
        };
    }

    private String normalizeHeader(String value) {
        return clean(value).toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
    }

    private String clean(String value) { return Objects.requireNonNullElse(value, "").strip(); }
    private String nullable(String value) { String cleaned = clean(value); return cleaned.isEmpty() ? null : cleaned; }
    private String value(String value) { return Objects.requireNonNullElse(value, ""); }

    private record ImportRow(int number, Map<String, String> values) {
        String value(String name) { return values.getOrDefault(name, ""); }
    }
}
