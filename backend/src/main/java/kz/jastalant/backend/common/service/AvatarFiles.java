package kz.jastalant.backend.common.service;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import kz.jastalant.backend.common.dto.AvatarData;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;

@Component
public class AvatarFiles {
    public static final long MAX_BYTES = 2 * 1024 * 1024;

    public AvatarData read(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Avatar file is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Avatar must not exceed 2 MB");
        }
        try {
            byte[] bytes = file.getBytes();
            return new AvatarData(bytes, detectContentType(bytes), 0);
        } catch (IOException exception) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Avatar could not be read");
        }
    }

    private String detectContentType(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e
                && bytes[3] == 0x47 && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return "image/png";
        }
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }
        throw new BusinessException(ErrorCode.INVALID_REQUEST, "Avatar must be a JPEG, PNG, or WebP image");
    }
}
