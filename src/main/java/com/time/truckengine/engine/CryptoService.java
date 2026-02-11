package com.time.truckengine.engine;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class CryptoService {

    private static final String ALGO = "AES";
    private static final String TRANSFORM = "AES/GCM/NoPadding";
    private static final int IV_LEN = 12;          // recommended for GCM
    private static final int TAG_LEN_BITS = 128;   // auth tag length

    private final byte[] keyBytes;
    private final SecureRandom random = new SecureRandom();

    public CryptoService(@Value("${app.crypto.key}") String key) {
        // Convert the key string into 16/24/32 bytes (we'll take first 32 bytes)
        byte[] raw = key.getBytes(StandardCharsets.UTF_8);
        this.keyBytes = new byte[32];
        for (int i = 0; i < this.keyBytes.length; i++) {
            this.keyBytes[i] = raw[i % raw.length];
        }
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) return plaintext;
        try {
            byte[] iv = new byte[IV_LEN];
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORM);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, ALGO);
            GCMParameterSpec gcm = new GCMParameterSpec(TAG_LEN_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcm);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Store as: base64(iv) + ":" + base64(ciphertext)
            return Base64.getEncoder().encodeToString(iv) + ":" +
                    Base64.getEncoder().encodeToString(ciphertext);

        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encoded) {
        if (encoded == null || encoded.isBlank()) return encoded;
        try {
            String[] parts = encoded.split(":");
            if (parts.length != 2) return encoded; // not encrypted format

            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            Cipher cipher = Cipher.getInstance(TRANSFORM);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, ALGO);
            GCMParameterSpec gcm = new GCMParameterSpec(TAG_LEN_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcm);

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);

        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
