package com.time.truckengine.loadboard;

import com.time.truckengine.engine.HistoryProfile;
import com.time.truckengine.engine.LoadHistoryStore;
import com.time.truckengine.engine.LoadScorer;
import com.time.truckengine.engine.PreferencesStore;
import com.time.truckengine.model.Load;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class LoadService {

    private final LoadScorer scorer;
    private final PreferencesStore preferencesStore;
    private final LoadBoardClient loadBoardClient;
    private final LoadHistoryStore historyStore;

    private final Map<String, Set<String>> seenByUser = new ConcurrentHashMap<>();

    public LoadService(LoadScorer scorer,
                       PreferencesStore preferencesStore,
                       LoadBoardClient loadBoardClient,
                       LoadHistoryStore historyStore) {
        this.scorer = scorer;
        this.preferencesStore = preferencesStore;
        this.loadBoardClient = loadBoardClient;
        this.historyStore = historyStore;
    }

    public List<Load> compileTop20(String userId) {
        var prefs = preferencesStore.get(userId);
        HistoryProfile history = historyStore.buildProfile(userId);
        List<Load> all = loadBoardClient.fetchLoads(userId);

        return all.stream()
                .filter(l -> passesHardFilters(userId, l))
                .sorted((a, b) -> Double.compare(
                        scorer.scoreWithHistory(b, prefs, history),
                        scorer.scoreWithHistory(a, prefs, history)
                ))
                .limit(20)
                .collect(Collectors.toList());
    }

    public List<Load> checkForNewMatchingLoads(String userId) {
        var prefs = preferencesStore.get(userId);
        HistoryProfile history = historyStore.buildProfile(userId);
        List<Load> all = loadBoardClient.fetchLoads(userId);

        List<Load> matches = all.stream()
                .filter(l -> passesHardFilters(userId, l))
                .sorted((a, b) -> Double.compare(
                        scorer.scoreWithHistory(b, prefs, history),
                        scorer.scoreWithHistory(a, prefs, history)
                ))
                .collect(Collectors.toList());

        Set<String> seen = seenByUser.computeIfAbsent(userId, id -> ConcurrentHashMap.newKeySet());

        List<Load> fresh = matches.stream()
                .filter(l -> !seen.contains(l.getLoadId()))
                .limit(5)
                .collect(Collectors.toList());

        fresh.forEach(l -> seen.add(l.getLoadId()));

        return fresh;
    }

    private boolean passesHardFilters(String userId, Load l) {
        var prefs = preferencesStore.get(userId);

        if (l.getDeadheadMiles() > prefs.getMaxDeadheadMiles()) return false;
        if (l.getTotalMiles() < prefs.getMinTotalMiles()) return false;
        if (l.getDollarsPerMile() < prefs.getMinDollarsPerMile()) return false;

        return true;
    }
}
