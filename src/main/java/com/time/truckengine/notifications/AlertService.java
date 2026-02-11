package com.time.truckengine.notifications;

import com.time.truckengine.engine.LoadScorer;
import com.time.truckengine.engine.PreferencesStore;
import com.time.truckengine.model.Load;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AlertService {

    private final LoadScorer scorer;
    private final PreferencesStore preferencesStore;

    public AlertService(LoadScorer scorer, PreferencesStore preferencesStore) {
        this.scorer = scorer;
        this.preferencesStore = preferencesStore;
    }

    public void sendTop20(String userId, List<Load> top20) {
        var prefs = preferencesStore.get(userId);

        System.out.println("\n================ TOP 20 LOADS (ENGINE) user=" + userId + " =================");
        top20.forEach(l ->
                System.out.println(" " + l + " | score=" + String.format("%.1f", scorer.scoreWithPrefs(l, prefs)))
        );
        System.out.println("==========================================================================\n");
    }

    public void sendNewLoads(String userId, List<Load> newLoads) {
        var prefs = preferencesStore.get(userId);

        System.out.println("\n************* NEW MATCHING LOADS user=" + userId + " *************");
        newLoads.forEach(l ->
                System.out.println(" " + l + " | score=" + String.format("%.1f", scorer.scoreWithPrefs(l, prefs)))
        );
        System.out.println("*****************************************************************\n");
    }
}
