package kz.jastalant.backend.audit.repository;

import kz.jastalant.backend.audit.entity.AuditEvent;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends Repository<AuditEvent, UUID>, JpaSpecificationExecutor<AuditEvent> {
    AuditEvent save(AuditEvent event);

    interface Actor {
        UUID getActorId();
        String getActorName();
    }

    @Query(value = """
            select distinct on (actor_id) actor_id as "actorId", actor_name as "actorName"
            from audit_events where academy_id = :academyId
            order by actor_id, occurred_at desc, id desc
            """, nativeQuery = true)
    List<Actor> academyActors(UUID academyId);

    @Query(value = """
            select distinct on (actor_id) actor_id as "actorId", actor_name as "actorName"
            from audit_events where academy_id is null
            order by actor_id, occurred_at desc, id desc
            """, nativeQuery = true)
    List<Actor> platformActors();
}
