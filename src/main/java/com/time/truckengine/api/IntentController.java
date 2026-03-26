package com.time.truckengine.api;

import com.time.truckengine.intent.IntentRequest;
import com.time.truckengine.intent.IntentResponse;
import com.time.truckengine.intent.IntentRouter;
import com.time.truckengine.intent.IntentType;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Intent API — allows the frontend to trigger any intent manually.
 * Also used for testing automation flows without waiting for the scheduler.
 */
@RestController
@RequestMapping("/api/users/{userId}/intent")
public class IntentController {

    private final IntentRouter intentRouter;

    public IntentController(IntentRouter intentRouter) {
        this.intentRouter = intentRouter;
    }

    /** Generic intent trigger — pass type + optional extras */
    @PostMapping
    public IntentResponse trigger(@PathVariable String userId,
                                  @RequestBody IntentTriggerRequest body) {
        IntentType type;
        try {
            type = IntentType.valueOf(body.type);
        } catch (Exception e) {
            return IntentResponse.fail(null, userId, "Unknown intent type: " + body.type);
        }

        IntentRequest.Builder builder = IntentRequest.builder(type, userId);
        if (body.extras != null) builder.extras(body.extras);
        if (body.phoneNumber != null) builder.phone(body.phoneNumber);
        if (body.emailAddress != null) builder.email(body.emailAddress);
        if (body.brokerEmail != null) builder.brokerEmail(body.brokerEmail);
        if (body.brokerName != null) builder.brokerName(body.brokerName);
        if (body.brokerCompany != null) builder.brokerCompany(body.brokerCompany);
        if (body.brokerId != null) builder.brokerId(body.brokerId);

        return intentRouter.route(builder.build());
    }

    /** Quick trigger: send top-20 SMS now */
    @PostMapping("/sms-top20")
    public IntentResponse smsTop20(@PathVariable String userId) {
        return intentRouter.route(
                IntentRequest.builder(IntentType.SEND_SMS_TOP20_SUMMARY, userId).build());
    }

    /** Quick trigger: send top-20 email now */
    @PostMapping("/email-top20")
    public IntentResponse emailTop20(@PathVariable String userId) {
        return intentRouter.route(
                IntentRequest.builder(IntentType.SEND_EMAIL_TOP20_SUMMARY, userId).build());
    }

    /** Quick trigger: run engine and return top-20 */
    @PostMapping("/run-engine")
    public IntentResponse runEngine(@PathVariable String userId) {
        return intentRouter.route(
                IntentRequest.builder(IntentType.RUN_ENGINE_TOP20, userId).build());
    }

    /** Activate subscription with phone + email */
    @PostMapping("/subscribe")
    public IntentResponse subscribe(@PathVariable String userId,
                                    @RequestBody SubscribeRequest sub) {
        return intentRouter.route(
                IntentRequest.builder(IntentType.ACTIVATE_SUBSCRIPTION, userId)
                        .phone(sub.phoneNumber)
                        .email(sub.email)
                        .extras(Map.of("tier", sub.tier != null ? sub.tier : "PRO"))
                        .build());
    }

    /** Deactivate subscription */
    @PostMapping("/unsubscribe")
    public IntentResponse unsubscribe(@PathVariable String userId) {
        return intentRouter.route(
                IntentRequest.builder(IntentType.DEACTIVATE_SUBSCRIPTION, userId).build());
    }

    // Request bodies
    public static class IntentTriggerRequest {
        public String type;
        public String phoneNumber;
        public String emailAddress;
        public String brokerEmail;
        public String brokerName;
        public String brokerCompany;
        public String brokerId;
        public Map<String, String> extras;
    }

    public static class SubscribeRequest {
        public String phoneNumber;
        public String email;
        public String tier;
    }
}
