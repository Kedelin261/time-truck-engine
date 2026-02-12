package com.time.truckengine.api;

import com.time.truckengine.loadboard.LoadService;
import com.time.truckengine.model.Load;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}")
public class LoadsController {

    private final LoadService loadService;

    public LoadsController(LoadService loadService) {
        this.loadService = loadService;
    }

    @GetMapping("/top20")
    public List<Load> top20(@PathVariable String userId) {
        return loadService.compileTop20(userId);
    }

    @GetMapping("/newLoads")
    public List<Load> newLoads(@PathVariable String userId) {
        return loadService.checkForNewMatchingLoads(userId);
    }
}
