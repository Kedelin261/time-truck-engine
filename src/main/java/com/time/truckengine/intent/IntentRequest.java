package com.time.truckengine.intent;

import com.time.truckengine.model.Load;
import com.time.truckengine.model.TruckLocation;

import java.util.List;
import java.util.Map;

/**
 * INTENT LAYER — immutable request container.
 * Every automation or scheduled job creates an IntentRequest and submits it
 * to the IntentRouter. No direct service calls from the engine.
 */
public class IntentRequest {

    private final IntentType type;
    private final String userId;

    // Payload fields — only populate what each intent needs
    private List<Load> loads;
    private TruckLocation truck;
    private String brokerId;
    private String brokerEmail;
    private String brokerName;
    private String brokerCompany;
    private String phoneNumber;
    private String emailAddress;
    private Map<String, String> extras;   // key-value for anything flexible

    private IntentRequest(Builder b) {
        this.type = b.type;
        this.userId = b.userId;
        this.loads = b.loads;
        this.truck = b.truck;
        this.brokerId = b.brokerId;
        this.brokerEmail = b.brokerEmail;
        this.brokerName = b.brokerName;
        this.brokerCompany = b.brokerCompany;
        this.phoneNumber = b.phoneNumber;
        this.emailAddress = b.emailAddress;
        this.extras = b.extras;
    }

    // --- Getters ---
    public IntentType getType() { return type; }
    public String getUserId() { return userId; }
    public List<Load> getLoads() { return loads; }
    public TruckLocation getTruck() { return truck; }
    public String getBrokerId() { return brokerId; }
    public String getBrokerEmail() { return brokerEmail; }
    public String getBrokerName() { return brokerName; }
    public String getBrokerCompany() { return brokerCompany; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getEmailAddress() { return emailAddress; }
    public Map<String, String> getExtras() { return extras; }
    public String getExtra(String key) {
        return extras != null ? extras.get(key) : null;
    }

    // --- Builder ---
    public static Builder builder(IntentType type, String userId) {
        return new Builder(type, userId);
    }

    public static class Builder {
        private final IntentType type;
        private final String userId;
        private List<Load> loads;
        private TruckLocation truck;
        private String brokerId;
        private String brokerEmail;
        private String brokerName;
        private String brokerCompany;
        private String phoneNumber;
        private String emailAddress;
        private Map<String, String> extras;

        public Builder(IntentType type, String userId) {
            this.type = type;
            this.userId = userId;
        }

        public Builder loads(List<Load> loads) { this.loads = loads; return this; }
        public Builder truck(TruckLocation truck) { this.truck = truck; return this; }
        public Builder brokerId(String id) { this.brokerId = id; return this; }
        public Builder brokerEmail(String email) { this.brokerEmail = email; return this; }
        public Builder brokerName(String name) { this.brokerName = name; return this; }
        public Builder brokerCompany(String company) { this.brokerCompany = company; return this; }
        public Builder phone(String phone) { this.phoneNumber = phone; return this; }
        public Builder email(String email) { this.emailAddress = email; return this; }
        public Builder extras(Map<String, String> extras) { this.extras = extras; return this; }

        public IntentRequest build() {
            return new IntentRequest(this);
        }
    }
}
