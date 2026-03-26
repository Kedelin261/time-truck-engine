package com.time.truckengine.model;

import java.time.Instant;

/**
 * Represents a broker that the owner-operator has interacted with or wants to contact.
 */
public class BrokerContact {

    private String brokerId;
    private String brokerName;
    private String brokerCompany;
    private String brokerPhone;
    private String brokerEmail;
    private String mcNumber;
    private String notes;

    // Outreach tracking
    private Instant introEmailSentAt;
    private Instant lastFollowUpAt;
    private int followUpCount = 0;
    private String status;             // NEW, INTRO_SENT, FOLLOW_UP_SENT, ACTIVE, INACTIVE
    private Instant createdAt;

    public BrokerContact() {
        this.status = "NEW";
        this.createdAt = Instant.now();
    }

    public String getBrokerId() { return brokerId; }
    public void setBrokerId(String brokerId) { this.brokerId = brokerId; }

    public String getBrokerName() { return brokerName; }
    public void setBrokerName(String brokerName) { this.brokerName = brokerName; }

    public String getBrokerCompany() { return brokerCompany; }
    public void setBrokerCompany(String brokerCompany) { this.brokerCompany = brokerCompany; }

    public String getBrokerPhone() { return brokerPhone; }
    public void setBrokerPhone(String brokerPhone) { this.brokerPhone = brokerPhone; }

    public String getBrokerEmail() { return brokerEmail; }
    public void setBrokerEmail(String brokerEmail) { this.brokerEmail = brokerEmail; }

    public String getMcNumber() { return mcNumber; }
    public void setMcNumber(String mcNumber) { this.mcNumber = mcNumber; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getIntroEmailSentAt() { return introEmailSentAt; }
    public void setIntroEmailSentAt(Instant introEmailSentAt) { this.introEmailSentAt = introEmailSentAt; }

    public Instant getLastFollowUpAt() { return lastFollowUpAt; }
    public void setLastFollowUpAt(Instant lastFollowUpAt) { this.lastFollowUpAt = lastFollowUpAt; }

    public int getFollowUpCount() { return followUpCount; }
    public void setFollowUpCount(int followUpCount) { this.followUpCount = followUpCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
