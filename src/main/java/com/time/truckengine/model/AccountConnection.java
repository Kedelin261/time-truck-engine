package com.time.truckengine.model;

import java.time.Instant;

public class AccountConnection {

    private String provider;                 // DAT_ONE
    private String accessTokenEncrypted;     // encrypted token persisted
    private Instant lastUpdated;             // when saved/updated

    public AccountConnection() {}

    public AccountConnection(String provider, String accessTokenEncrypted, Instant lastUpdated) {
        this.provider = provider;
        this.accessTokenEncrypted = accessTokenEncrypted;
        this.lastUpdated = lastUpdated;
    }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getAccessTokenEncrypted() { return accessTokenEncrypted; }
    public void setAccessTokenEncrypted(String accessTokenEncrypted) { this.accessTokenEncrypted = accessTokenEncrypted; }

    public Instant getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(Instant lastUpdated) { this.lastUpdated = lastUpdated; }
}
