package com.time.truckengine.loadboard;

import com.time.truckengine.engine.AccountStore;
import com.time.truckengine.model.Load;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatOneClientStub implements LoadBoardClient {

    private final AccountStore accountStore;

    public DatOneClientStub(AccountStore accountStore) {
        this.accountStore = accountStore;
    }

    @Override
    public List<Load> fetchLoads(String userId) {

        if (accountStore.getDatTokenDecrypted(userId).isEmpty()) {
            return List.of();
        }


        // Stub loads (later: replace with real DAT API call)
        return List.of(
                new Load("DAT-1", "DE", "PA", 20, 350, 900),
                new Load("DAT-2", "DE", "VA", 40, 420, 1200),
                new Load("DAT-3", "NJ", "NC", 30, 500, 1500),
                new Load("DAT-4", "PA", "OH", 15, 480, 1100),
                new Load("DAT-5", "MD", "GA", 50, 700, 2100)
        );
    }
}
