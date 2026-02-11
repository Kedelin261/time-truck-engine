package com.time.truckengine.model;

public class Load {

    private final String loadId;
    private final String originState;
    private final String destinationState;
    private final int deadheadMiles;
    private final int totalMiles;
    private final double rate;
    private final double dollarsPerMile;

    public Load(String loadId,
                String originState,
                String destinationState,
                int deadheadMiles,
                int totalMiles,
                double rate) {

        this.loadId = loadId;
        this.originState = originState;
        this.destinationState = destinationState;
        this.deadheadMiles = deadheadMiles;
        this.totalMiles = totalMiles;
        this.rate = rate;

        // guard against divide by zero
        this.dollarsPerMile = totalMiles <= 0 ? 0.0 : (rate / (double) totalMiles);
    }

    public String getLoadId() { return loadId; }
    public String getOriginState() { return originState; }
    public String getDestinationState() { return destinationState; }

    public int getDeadheadMiles() { return deadheadMiles; }
    public int getTotalMiles() { return totalMiles; }

    public double getRate() { return rate; }
    public double getDollarsPerMile() { return dollarsPerMile; }

    @Override
    public String toString() {
        return loadId + " " + originState + "->" + destinationState +
                " deadhead=" + deadheadMiles +
                " miles=" + totalMiles +
                " rate=$" + rate +
                " ($" + String.format("%.2f", dollarsPerMile) + "/mi)";
    }
}
