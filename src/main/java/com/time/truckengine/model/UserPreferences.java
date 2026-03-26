package com.time.truckengine.model;

import java.util.HashSet;
import java.util.Set;

public class UserPreferences {

    private String homeState = "DE";
    private String homeCity = "";

    // Equipment: "BOX_TRUCK_26", "DRY_VAN", "REEFER", "FLATBED", "STEP_DECK"
    private String equipmentType = "BOX_TRUCK_26";

    // Basic filters
    private int maxDeadheadMiles = 50;
    private int minTotalMiles = 250;
    private double minDollarsPerMile = 2.00;

    // Lane preferences
    private Set<String> preferredDestinationStates = new HashSet<>();
    private Set<String> bannedDestinationStates = new HashSet<>();

    // Notification settings
    private String phoneNumber = "";
    private String email = "";
    private boolean smsEnabled = false;
    private boolean emailEnabled = false;

    // Company info (for broker intro emails)
    private String companyName = "";
    private String ownerName = "";
    private String mcNumber = "";
    private String dotNumber = "";
    private String companyPhone = "";
    private String companyEmail = "";
    private String companyWebsite = "";

    // Subscription tier: FREE, PRO, ENTERPRISE
    private String subscriptionTier = "FREE";

    // Getters and setters
    public String getHomeState() { return homeState; }
    public void setHomeState(String homeState) { this.homeState = homeState; }

    public String getHomeCity() { return homeCity; }
    public void setHomeCity(String homeCity) { this.homeCity = homeCity; }

    public String getEquipmentType() { return equipmentType; }
    public void setEquipmentType(String equipmentType) { this.equipmentType = equipmentType; }

    public int getMaxDeadheadMiles() { return maxDeadheadMiles; }
    public void setMaxDeadheadMiles(int maxDeadheadMiles) { this.maxDeadheadMiles = maxDeadheadMiles; }

    public int getMinTotalMiles() { return minTotalMiles; }
    public void setMinTotalMiles(int minTotalMiles) { this.minTotalMiles = minTotalMiles; }

    public double getMinDollarsPerMile() { return minDollarsPerMile; }
    public void setMinDollarsPerMile(double minDollarsPerMile) { this.minDollarsPerMile = minDollarsPerMile; }

    public Set<String> getPreferredDestinationStates() { return preferredDestinationStates; }
    public void setPreferredDestinationStates(Set<String> preferredDestinationStates) { this.preferredDestinationStates = preferredDestinationStates; }

    public Set<String> getBannedDestinationStates() { return bannedDestinationStates; }
    public void setBannedDestinationStates(Set<String> bannedDestinationStates) { this.bannedDestinationStates = bannedDestinationStates; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isSmsEnabled() { return smsEnabled; }
    public void setSmsEnabled(boolean smsEnabled) { this.smsEnabled = smsEnabled; }

    public boolean isEmailEnabled() { return emailEnabled; }
    public void setEmailEnabled(boolean emailEnabled) { this.emailEnabled = emailEnabled; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public String getMcNumber() { return mcNumber; }
    public void setMcNumber(String mcNumber) { this.mcNumber = mcNumber; }

    public String getDotNumber() { return dotNumber; }
    public void setDotNumber(String dotNumber) { this.dotNumber = dotNumber; }

    public String getCompanyPhone() { return companyPhone; }
    public void setCompanyPhone(String companyPhone) { this.companyPhone = companyPhone; }

    public String getCompanyEmail() { return companyEmail; }
    public void setCompanyEmail(String companyEmail) { this.companyEmail = companyEmail; }

    public String getCompanyWebsite() { return companyWebsite; }
    public void setCompanyWebsite(String companyWebsite) { this.companyWebsite = companyWebsite; }

    public String getSubscriptionTier() { return subscriptionTier; }
    public void setSubscriptionTier(String subscriptionTier) { this.subscriptionTier = subscriptionTier; }
}
