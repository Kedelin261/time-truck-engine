package com.time.truckengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TimeTruckEngineApplication {

    public static void main(String[] args) {
        SpringApplication.run(TimeTruckEngineApplication.class, args);
    }
}
