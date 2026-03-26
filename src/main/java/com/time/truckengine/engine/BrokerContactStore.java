package com.time.truckengine.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.time.truckengine.model.BrokerContact;
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
 * Stores broker contacts per user.
 * Tracks intro emails sent, follow-up counts, and outreach status.
 * Persists to data/brokers.json.
 */
@Component
public class BrokerContactStore {

    private static final Path DATA_DIR = Paths.get("data");
    private static final Path BROKERS_FILE = DATA_DIR.resolve("brokers.json");

    private final ObjectMapper objectMapper;
    // userId -> list of broker contacts
    private final Map<String, List<BrokerContact>> brokersByUser = new ConcurrentHashMap<>();

    public BrokerContactStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void loadFromDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);
            if (Files.exists(BROKERS_FILE)) {
                byte[] json = Files.readAllBytes(BROKERS_FILE);
                if (json.length > 0) {
                    Map<String, List<BrokerContact>> loaded =
                            objectMapper.readValue(json, new TypeReference<>() {});
                    brokersByUser.clear();
                    brokersByUser.putAll(loaded);
                }
            } else {
                saveToDisk();
            }
        } catch (Exception e) {
            System.out.println("[BROKERS] Failed to load brokers.json: " + e.getMessage());
        }
    }

    public List<BrokerContact> getBrokers(String userId) {
        return brokersByUser.getOrDefault(userId, new ArrayList<>());
    }

    public Optional<BrokerContact> getBroker(String userId, String brokerId) {
        return getBrokers(userId).stream()
                .filter(b -> b.getBrokerId().equals(brokerId))
                .findFirst();
    }

    /** Brokers that haven't received an intro email yet. */
    public List<BrokerContact> getBrokersNeedingIntro(String userId) {
        return getBrokers(userId).stream()
                .filter(b -> b.getIntroEmailSentAt() == null && "NEW".equals(b.getStatus()))
                .filter(b -> b.getBrokerEmail() != null && !b.getBrokerEmail().isBlank())
                .toList();
    }

    /** Brokers that need a follow-up (intro sent but no reply in > 3 days, < 3 follow-ups). */
    public List<BrokerContact> getBrokersNeedingFollowUp(String userId) {
        Instant threeDaysAgo = Instant.now().minusSeconds(3 * 24 * 60 * 60);
        return getBrokers(userId).stream()
                .filter(b -> "INTRO_SENT".equals(b.getStatus()) || "FOLLOW_UP_SENT".equals(b.getStatus()))
                .filter(b -> b.getFollowUpCount() < 3)
                .filter(b -> {
                    Instant last = b.getLastFollowUpAt() != null ? b.getLastFollowUpAt() : b.getIntroEmailSentAt();
                    return last != null && last.isBefore(threeDaysAgo);
                })
                .filter(b -> b.getBrokerEmail() != null && !b.getBrokerEmail().isBlank())
                .toList();
    }

    public BrokerContact addBroker(String userId, BrokerContact broker) {
        if (broker.getBrokerId() == null || broker.getBrokerId().isBlank()) {
            broker.setBrokerId("broker-" + UUID.randomUUID().toString().substring(0, 8));
        }
        broker.setCreatedAt(Instant.now());
        broker.setStatus("NEW");
        brokersByUser.computeIfAbsent(userId, id -> new ArrayList<>()).add(broker);
        saveToDisk();
        return broker;
    }

    public void markIntroSent(String userId, String brokerId) {
        getBroker(userId, brokerId).ifPresent(b -> {
            b.setIntroEmailSentAt(Instant.now());
            b.setStatus("INTRO_SENT");
            saveToDisk();
        });
    }

    public void markFollowUpSent(String userId, String brokerId) {
        getBroker(userId, brokerId).ifPresent(b -> {
            b.setLastFollowUpAt(Instant.now());
            b.setFollowUpCount(b.getFollowUpCount() + 1);
            b.setStatus("FOLLOW_UP_SENT");
            saveToDisk();
        });
    }

    public boolean deleteBroker(String userId, String brokerId) {
        List<BrokerContact> brokers = brokersByUser.get(userId);
        if (brokers == null) return false;
        boolean removed = brokers.removeIf(b -> b.getBrokerId().equals(brokerId));
        if (removed) saveToDisk();
        return removed;
    }

    public Optional<BrokerContact> updateBroker(String userId, String brokerId, BrokerContact updated) {
        List<BrokerContact> brokers = brokersByUser.get(userId);
        if (brokers == null) return Optional.empty();
        for (int i = 0; i < brokers.size(); i++) {
            if (brokers.get(i).getBrokerId().equals(brokerId)) {
                updated.setBrokerId(brokerId);
                brokers.set(i, updated);
                saveToDisk();
                return Optional.of(updated);
            }
        }
        return Optional.empty();
    }

    private synchronized void saveToDisk() {
        try {
            if (Files.notExists(DATA_DIR)) Files.createDirectories(DATA_DIR);
            byte[] json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(brokersByUser);
            Files.write(BROKERS_FILE, json, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception e) {
            System.out.println("[BROKERS] Failed to save brokers.json: " + e.getMessage());
        }
    }
}
