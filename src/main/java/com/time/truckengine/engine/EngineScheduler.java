package com.time.truckengine.engine;

import com.time.truckengine.loadboard.LoadService;
import com.time.truckengine.notifications.AlertService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

/**
 * ENGINE SCHEDULER — all scheduled jobs route exclusively via AlertService → IntentRouter.
 * No direct calls to notification services.
 */
@Component
public class EngineScheduler {

    private final LoadService loadService;
    private final AlertService alertService;
    private final AccountStore accountStore;

    public EngineScheduler(LoadService loadService, AlertService alertService, AccountStore accountStore) {
        this.loadService = loadService;
        this.alertService = alertService;
        this.accountStore = accountStore;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Morning Top-20 Summary — 5:00 AM daily (every 20s in test mode)
    // ─────────────────────────────────────────────────────────────────────────
    @Scheduled(fixedRate = 20000)
    public void morningTop20() {
        for (String userId : accountStore.getUsersWithDatConnected()) {
            var top20 = loadService.compileTop20(userId);
            if (!top20.isEmpty()) {
                alertService.sendTop20(userId, top20);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Hourly New Load Alerts — within dispatch window (4 AM - 1 AM)
    // ─────────────────────────────────────────────────────────────────────────
    @Scheduled(fixedRate = 15000)
    public void hourlyUpdate() {
        if (!isWithinAlertWindow()) return;

        for (String userId : accountStore.getUsersWithDatConnected()) {
            var newLoads = loadService.checkForNewMatchingLoads(userId);
            if (!newLoads.isEmpty()) {
                alertService.sendNewLoads(userId, newLoads);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Intro Outreach — every 6 hours (checks for new brokers needing intro)
    // ─────────────────────────────────────────────────────────────────────────
    @Scheduled(fixedRate = 6 * 60 * 60 * 1000)
    public void brokerIntroOutreach() {
        for (String userId : accountStore.getUsersWithDatConnected()) {
            alertService.runBrokerIntros(userId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Follow-Up Outreach — every 12 hours (3-day cooldown enforced in store)
    // ─────────────────────────────────────────────────────────────────────────
    @Scheduled(fixedRate = 12 * 60 * 60 * 1000)
    public void brokerFollowUpOutreach() {
        for (String userId : accountStore.getUsersWithDatConnected()) {
            alertService.runBrokerFollowUps(userId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Availability Blast — every morning at 6 AM
    //  Tells active brokers which trucks are available and where
    // ─────────────────────────────────────────────────────────────────────────
    @Scheduled(cron = "0 0 6 * * *")
    public void morningAvailabilityBlast() {
        for (String userId : accountStore.getUsersWithDatConnected()) {
            alertService.runBrokerAvailabilityBlast(userId);
        }
    }

    private boolean isWithinAlertWindow() {
        LocalTime now = LocalTime.now();
        LocalTime start = LocalTime.of(4, 0);
        LocalTime end = LocalTime.of(1, 0);
        return !now.isBefore(start) || now.isBefore(end);
    }
}
