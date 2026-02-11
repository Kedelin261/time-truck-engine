package com.time.truckengine.model;

import java.util.HashSet;
import java.util.Set;

public class LoadCriteria {

    private int maxDeadheadMiles = 50;
    private int minTotalMiles = 300;
    private double minDollarsPerMile = 2.20;

    // Optional preferences
    private String homeState = "DE";
    private Set<String> preferredDestinationStates = new HashSet<>();
    private Set<String> bannedDestinationStates = new HashSet<>();

    public int getMaxDeadheadMiles() { return maxDeadheadMiles; }
    public void setMaxDeadheadMiles(int maxDeadheadMiles) { this.maxDeadheadMiles = maxDeadheadMiles; }

    public int getMinTotalMiles() { return minTotalMiles; }
    public void setMinTotalMiles(int minTotalMiles) { this.minTotalMiles = minTotalMiles; }

    public double getMinDollarsPerMile() { return minDollarsPerMile; }
    public void setMinDollarsPerMile(double minDollarsPerMile) { this.minDollarsPerMile = minDollarsPerMile; }

    public String getHomeState() { return homeState; }
    public void setHomeState(String homeState) { this.homeState = homeState; }

    public Set<String> getPreferredDestinationStates() { return preferredDestinationStates; }
    public Set<String> getBannedDestinationStates() { return bannedDestinationStates; }
}
