package com.time.truckengine.api;

import com.time.truckengine.engine.LoadHistoryStore;
import com.time.truckengine.model.LoadBooking;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/bookings")
public class BookingController {

    private final LoadHistoryStore historyStore;

    public BookingController(LoadHistoryStore historyStore) {
        this.historyStore = historyStore;
    }

    @PostMapping
    public void add(@PathVariable String userId, @RequestBody LoadBooking booking) {
        historyStore.addBooking(userId, booking);
    }

    @GetMapping
    public List<LoadBooking> list(@PathVariable String userId) {
        return historyStore.getBookings(userId);
    }

    @GetMapping("/profile")
    public Object profile(@PathVariable String userId) {
        return historyStore.buildProfile(userId);
    }
}
