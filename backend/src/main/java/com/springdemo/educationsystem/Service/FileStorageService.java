package com.springdemo.educationsystem.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    public String storeFile(MultipartFile file, String subDirectory) throws IOException {
        Path uploadPath = Paths.get(uploadDir, subDirectory);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(fileName);

        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return subDirectory + "/" + fileName;
    }

    public byte[] loadFile(String filePath) throws IOException {
        Path path = resolveSafe(filePath);
        return Files.readAllBytes(path);
    }

    public boolean deleteFile(String filePath) throws IOException {
        Path path = resolveSafe(filePath);
        return Files.deleteIfExists(path);
    }

    /**
     * Resolves a relative file path against the upload base directory while
     * preventing path-traversal attacks (no "..", no absolute paths escaping the base).
     */
    private Path resolveSafe(String filePath) throws IOException {
        if (filePath == null || filePath.trim().isEmpty()) {
            throw new IOException("File path is empty");
        }

        // Normalize separators and strip any leading slashes so the value is treated as relative.
        String normalized = filePath.replace("\\", "/").trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }

        Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path resolved = base.resolve(normalized).normalize();

        if (!resolved.startsWith(base)) {
            throw new IOException("Invalid file path: " + filePath);
        }
        return resolved;
    }

    public boolean isValidFileType(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null &&
                (contentType.startsWith("image/") ||
                        contentType.equals("application/pdf") ||
                        contentType.equals("application/msword") ||
                        contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
    }

    public boolean isValidFileSize(MultipartFile file) {
        return file.getSize() <= 5 * 1024 * 1024; // 5MB
    }
}