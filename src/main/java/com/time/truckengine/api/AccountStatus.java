package com.time.truckengine.api;

import java.time.Instant;

public class AccountStatus {
    public String provider;
    public boolean connected;
    public Instant lastUpdated;
    public String message;

    public AccountStatus(String provider, boolean connected, Instant lastUpdated, String message) {
        this.provider = provider;
        this.connected = connected;
        this.lastUpdated = lastUpdated;
        this.message = message;
    }
}
