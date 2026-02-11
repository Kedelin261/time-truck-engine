package com.time.truckengine.api;

import com.time.truckengine.engine.PreferencesStore;
import com.time.truckengine.model.UserPreferences;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/{userId}/preferences")
public class PreferencesController {

    private final PreferencesStore store;

    public PreferencesController(PreferencesStore store) {
        this.store = store;
    }

    @GetMapping
    public UserPreferences get(@PathVariable String userId) {
        return store.get(userId);
    }

    @PostMapping
    public UserPreferences update(@PathVariable String userId, @RequestBody UserPreferences prefs) {
        return store.update(userId, prefs);
    }
}
