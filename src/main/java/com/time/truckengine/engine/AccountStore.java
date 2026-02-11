package com.time.truckengine.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.time.truckengine.model.AccountConnection;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AccountStore {

    private static final Path DATA_DIR = Paths.get("data");
    private static final Path ACCOUNTS_FILE = DATA_DIR.resolve("accounts.json");

    private final ObjectMapper objectMapper;
    private final CryptoService cryptoService;

    private final Map<String, List<AccountConnection>> connectionsByUser = new ConcurrentHashMap<>();

    public AccountStore(ObjectMapper objectMapper, CryptoService cryptoService) {
        this.objectMapper = objectMapper;
        this.cryptoService = cryptoService;
    }

    @PostConstruct
    public void loadFromDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);

            if (Files.exists(ACCOUNTS_FILE)) {
                byte[] json = Files.readAllBytes(ACCOUNTS_FILE);
                if (json.length > 0) {
                    Map<String, List<AccountConnection>> loaded =
                            objectMapper.readValue(json, new TypeReference<Map<String, List<AccountConnection>>>() {});
                    connectionsByUser.clear();
                    connectionsByUser.putAll(loaded);
                }
            } else {
                saveToDisk();
            }
        } catch (Exception e) {
            System.out.println("[PERSISTENCE] Failed to load accounts.json: " + e.getMessage());
        }
    }

    public List<AccountConnection> getConnections(String userId) {
        return connectionsByUser.getOrDefault(userId, new ArrayList<>());
    }

    public Optional<AccountConnection> getDatConnection(String userId) {
        return getConnections(userId).stream()
                .filter(c -> "DAT_ONE".equalsIgnoreCase(c.getProvider()))
                .findFirst();
    }

    public Optional<String> getDatTokenDecrypted(String userId) {
        return getDatConnection(userId)
                .map(AccountConnection::getAccessTokenEncrypted)
                .map(cryptoService::decrypt)
                .filter(s -> s != null && !s.isBlank());
    }

    // ✅ UPSERT: one DAT connection per user
    public void upsertDatToken(String userId, String rawToken) {
        String encrypted = cryptoService.encrypt(rawToken);

        List<AccountConnection> list = connectionsByUser.computeIfAbsent(userId, id -> new ArrayList<>());
        list.removeIf(c -> "DAT_ONE".equalsIgnoreCase(c.getProvider()));

        AccountConnection conn = new AccountConnection();
        conn.setProvider("DAT_ONE");
        conn.setAccessTokenEncrypted(encrypted);
        conn.setLastUpdated(Instant.now());

        list.add(conn);
        saveToDisk();
    }

    public Set<String> getUsersWithDatConnected() {
        Set<String> users = new HashSet<>();
        for (String userId : connectionsByUser.keySet()) {
            if (getDatTokenDecrypted(userId).isPresent()) users.add(userId);
        }
        return users;
    }

    private synchronized void saveToDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);
            byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(connectionsByUser);
            Files.write(ACCOUNTS_FILE, json, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            System.out.println("[PERSISTENCE] Failed to save accounts.json: " + e.getMessage());
        }
    }
}
