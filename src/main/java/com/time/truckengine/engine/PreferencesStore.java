package com.time.truckengine.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.time.truckengine.model.UserPreferences;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PreferencesStore {

    private static final Path DATA_DIR = Paths.get("data");
    private static final Path PREFS_FILE = DATA_DIR.resolve("preferences.json");

    private final ObjectMapper objectMapper;
    private final Map<String, UserPreferences> prefsByUser = new ConcurrentHashMap<>();

    public PreferencesStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadFromDisk() {
        try {
            if (Files.notExists(DATA_DIR)) {
                Files.createDirectories(DATA_DIR);
            }

            if (Files.exists(PREFS_FILE)) {
                byte[] json = Files.readAllBytes(PREFS_FILE);
                if (json.length > 0) {
                    Map<String, UserPreferences> loaded =
                            objectMapper.readValue(json, new TypeReference<Map<String, UserPreferences>>() {});
                    prefsByUser.clear();
                    prefsByUser.putAll(loaded);
                }
            } else {
                // Create an empty file so it's obvious where data lives
                saveToDisk();
            }
        } catch (Exception e) {
            System.out.println("[PERSISTENCE] Failed to load preferences.json: " + e.getMessage());
        }
    }

    public UserPreferences get(String userId) {
        return prefsByUser.computeIfAbsent(userId, id -> new UserPreferences());
    }

    public UserPreferences update(String userId, UserPreferences updated) {
        UserPreferences p = get(userId);

        p.setHomeState(updated.getHomeState());
        p.setEquipmentType(updated.getEquipmentType());
        p.setMaxDeadheadMiles(updated.getMaxDeadheadMiles());
        p.setMinTotalMiles(updated.getMinTotalMiles());
        p.setMinDollarsPerMile(updated.getMinDollarsPerMile());

        saveToDisk();
        return p;
    }

    private synchronized void saveToDisk() {
        try {
            if (Files.notExists(DATA_DIR)) {
                Files.createDirectories(DATA_DIR);
            }
            byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(prefsByUser);
            Files.write(PREFS_FILE, json, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            System.out.println("[PERSISTENCE] Failed to save preferences.json: " + e.getMessage());
        }
    }
}
