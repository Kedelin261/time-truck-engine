package com.time.truckengine.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.time.truckengine.model.LoadBooking;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoadHistoryStore {

    private static final Path DATA_DIR = Paths.get("data");
    private static final Path HISTORY_FILE = DATA_DIR.resolve("load_history.json");

    private final ObjectMapper objectMapper;

    // userId -> bookings
    private final Map<String, List<LoadBooking>> bookingsByUser = new ConcurrentHashMap<>();

    public LoadHistoryStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadFromDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);

            if (Files.exists(HISTORY_FILE)) {
                byte[] json = Files.readAllBytes(HISTORY_FILE);
                if (json.length > 0) {
                    Map<String, List<LoadBooking>> loaded =
                            objectMapper.readValue(json, new TypeReference<Map<String, List<LoadBooking>>>() {});
                    bookingsByUser.clear();
                    bookingsByUser.putAll(loaded);
                }
            } else {
                saveToDisk();
            }
        } catch (Exception e) {
            System.out.println("[PERSISTENCE] Failed to load load_history.json: " + e.getMessage());
        }
    }

    public List<LoadBooking> getBookings(String userId) {
        return bookingsByUser.getOrDefault(userId, new ArrayList<>());
    }

    public void addBooking(String userId, LoadBooking booking) {
        if (booking.getBookedAt() == null) booking.setBookedAt(Instant.now());
        bookingsByUser.computeIfAbsent(userId, id -> new ArrayList<>()).add(booking);
        saveToDisk();
    }

    public HistoryProfile buildProfile(String userId) {
        List<LoadBooking> bookings = getBookings(userId);
        HistoryProfile p = new HistoryProfile();
        p.bookingsCount = bookings.size();
        if (bookings.isEmpty()) return p;

        double milesSum = 0;
        double dpmSum = 0;
        double deadheadSum = 0;

        Map<String, Integer> equipmentCounts = new HashMap<>();

        for (LoadBooking b : bookings) {
            milesSum += b.getTotalMiles();
            dpmSum += b.getDollarsPerMile();
            deadheadSum += b.getDeadheadMiles();

            String lane = b.getOriginState() + "->" + b.getDestinationState();
            p.laneCounts.put(lane, p.laneCounts.getOrDefault(lane, 0) + 1);

            if (b.getEquipmentType() != null) {
                equipmentCounts.put(b.getEquipmentType(),
                        equipmentCounts.getOrDefault(b.getEquipmentType(), 0) + 1);
            }
        }

        p.avgMiles = milesSum / bookings.size();
        p.avgDollarsPerMile = dpmSum / bookings.size();
        p.avgDeadhead = deadheadSum / bookings.size();

        // most common equipment
        p.mostCommonEquipment = equipmentCounts.entrySet().stream()
                .max(Comparator.comparingInt(Map.Entry::getValue))
                .map(Map.Entry::getKey)
                .orElse(null);

        return p;
    }

    private synchronized void saveToDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);
            byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(bookingsByUser);
            Files.write(HISTORY_FILE, json, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception e) {
            System.out.println("[PERSISTENCE] Failed to save load_history.json: " + e.getMessage());
        }
    }
}
