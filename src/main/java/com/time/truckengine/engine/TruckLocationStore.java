package com.time.truckengine.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.time.truckengine.model.TruckLocation;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stores and retrieves truck locations per user.
 * Persists to data/trucks.json on disk.
 */
@Component
public class TruckLocationStore {

    private static final Path DATA_DIR = Paths.get("data");
    private static final Path TRUCKS_FILE = DATA_DIR.resolve("trucks.json");

    private final ObjectMapper objectMapper;
    // userId -> list of trucks
    private final Map<String, List<TruckLocation>> trucksByUser = new ConcurrentHashMap<>();

    public TruckLocationStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadFromDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);
            if (Files.exists(TRUCKS_FILE)) {
                byte[] json = Files.readAllBytes(TRUCKS_FILE);
                if (json.length > 0) {
                    Map<String, List<TruckLocation>> loaded =
                            objectMapper.readValue(json, new TypeReference<>() {});
                    trucksByUser.clear();
                    trucksByUser.putAll(loaded);
                }
            } else {
                saveToDisk();
            }
        } catch (Exception e) {
            System.out.println("[TRUCKS] Failed to load trucks.json: " + e.getMessage());
        }
    }

    public List<TruckLocation> getTrucks(String userId) {
        return trucksByUser.getOrDefault(userId, new ArrayList<>());
    }

    public List<TruckLocation> getAvailableTrucks(String userId) {
        return getTrucks(userId).stream()
                .filter(t -> "AVAILABLE".equalsIgnoreCase(t.getStatus()))
                .toList();
    }

    public TruckLocation addTruck(String userId, TruckLocation truck) {
        if (truck.getTruckId() == null || truck.getTruckId().isBlank()) {
            truck.setTruckId("truck-" + UUID.randomUUID().toString().substring(0, 8));
        }
        truck.setLastUpdated(Instant.now());
        trucksByUser.computeIfAbsent(userId, id -> new ArrayList<>()).add(truck);
        saveToDisk();
        return truck;
    }

    public Optional<TruckLocation> updateTruck(String userId, String truckId, TruckLocation updated) {
        List<TruckLocation> trucks = trucksByUser.get(userId);
        if (trucks == null) return Optional.empty();

        for (int i = 0; i < trucks.size(); i++) {
            if (trucks.get(i).getTruckId().equals(truckId)) {
                updated.setTruckId(truckId);
                updated.setLastUpdated(Instant.now());
                trucks.set(i, updated);
                saveToDisk();
                return Optional.of(updated);
            }
        }
        return Optional.empty();
    }

    public boolean deleteTruck(String userId, String truckId) {
        List<TruckLocation> trucks = trucksByUser.get(userId);
        if (trucks == null) return false;
        boolean removed = trucks.removeIf(t -> t.getTruckId().equals(truckId));
        if (removed) saveToDisk();
        return removed;
    }

    private synchronized void saveToDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);
            byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(trucksByUser);
            Files.write(TRUCKS_FILE, json, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception e) {
            System.out.println("[TRUCKS] Failed to save trucks.json: " + e.getMessage());
        }
    }
}
