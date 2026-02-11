package com.time.truckengine.engine;

public class MatchExplanation {
    public double baseScore;
    public double laneBoost;
    public double milesBoost;
    public double equipmentBoost;

    public double total() {
        return baseScore + laneBoost + milesBoost + equipmentBoost;
    }

    @Override
    public String toString() {
        return "base=" + fmt(baseScore) +
                " laneBoost=" + fmt(laneBoost) +
                " milesBoost=" + fmt(milesBoost) +
                " equipBoost=" + fmt(equipmentBoost) +
                " => total=" + fmt(total());
    }

    private String fmt(double v) {
        return String.format("%.1f", v);
    }
}
