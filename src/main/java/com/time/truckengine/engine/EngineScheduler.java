package com.time.truckengine.engine;

import com.time.truckengine.loadboard.LoadService;
import com.time.truckengine.notifications.AlertService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

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


    // TEST MODE: every 20 seconds
    @Scheduled(fixedRate = 20000)
    public void morningTop20() {
        for (String userId : accountStore.getUsersWithDatConnected()) {
            var top20 = loadService.compileTop20(userId);
            if (!top20.isEmpty()) {
                alertService.sendTop20(userId, top20);
            }
        }
    }

    // TEST MODE: every 15 seconds
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

    private boolean isWithinAlertWindow() {
        LocalTime now = LocalTime.now();
        LocalTime start = LocalTime.of(4, 0);
        LocalTime end = LocalTime.of(1, 0);

        // Window spans midnight (4:00 -> 1:00 next day)
        return !now.isBefore(start) || now.isBefore(end);
    }
}
