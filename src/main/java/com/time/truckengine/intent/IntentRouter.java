package com.time.truckengine.intent;

import com.time.truckengine.engine.*;
import com.time.truckengine.loadboard.LoadService;
import com.time.truckengine.model.*;
import com.time.truckengine.notifications.EmailService;
import com.time.truckengine.notifications.SmsService;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * INTENT LAYER — central router.
 *
 * Architecture rule: ALL new automation communicates via IntentRouter.
 * No Action Layer (controllers) is modified directly by automation.
 * Each IntentType maps to exactly one handler method.
 */
@Component
public class IntentRouter {

    private final SmsService smsService;
    private final EmailService emailService;
    private final PreferencesStore preferencesStore;
    private final TruckLocationStore truckLocationStore;
    private final BrokerContactStore brokerContactStore;
    private final LoadService loadService;
    private final LoadHistoryStore loadHistoryStore;

    public IntentRouter(SmsService smsService,
                        EmailService emailService,
                        PreferencesStore preferencesStore,
                        TruckLocationStore truckLocationStore,
                        BrokerContactStore brokerContactStore,
                        LoadService loadService,
                        LoadHistoryStore loadHistoryStore) {
        this.smsService = smsService;
        this.emailService = emailService;
        this.preferencesStore = preferencesStore;
        this.truckLocationStore = truckLocationStore;
        this.brokerContactStore = brokerContactStore;
        this.loadService = loadService;
        this.loadHistoryStore = loadHistoryStore;
    }

