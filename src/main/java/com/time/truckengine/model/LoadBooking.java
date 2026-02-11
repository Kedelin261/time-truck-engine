package com.time.truckengine.model;

import java.time.Instant;

public class LoadBooking {
    private String loadId;
    private String originState;
    private String destinationState;
    private int totalMiles;
    private int deadheadMiles;
    private double dollarsPerMile;
    private String equipmentType;
    private Instant bookedAt;

    public LoadBooking() {}

    public LoadBooking(String loadId, String originState, String destinationState,
                       int totalMiles, int deadheadMiles, double dollarsPerMile,
                       String equipmentType, Instant bookedAt) {
        this.loadId = loadId;
        this.originState = originState;
        this.destinationState = destinationState;
        this.totalMiles = totalMiles;
        this.deadheadMiles = deadheadMiles;
        this.dollarsPerMile = dollarsPerMile;
        this.equipmentType = equipmentType;
        this.bookedAt = bookedAt;
    }

    public String getLoadId() { return loadId; }
    public void setLoadId(String loadId) { this.loadId = loadId; }

    public String getOriginState() { return originState; }
    public void setOriginState(String originState) { this.originState = originState; }

    public String getDestinationState() { return destinationState; }
    public void setDestinationState(String destinationState) { this.destinationState = destinationState; }

    public int getTotalMiles() { return totalMiles; }
    public void setTotalMiles(int totalMiles) { this.totalMiles = totalMiles; }

    public int getDeadheadMiles() { return deadheadMiles; }
    public void setDeadheadMiles(int deadheadMiles) { this.deadheadMiles = deadheadMiles; }

    public double getDollarsPerMile() { return dollarsPerMile; }
    public void setDollarsPerMile(double dollarsPerMile) { this.dollarsPerMile = dollarsPerMile; }

    public String getEquipmentType() { return equipmentType; }
    public void setEquipmentType(String equipmentType) { this.equipmentType = equipmentType; }

    public Instant getBookedAt() { return bookedAt; }
    public void setBookedAt(Instant bookedAt) { this.bookedAt = bookedAt; }
}
