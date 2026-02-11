package com.time.truckengine.api;

import com.time.truckengine.engine.AccountStore;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/accounts")
public class AccountController {

    private final AccountStore store;

    public AccountController(AccountStore store) {
        this.store = store;
    }

    // ✅ STATUS endpoint for UI
    @GetMapping("/status")
    public AccountStatus datStatus(@PathVariable String userId) {
        var connOpt = store.getDatConnection(userId);

        boolean connected = store.getDatTokenDecrypted(userId).isPresent();
        return connOpt
                .map(c -> new AccountStatus("DAT_ONE", connected, c.getLastUpdated(),
                        connected ? "Connected" : "Token missing/invalid"))
                .orElse(new AccountStatus("DAT_ONE", false, null, "Not connected"));
    }

    // ✅ Do NOT return tokens anymore
    @GetMapping
    public List<AccountStatus> list(@PathVariable String userId) {
        return store.getConnections(userId).stream()
                .map(c -> new AccountStatus(
                        c.getProvider(),
                        store.getDatTokenDecrypted(userId).isPresent(),
                        c.getLastUpdated(),
                        store.getDatTokenDecrypted(userId).isPresent() ? "Connected" : "Token missing/invalid"
                ))
                .toList();
    }

    // ✅ Post raw token, store encrypted (UPSERT)
    @PostMapping("/dat")
    public void upsertDat(@PathVariable String userId, @RequestBody TokenRequest request) {
        store.upsertDatToken(userId, request.token);
    }

    public static class TokenRequest {
        public String token;
    }
}
