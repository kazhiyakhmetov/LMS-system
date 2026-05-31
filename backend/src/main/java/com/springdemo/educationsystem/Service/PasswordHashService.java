package com.springdemo.educationsystem.Service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class PasswordHashService {

    private static final Pattern BCRYPT_PATTERN = Pattern.compile("^\\$2[aby]\\$\\d{2}\\$.{53}$");

    private final PasswordEncoder passwordEncoder;

    public PasswordHashService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    public String encode(String password) {
        if (password == null || password.isBlank()) {
            throw new RuntimeException("Password is required");
        }
        if (isBcryptHash(password)) {
            return password;
        }
        return passwordEncoder.encode(password);
    }

    public boolean matches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null || storedPassword.isBlank()) {
            return false;
        }
        if (isBcryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return storedPassword.equals(rawPassword);
    }

    public boolean needsRehash(String storedPassword) {
        return storedPassword != null && !isBcryptHash(storedPassword);
    }

    private boolean isBcryptHash(String value) {
        return value != null && BCRYPT_PATTERN.matcher(value).matches();
    }
}
