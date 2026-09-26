package kz.jastalant.backend.player.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "players")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Player {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, updatable = false)
    private UUID academyId;
    @Column(nullable = false)
    private UUID groupId;
    @Column(nullable = false, length = 200)
    private String fullName;
    @Column(nullable = false)
    private LocalDate dateOfBirth;
    @Column(length = 200)
    private String parentName;
    @Column(length = 30)
    private String parentPhone;
    @Column(length = 254)
    private String parentEmail;
    @Column(columnDefinition = "bytea")
    private byte[] avatarData;
    @Column(length = 30)
    private String avatarContentType;
    @Version
    private long version;

    public Player(UUID academyId, UUID groupId, String fullName, LocalDate dateOfBirth,
                  String parentName, String parentPhone, String parentEmail) {
        this.academyId = academyId;
        update(groupId, fullName, dateOfBirth, parentName, parentPhone, parentEmail);
    }

    public void update(UUID groupId, String fullName, LocalDate dateOfBirth,
                       String parentName, String parentPhone, String parentEmail) {
        this.groupId = groupId;
        this.fullName = fullName.strip();
        this.dateOfBirth = dateOfBirth;
        this.parentName = optional(parentName);
        this.parentPhone = optional(parentPhone);
        String email = optional(parentEmail);
        this.parentEmail = email == null ? null : email.toLowerCase(Locale.ROOT);
    }

    public void updateAvatar(byte[] data, String contentType) {
        this.avatarData = data;
        this.avatarContentType = contentType;
    }

    public void removeAvatar() {
        this.avatarData = null;
        this.avatarContentType = null;
    }

    public boolean hasAvatar() { return avatarData != null; }

    private static String optional(String value) { return value == null || value.isBlank() ? null : value.strip(); }
}
