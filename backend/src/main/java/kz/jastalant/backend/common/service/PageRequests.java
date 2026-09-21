package kz.jastalant.backend.common.service;

import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public final class PageRequests {
    private PageRequests() {}

    public static PageRequest of(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Page must be non-negative and size between 1 and 100");
        }
        return PageRequest.of(page, size, Sort.by("id"));
    }
}
