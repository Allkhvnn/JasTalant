package kz.jastalant.backend.group.mapper;

import kz.jastalant.backend.group.dto.*;
import kz.jastalant.backend.group.entity.*;

public final class GroupMapper {
    private GroupMapper() {}
    public static GroupResponse toResponse(TrainingGroup group) {
        return new GroupResponse(group.getId(), group.getAcademyId(), group.getName(), group.getAgeCategory(), group.getVersion());
    }
    public static CoachResponse toCoach(GroupCoach assignment) {
        var user = assignment.getMembership().getUser();
        return new CoachResponse(user.getId(), user.getFullName());
    }
}
