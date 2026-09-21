package kz.jastalant.backend.academy.service;

import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.repository.AcademyRepository;

import lombok.RequiredArgsConstructor;
import kz.jastalant.backend.common.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.academy.dto.AcademyView;
import kz.jastalant.backend.academy.mapper.AcademyMapper;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AcademyAccessService {
    private final AcademyRepository academies;
    private final AcademyPermissionService permissions;

    @Transactional(readOnly = true)
    public AcademyView get(UUID actor, UUID academyId) {
        var scope = permissions.resolve(actor, academyId);
        var academy = academies.findById(academyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
        return AcademyMapper.toView(academy, scope.roles());
    }
}
