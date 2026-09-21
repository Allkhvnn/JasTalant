package kz.jastalant.backend.group.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Entity
@Table(name = "training_groups")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TrainingGroup {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, updatable = false)
    private UUID academyId;
    @Column(nullable = false, length = 200)
    private String name;
    @Column(nullable = false, length = 30)
    private String ageCategory;
    @Version
    private long version;

    public TrainingGroup(UUID academyId, String name, String ageCategory) {
        this.academyId = academyId;
        update(name, ageCategory);
    }

    public void update(String name, String ageCategory) {
        this.name = name.strip();
        this.ageCategory = ageCategory.strip();
    }
}