    /**
     * Route an IntentRequest to its handler. Returns an IntentResponse.
     * This is the single entry point for ALL automation.
     */
    public IntentResponse route(IntentRequest req) {
        System.out.println("[INTENT] Routing: " + req.getType() + " for user=" + req.getUserId());
        try {
            return switch (req.getType()) {
                case SEND_SMS_TOP20_SUMMARY      -> handleSmsTop20(req);
                case SEND_SMS_NEW_LOADS_ALERT    -> handleSmsNewLoads(req);
                case SEND_EMAIL_TOP20_SUMMARY    -> handleEmailTop20(req);
                case SEND_BROKER_INTRO_EMAIL     -> handleBrokerIntro(req);
                case SEND_BROKER_FOLLOWUP_EMAIL  -> handleBrokerFollowUp(req);
                case SEND_BROKER_AVAILABILITY_EMAIL -> handleBrokerAvailability(req);
                case RUN_ENGINE_TOP20            -> handleRunEngineTop20(req);
                case UPDATE_TRUCK_LOCATION       -> handleUpdateTruckLocation(req);
                case MARK_LOAD_BOOKED            -> handleMarkLoadBooked(req);
                case ACTIVATE_SUBSCRIPTION       -> handleActivateSubscription(req);
                case DEACTIVATE_SUBSCRIPTION     -> handleDeactivateSubscription(req);
                default -> IntentResponse.fail(req.getType(), req.getUserId(),
                        "Unhandled intent type: " + req.getType());
            };
        } catch (Exception e) {
            System.out.println("[INTENT] ERROR routing " + req.getType() + ": " + e.getMessage());
            return IntentResponse.fail(req.getType(), req.getUserId(), "Exception: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SMS Handlers
    // ─────────────────────────────────────────────────────────────────────────

    private IntentResponse handleSmsTop20(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());

        if (!prefs.isSmsEnabled() || prefs.getPhoneNumber().isBlank()) {
            return IntentResponse.fail(req.getType(), req.getUserId(),
                    "SMS not enabled or no phone number configured.");
        }

        List<Load> loads = req.getLoads() != null ? req.getLoads()
                : loadService.compileTop20(req.getUserId());

        if (loads.isEmpty()) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No loads to send.");
        }

        boolean sent = smsService.sendTop20Summary(prefs.getPhoneNumber(), req.getUserId(), loads, prefs);
        return sent
                ? IntentResponse.ok(req.getType(), req.getUserId(),
                    "SMS top-20 summary sent to " + prefs.getPhoneNumber() + " (" + loads.size() + " loads)")
                : IntentResponse.fail(req.getType(), req.getUserId(), "SMS send failed.");
    }

    private IntentResponse handleSmsNewLoads(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());

        if (!prefs.isSmsEnabled() || prefs.getPhoneNumber().isBlank()) {
            return IntentResponse.fail(req.getType(), req.getUserId(),
                    "SMS not enabled or no phone number configured.");
        }

        List<Load> loads = req.getLoads() != null ? req.getLoads()
                : loadService.checkForNewMatchingLoads(req.getUserId());

        if (loads.isEmpty()) {
            return IntentResponse.ok(req.getType(), req.getUserId(), "No new loads to alert about.");
        }

        boolean sent = smsService.sendNewLoadsAlert(prefs.getPhoneNumber(), loads);
        return sent
                ? IntentResponse.ok(req.getType(), req.getUserId(),
                    "SMS new loads alert sent — " + loads.size() + " loads")
                : IntentResponse.fail(req.getType(), req.getUserId(), "SMS send failed.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Email Handlers
    // ─────────────────────────────────────────────────────────────────────────

    private IntentResponse handleEmailTop20(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());

        if (!prefs.isEmailEnabled() || prefs.getEmail().isBlank()) {
            return IntentResponse.fail(req.getType(), req.getUserId(),
                    "Email not enabled or no email configured.");
        }

        List<Load> loads = req.getLoads() != null ? req.getLoads()
                : loadService.compileTop20(req.getUserId());

        if (loads.isEmpty()) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No loads to email.");
        }

        boolean sent = emailService.sendTop20Summary(prefs.getEmail(), req.getUserId(), loads, prefs);
        return sent
                ? IntentResponse.ok(req.getType(), req.getUserId(),
                    "Email top-20 summary sent to " + prefs.getEmail())
                : IntentResponse.fail(req.getType(), req.getUserId(), "Email send failed.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Outreach Handlers
    // ─────────────────────────────────────────────────────────────────────────

    private IntentResponse handleBrokerIntro(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());
        List<TruckLocation> trucks = truckLocationStore.getTrucks(req.getUserId());

        String toEmail = req.getBrokerEmail();
        String brokerName = req.getBrokerName() != null ? req.getBrokerName() : "";
        String brokerCompany = req.getBrokerCompany() != null ? req.getBrokerCompany() : "";

        if (toEmail == null || toEmail.isBlank()) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No broker email provided.");
        }

        boolean sent = emailService.sendBrokerIntro(toEmail, brokerName, brokerCompany, prefs, trucks);

        if (sent && req.getBrokerId() != null) {
            brokerContactStore.markIntroSent(req.getUserId(), req.getBrokerId());
        }

        return sent
                ? IntentResponse.ok(req.getType(), req.getUserId(),
                    "Broker intro email sent to " + toEmail)
                : IntentResponse.fail(req.getType(), req.getUserId(), "Broker intro email failed.");
    }

    private IntentResponse handleBrokerFollowUp(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());
        List<TruckLocation> trucks = truckLocationStore.getTrucks(req.getUserId());

        String toEmail = req.getBrokerEmail();
        String brokerName = req.getBrokerName() != null ? req.getBrokerName() : "";
        String brokerCompany = req.getBrokerCompany() != null ? req.getBrokerCompany() : "";
        int followUpNum = req.getExtra("followUpNumber") != null
                ? Integer.parseInt(req.getExtra("followUpNumber")) : 1;

