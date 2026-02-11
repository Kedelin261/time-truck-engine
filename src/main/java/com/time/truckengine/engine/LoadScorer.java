package com.time.truckengine.engine;

import com.time.truckengine.model.Load;
import com.time.truckengine.model.UserPreferences;
import org.springframework.stereotype.Component;

@Component
public class LoadScorer {

    public double baseScore(Load l) {
        double score = 0;


        // dollars per mile is king
        score += l.getDollarsPerMile() * 60.0;

        // penalize deadhead
        score -= l.getDeadheadMiles() * 0.6;

        // mild reward for more miles (cap benefit)
        score += Math.min(l.getTotalMiles(), 900) * 0.03;

        return score;
    }
    public double scoreWithPrefs(Load l, UserPreferences prefs) {
        return baseScore(l);
    }


    public MatchExplanation explain(Load l, UserPreferences prefs, HistoryProfile history) {
        MatchExplanation e = new MatchExplanation();

        e.baseScore = baseScore(l);

        // boosts based on trend learning
        e.laneBoost = history.laneSimilarityBoost(l.getOriginState(), l.getDestinationState());
        e.milesBoost = history.milesSimilarityBoost(l.getTotalMiles());
        e.equipmentBoost = history.equipmentBoost(prefs.getEquipmentType());

        return e;
    }

    public double scoreWithHistory(Load l, UserPreferences prefs, HistoryProfile history) {
        return explain(l, prefs, history).total();
    }
}
