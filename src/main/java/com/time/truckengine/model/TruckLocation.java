package com.time.truckengine.model;

import java.time.Instant;

/**
 * Represents a single truck belonging to an owner-operator.
 * Stored per-user, so each user can have a fleet of trucks.
 */
public class TruckLocation {

    private String truckId;
    private String truckNumber;        // "Truck #1", "Big Red", etc.
    private String driverName;
    private String currentCity;
    private String currentState;
    private String equipmentType;      // DRY_VAN, REEFER, etc.
    private String status;             // AVAILABLE, IN_TRANSIT, OUT_OF_SERVICE
    private Instant availableDate;     // when will this truck be available
    private Instant lastUpdated;
    private String notes;

    public TruckLocation() {
        this.status = "AVAILABLE";
        this.lastUpdated = Instant.now();
    }

    public TruckLocation(String truckId, String truckNumber, String driverName,
                         String currentCity, String currentState,
                         String equipmentType, String status,
                         Instant availableDate) {
        this.truckId = truckId;
        this.truckNumber = truckNumber;
        this.driverName = driverName;
        this.currentCity = currentCity;
        this.currentState = currentState;
        this.equipmentType = equipmentType;
        this.status = status;
        this.availableDate = availableDate;
        this.lastUpdated = Instant.now();
        this.notes = "";
    }

    public String getTruckId() { return truckId; }
    public void setTruckId(String truckId) { this.truckId = truckId; }

    public String getTruckNumber() { return truckNumber; }
    public void setTruckNumber(String truckNumber) { this.truckNumber = truckNumber; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getCurrentCity() { return currentCity; }
    public void setCurrentCity(String currentCity) { this.currentCity = currentCity; }

    public String getCurrentState() { return currentState; }
    public void setCurrentState(String currentState) { this.currentState = currentState; }

    public String getEquipmentType() { return equipmentType; }
    public void setEquipmentType(String equipmentType) { this.equipmentType = equipmentType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getAvailableDate() { return availableDate; }
    public void setAvailableDate(Instant availableDate) { this.availableDate = availableDate; }

    public Instant getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(Instant lastUpdated) { this.lastUpdated = lastUpdated; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