        if (toEmail == null || toEmail.isBlank()) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No broker email provided.");
        }

        boolean sent = emailService.sendBrokerFollowUp(toEmail, brokerName, brokerCompany, prefs, trucks, followUpNum);

        if (sent && req.getBrokerId() != null) {
            brokerContactStore.markFollowUpSent(req.getUserId(), req.getBrokerId());
        }

        return sent
                ? IntentResponse.ok(req.getType(), req.getUserId(),
                    "Broker follow-up #" + followUpNum + " sent to " + toEmail)
                : IntentResponse.fail(req.getType(), req.getUserId(), "Broker follow-up email failed.");
    }

    private IntentResponse handleBrokerAvailability(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());
        List<TruckLocation> availableTrucks = truckLocationStore.getAvailableTrucks(req.getUserId());

        String toEmail = req.getBrokerEmail();
        String brokerName = req.getBrokerName() != null ? req.getBrokerName() : "";

        if (toEmail == null || toEmail.isBlank()) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No broker email provided.");
        }

        if (availableTrucks.isEmpty()) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No available trucks to advertise.");
        }

        boolean sent = emailService.sendBrokerAvailability(toEmail, brokerName, prefs, availableTrucks);
        return sent
                ? IntentResponse.ok(req.getType(), req.getUserId(),
                    "Broker availability blast sent to " + toEmail + " — " + availableTrucks.size() + " trucks")
                : IntentResponse.fail(req.getType(), req.getUserId(), "Broker availability email failed.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  System Handlers
    // ─────────────────────────────────────────────────────────────────────────

    private IntentResponse handleRunEngineTop20(IntentRequest req) {
        List<Load> top20 = loadService.compileTop20(req.getUserId());
        return IntentResponse.ok(req.getType(), req.getUserId(),
                "Engine ran — " + top20.size() + " loads compiled for user=" + req.getUserId());
    }

    private IntentResponse handleUpdateTruckLocation(IntentRequest req) {
        TruckLocation truck = req.getTruck();
        if (truck == null) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No truck data provided.");
        }
        truckLocationStore.addTruck(req.getUserId(), truck);
        return IntentResponse.ok(req.getType(), req.getUserId(),
                "Truck location updated: " + truck.getTruckNumber());
    }

    private IntentResponse handleMarkLoadBooked(IntentRequest req) {
        if (req.getLoads() == null || req.getLoads().isEmpty()) {
            return IntentResponse.fail(req.getType(), req.getUserId(), "No load data provided.");
        }
        Load l = req.getLoads().get(0);
        UserPreferences prefs = preferencesStore.get(req.getUserId());
        LoadBooking booking = new LoadBooking(
                l.getLoadId(), l.getOriginState(), l.getDestinationState(),
                l.getTotalMiles(), l.getDeadheadMiles(), l.getDollarsPerMile(),
                prefs.getEquipmentType(), java.time.Instant.now());
        loadHistoryStore.addBooking(req.getUserId(), booking);
        return IntentResponse.ok(req.getType(), req.getUserId(),
                "Load " + l.getLoadId() + " marked as booked.");
    }

    private IntentResponse handleActivateSubscription(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());
        String tier = req.getExtra("tier");
        if (tier != null) prefs.setSubscriptionTier(tier);
        prefs.setSmsEnabled(req.getPhoneNumber() != null && !req.getPhoneNumber().isBlank());
        prefs.setEmailEnabled(req.getEmailAddress() != null && !req.getEmailAddress().isBlank());
        if (req.getPhoneNumber() != null) prefs.setPhoneNumber(req.getPhoneNumber());
        if (req.getEmailAddress() != null) prefs.setEmail(req.getEmailAddress());
        preferencesStore.update(req.getUserId(), prefs);
        return IntentResponse.ok(req.getType(), req.getUserId(),
                "Subscription activated: " + prefs.getSubscriptionTier());
    }

    private IntentResponse handleDeactivateSubscription(IntentRequest req) {
        UserPreferences prefs = preferencesStore.get(req.getUserId());
        prefs.setSmsEnabled(false);
        prefs.setEmailEnabled(false);
        preferencesStore.update(req.getUserId(), prefs);
        return IntentResponse.ok(req.getType(), req.getUserId(), "Subscription deactivated.");
    }
}
