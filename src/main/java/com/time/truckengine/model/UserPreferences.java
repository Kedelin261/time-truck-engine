package com.time.truckengine.model;

public class UserPreferences {

    private String homeState = "DE";

    // Equipment: "BOX_TRUCK_26", "DRY_VAN", "REEFER", etc.
    private String equipmentType = "BOX_TRUCK_26";

    // Basic filters
    private int maxDeadheadMiles = 50;
    private int minTotalMiles = 250;
    private double minDollarsPerMile = 2.00;

    public String getHomeState() { return homeState; }
    public void setHomeState(String homeState) { this.homeState = homeState; }

    public String getEquipmentType() { return equipmentType; }
    public void setEquipmentType(String equipmentType) { this.equipmentType = equipmentType; }

    public int getMaxDeadheadMiles() { return maxDeadheadMiles; }
    public void setMaxDeadheadMiles(int maxDeadheadMiles) { this.maxDeadheadMiles = maxDeadheadMiles; }

    public int getMinTotalMiles() { return minTotalMiles; }
    public void setMinTotalMiles(int minTotalMiles) { this.minTotalMiles = minTotalMiles; }

    public double getMinDollarsPerMile() { return minDollarsPerMile; }
    public void setMinDollarsPerMile(double minDollarsPerMile) { this.minDollarsPerMile = minDollarsPerMile; }
}
