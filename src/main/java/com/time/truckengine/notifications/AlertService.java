package com.time.truckengine.notifications;

import com.time.truckengine.engine.BrokerContactStore;
import com.time.truckengine.engine.LoadScorer;
import com.time.truckengine.engine.PreferencesStore;
import com.time.truckengine.intent.IntentRequest;
import com.time.truckengine.intent.IntentResponse;
import com.time.truckengine.intent.IntentRouter;
import com.time.truckengine.intent.IntentType;
import com.time.truckengine.model.BrokerContact;
import com.time.truckengine.model.Load;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * ALERT SERVICE — bridges the scheduler to the Intent Layer.
 *
 * Architecture rule: AlertService ONLY communicates via IntentRouter.
 * No direct calls to SMS/Email services from here.
 */
@Component
public class AlertService {

    private final LoadScorer scorer;
    private final PreferencesStore preferencesStore;
    private final IntentRouter intentRouter;
    private final BrokerContactStore brokerContactStore;

    public AlertService(LoadScorer scorer,
                        PreferencesStore preferencesStore,
                        IntentRouter intentRouter,
                        BrokerContactStore brokerContactStore) {
        this.scorer = scorer;
        this.preferencesStore = preferencesStore;
        this.intentRouter = intentRouter;
        this.brokerContactStore = brokerContactStore;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Load Notifications — via Intent Layer
    // ─────────────────────────────────────────────────────────────────────────

    public void sendTop20(String userId, List<Load> top20) {
        var prefs = preferencesStore.get(userId);

        // Console summary (always)
        System.out.println("\n================ TOP 20 LOADS (ENGINE) user=" + userId + " =================");
        top20.forEach(l ->
                System.out.println(" " + l + " | score=" + String.format("%.1f", scorer.scoreWithPrefs(l, prefs))));
        System.out.println("==========================================================================\n");

        // SMS via Intent Layer
        if (prefs.isSmsEnabled()) {
            IntentResponse smsResp = intentRouter.route(
                    IntentRequest.builder(IntentType.SEND_SMS_TOP20_SUMMARY, userId)
                            .loads(top20)
                            .build());
            System.out.println("[ALERT] " + smsResp);
        }

        // Email via Intent Layer
        if (prefs.isEmailEnabled()) {
            IntentResponse emailResp = intentRouter.route(
                    IntentRequest.builder(IntentType.SEND_EMAIL_TOP20_SUMMARY, userId)
                            .loads(top20)
                            .build());
            System.out.println("[ALERT] " + emailResp);
        }
    }

    public void sendNewLoads(String userId, List<Load> newLoads) {
        var prefs = preferencesStore.get(userId);

        System.out.println("\n************* NEW MATCHING LOADS user=" + userId + " *************");
        newLoads.forEach(l ->
                System.out.println(" " + l + " | score=" + String.format("%.1f", scorer.scoreWithPrefs(l, prefs))));
        System.out.println("*****************************************************************\n");

        // SMS alert via Intent Layer
        if (prefs.isSmsEnabled()) {
            IntentResponse resp = intentRouter.route(
                    IntentRequest.builder(IntentType.SEND_SMS_NEW_LOADS_ALERT, userId)
                            .loads(newLoads)
                            .build());
            System.out.println("[ALERT] " + resp);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Outreach — via Intent Layer
    // ─────────────────────────────────────────────────────────────────────────

    public void runBrokerIntros(String userId) {
        List<BrokerContact> needIntro = brokerContactStore.getBrokersNeedingIntro(userId);
        if (needIntro.isEmpty()) return;

        System.out.println("[BROKER] Running intro emails for user=" + userId + " — " + needIntro.size() + " brokers");

        for (BrokerContact broker : needIntro) {
            IntentResponse resp = intentRouter.route(
                    IntentRequest.builder(IntentType.SEND_BROKER_INTRO_EMAIL, userId)
                            .brokerId(broker.getBrokerId())
                            .brokerEmail(broker.getBrokerEmail())
                            .brokerName(broker.getBrokerName())
                            .brokerCompany(broker.getBrokerCompany())
                            .build());
            System.out.println("[BROKER INTRO] " + resp);
        }
    }

    public void runBrokerFollowUps(String userId) {
        List<BrokerContact> needFollowUp = brokerContactStore.getBrokersNeedingFollowUp(userId);
        if (needFollowUp.isEmpty()) return;

        System.out.println("[BROKER] Running follow-up emails for user=" + userId + " — " + needFollowUp.size() + " brokers");

        for (BrokerContact broker : needFollowUp) {
            int nextFollowUp = broker.getFollowUpCount() + 1;
            IntentResponse resp = intentRouter.route(
                    IntentRequest.builder(IntentType.SEND_BROKER_FOLLOWUP_EMAIL, userId)
                            .brokerId(broker.getBrokerId())
                            .brokerEmail(broker.getBrokerEmail())
                            .brokerName(broker.getBrokerName())
                            .brokerCompany(broker.getBrokerCompany())
                            .extras(Map.of("followUpNumber", String.valueOf(nextFollowUp)))
                            .build());
            System.out.println("[BROKER FOLLOWUP] " + resp);
        }
    }

    public void runBrokerAvailabilityBlast(String userId) {
        List<BrokerContact> allBrokers = brokerContactStore.getBrokers(userId).stream()
                .filter(b -> "ACTIVE".equals(b.getStatus()) || "FOLLOW_UP_SENT".equals(b.getStatus()))
                .filter(b -> b.getBrokerEmail() != null && !b.getBrokerEmail().isBlank())
                .toList();

        if (allBrokers.isEmpty()) return;

        System.out.println("[BROKER] Availability blast for user=" + userId + " — " + allBrokers.size() + " brokers");

        for (BrokerContact broker : allBrokers) {
            IntentResponse resp = intentRouter.route(
                    IntentRequest.builder(IntentType.SEND_BROKER_AVAILABILITY_EMAIL, userId)
                            .brokerId(broker.getBrokerId())
                            .brokerEmail(broker.getBrokerEmail())
                            .brokerName(broker.getBrokerName())
                            .brokerCompany(broker.getBrokerCompany())
                            .build());
            System.out.println("[BROKER AVAIL] " + resp);
        }
    }
}
