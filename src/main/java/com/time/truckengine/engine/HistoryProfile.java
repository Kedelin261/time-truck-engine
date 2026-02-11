package com.time.truckengine.engine;

import java.util.HashMap;
import java.util.Map;

public class HistoryProfile {

    public int bookingsCount;

    // lane frequency: "DE->PA" etc
    public Map<String, Integer> laneCounts = new HashMap<>();

    // averages
    public double avgMiles;
    public double avgDollarsPerMile;
    public double avgDeadhead;

    // Most common equipment type (string)
    public String mostCommonEquipment;

    public double laneSimilarityBoost(String originState, String destinationState) {
        if (bookingsCount == 0) return 0.0;

        String key = originState + "->" + destinationState;
        int count = laneCounts.getOrDefault(key, 0);

        // Boost up to +20 points based on how often you run this lane
        double ratio = (double) count / (double) bookingsCount; // 0..1
        return 20.0 * ratio;
    }

    public double milesSimilarityBoost(int miles) {
        if (bookingsCount == 0) return 0.0;

        double diff = Math.abs(miles - avgMiles);
        // within ~100 miles => strong boost
        double boost = Math.max(0.0, 10.0 - (diff / 10.0));
        return boost;
    }

    public double equipmentBoost(String equipmentType) {
        if (bookingsCount == 0) return 0.0;
        if (mostCommonEquipment == null) return 0.0;
        return mostCommonEquipment.equalsIgnoreCase(equipmentType) ? 10.0 : 0.0;
    }
}
