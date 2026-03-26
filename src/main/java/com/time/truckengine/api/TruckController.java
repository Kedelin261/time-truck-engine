package com.time.truckengine.api;

import com.time.truckengine.engine.TruckLocationStore;
import com.time.truckengine.model.TruckLocation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/trucks")
public class TruckController {

    private final TruckLocationStore truckStore;

    public TruckController(TruckLocationStore truckStore) {
        this.truckStore = truckStore;
    }

    @GetMapping
    public List<TruckLocation> list(@PathVariable String userId) {
        return truckStore.getTrucks(userId);
    }

    @GetMapping("/available")
    public List<TruckLocation> available(@PathVariable String userId) {
        return truckStore.getAvailableTrucks(userId);
    }

    @PostMapping
    public TruckLocation add(@PathVariable String userId, @RequestBody TruckLocation truck) {
        return truckStore.addTruck(userId, truck);
    }

    @PutMapping("/{truckId}")
    public ResponseEntity<TruckLocation> update(@PathVariable String userId,
                                                @PathVariable String truckId,
                                                @RequestBody TruckLocation updated) {
        return truckStore.updateTruck(userId, truckId, updated)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{truckId}")
    public ResponseEntity<Void> delete(@PathVariable String userId, @PathVariable String truckId) {
        boolean removed = truckStore.deleteTruck(userId, truckId);
        return removed ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}
