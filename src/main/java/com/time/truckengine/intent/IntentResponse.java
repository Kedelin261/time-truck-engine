package com.time.truckengine.intent;

/**
 * INTENT LAYER — response from every intent execution.
 */
public class IntentResponse {

    private final boolean success;
    private final String message;
    private final IntentType type;
    private final String userId;

    private IntentResponse(IntentType type, String userId, boolean success, String message) {
        this.type = type;
        this.userId = userId;
        this.success = success;
        this.message = message;
    }

    public static IntentResponse ok(IntentType type, String userId, String message) {
        return new IntentResponse(type, userId, true, message);
    }

    public static IntentResponse fail(IntentType type, String userId, String reason) {
        return new IntentResponse(type, userId, false, reason);
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public IntentType getType() { return type; }
    public String getUserId() { return userId; }

    @Override
    public String toString() {
        return "[INTENT " + type + " | user=" + userId + " | " + (success ? "OK" : "FAIL") + "] " + message;
    }
}
