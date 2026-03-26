package com.time.truckengine.intent;

/**
 * INTENT LAYER — defines every possible intent the system can fire.
 * All new automation logic communicates exclusively via IntentType.
 * No Action Layer is modified directly.
 */
public enum IntentType {

    // --- Notification Intents ---
    SEND_SMS_TOP20_SUMMARY,          // Send SMS with top 20 loads summary to subscribed user
    SEND_SMS_NEW_LOADS_ALERT,        // Send SMS alert about freshly matched loads
    SEND_EMAIL_TOP20_SUMMARY,        // Send email with top 20 loads summary

    // --- Broker Outreach Intents ---
    SEND_BROKER_INTRO_EMAIL,         // Introduce company to a broker via email
    SEND_BROKER_FOLLOWUP_EMAIL,      // Send follow-up to broker after intro
    SEND_BROKER_AVAILABILITY_EMAIL,  // Notify broker of available trucks + locations

    // --- System Intents ---
    RUN_ENGINE_TOP20,                // Re-run load scoring engine for user
    REFRESH_LOAD_BOARD,              // Trigger load board fetch
    UPDATE_TRUCK_LOCATION,           // Update a truck's current location
    MARK_LOAD_BOOKED,                // Mark a load as booked (updates history)

    // --- Subscription Intents ---
    ACTIVATE_SUBSCRIPTION,           // Activate a user subscription
    DEACTIVATE_SUBSCRIPTION          // Deactivate a user subscription
}
