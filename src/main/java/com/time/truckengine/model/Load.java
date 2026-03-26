package com.time.truckengine.model;

public class Load {

    private final String loadId;
    private final String originState;
    private final String originCity;
    private final String destinationState;
    private final String destinationCity;
    private final int deadheadMiles;
    private final int totalMiles;
    private final double rate;
    private final double dollarsPerMile;
    private final String equipmentType;
    private final String pickupDate;
    private final String deliveryDate;
    private final double weight;

    // Broker contact info
    private final String brokerName;
    private final String brokerCompany;
    private final String brokerPhone;
    private final String brokerEmail;
    private final String brokerMcNumber;

    public Load(String loadId,
                String originState,
                String destinationState,
                int deadheadMiles,
                int totalMiles,
                double rate) {

        this.loadId = loadId;
        this.originState = originState;
        this.originCity = "";
        this.destinationState = destinationState;
        this.destinationCity = "";
        this.deadheadMiles = deadheadMiles;
        this.totalMiles = totalMiles;
        this.rate = rate;
        this.dollarsPerMile = totalMiles <= 0 ? 0.0 : (rate / (double) totalMiles);
        this.equipmentType = "DRY_VAN";
        this.pickupDate = "";
        this.deliveryDate = "";
        this.weight = 0;
        this.brokerName = "";
        this.brokerCompany = "";
        this.brokerPhone = "";
        this.brokerEmail = "";
        this.brokerMcNumber = "";
    }

    public Load(String loadId,
                String originCity,
                String originState,
                String destinationCity,
                String destinationState,
                int deadheadMiles,
                int totalMiles,
                double rate,
                String equipmentType,
                String pickupDate,
                String deliveryDate,
                double weight,
                String brokerName,
                String brokerCompany,
                String brokerPhone,
                String brokerEmail,
                String brokerMcNumber) {

        this.loadId = loadId;
        this.originCity = originCity;
        this.originState = originState;
        this.destinationCity = destinationCity;
        this.destinationState = destinationState;
        this.deadheadMiles = deadheadMiles;
        this.totalMiles = totalMiles;
        this.rate = rate;
        this.dollarsPerMile = totalMiles <= 0 ? 0.0 : (rate / (double) totalMiles);
        this.equipmentType = equipmentType;
        this.pickupDate = pickupDate;
        this.deliveryDate = deliveryDate;
        this.weight = weight;
        this.brokerName = brokerName;
        this.brokerCompany = brokerCompany;
        this.brokerPhone = brokerPhone;
        this.brokerEmail = brokerEmail;
        this.brokerMcNumber = brokerMcNumber;
    }

    public String getLoadId() { return loadId; }
    public String getOriginState() { return originState; }
    public String getOriginCity() { return originCity; }
    public String getDestinationState() { return destinationState; }
    public String getDestinationCity() { return destinationCity; }
    public int getDeadheadMiles() { return deadheadMiles; }
    public int getTotalMiles() { return totalMiles; }
    public double getRate() { return rate; }
    public double getDollarsPerMile() { return dollarsPerMile; }
    public String getEquipmentType() { return equipmentType; }
    public String getPickupDate() { return pickupDate; }
    public String getDeliveryDate() { return deliveryDate; }
    public double getWeight() { return weight; }
    public String getBrokerName() { return brokerName; }
    public String getBrokerCompany() { return brokerCompany; }
    public String getBrokerPhone() { return brokerPhone; }
    public String getBrokerEmail() { return brokerEmail; }
    public String getBrokerMcNumber() { return brokerMcNumber; }

    @Override
    public String toString() {
        return loadId + " " + originState + "->" + destinationState +
                " deadhead=" + deadheadMiles +
                " miles=" + totalMiles +
                " rate=$" + rate +
                " ($" + String.format("%.2f", dollarsPerMile) + "/mi)";
    }
}
