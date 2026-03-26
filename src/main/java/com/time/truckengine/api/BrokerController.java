package com.time.truckengine.api;

import com.time.truckengine.engine.BrokerContactStore;
import com.time.truckengine.intent.IntentRequest;
import com.time.truckengine.intent.IntentResponse;
import com.time.truckengine.intent.IntentRouter;
import com.time.truckengine.intent.IntentType;
import com.time.truckengine.model.BrokerContact;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/brokers")
public class BrokerController {

    private final BrokerContactStore brokerStore;
    private final IntentRouter intentRouter;

    public BrokerController(BrokerContactStore brokerStore, IntentRouter intentRouter) {
        this.brokerStore = brokerStore;
        this.intentRouter = intentRouter;
    }

    @GetMapping
    public List<BrokerContact> list(@PathVariable String userId) {
        return brokerStore.getBrokers(userId);
    }

    @PostMapping
    public BrokerContact add(@PathVariable String userId, @RequestBody BrokerContact broker) {
        return brokerStore.addBroker(userId, broker);
    }

    @PutMapping("/{brokerId}")
    public ResponseEntity<BrokerContact> update(@PathVariable String userId,
                                                @PathVariable String brokerId,
                                                @RequestBody BrokerContact updated) {
        return brokerStore.updateBroker(userId, brokerId, updated)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{brokerId}")
    public ResponseEntity<Void> delete(@PathVariable String userId, @PathVariable String brokerId) {
        boolean removed = brokerStore.deleteBroker(userId, brokerId);
        return removed ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    /** Manually trigger intro email for a specific broker */
    @PostMapping("/{brokerId}/send-intro")
    public IntentResponse sendIntro(@PathVariable String userId, @PathVariable String brokerId) {
        return brokerStore.getBroker(userId, brokerId)
                .map(broker -> intentRouter.route(
                        IntentRequest.builder(IntentType.SEND_BROKER_INTRO_EMAIL, userId)
                                .brokerId(brokerId)
                                .brokerEmail(broker.getBrokerEmail())
                                .brokerName(broker.getBrokerName())
                                .brokerCompany(broker.getBrokerCompany())
                                .build()))
                .orElse(IntentResponse.fail(IntentType.SEND_BROKER_INTRO_EMAIL, userId, "Broker not found"));
    }

    /** Manually trigger follow-up email for a specific broker */
    @PostMapping("/{brokerId}/send-followup")
    public IntentResponse sendFollowUp(@PathVariable String userId, @PathVariable String brokerId) {
        return brokerStore.getBroker(userId, brokerId)
                .map(broker -> intentRouter.route(
                        IntentRequest.builder(IntentType.SEND_BROKER_FOLLOWUP_EMAIL, userId)
                                .brokerId(brokerId)
                                .brokerEmail(broker.getBrokerEmail())
                                .brokerName(broker.getBrokerName())
                                .brokerCompany(broker.getBrokerCompany())
                                .extras(java.util.Map.of("followUpNumber",
                                        String.valueOf(broker.getFollowUpCount() + 1)))
                                .build()))
                .orElse(IntentResponse.fail(IntentType.SEND_BROKER_FOLLOWUP_EMAIL, userId, "Broker not found"));
    }

    /** Manually trigger availability blast to all active brokers */
    @PostMapping("/blast-availability")
    public List<IntentResponse> blastAvailability(@PathVariable String userId) {
        return brokerStore.getBrokers(userId).stream()
                .filter(b -> b.getBrokerEmail() != null && !b.getBrokerEmail().isBlank())
                .map(broker -> intentRouter.route(
                        IntentRequest.builder(IntentType.SEND_BROKER_AVAILABILITY_EMAIL, userId)
                                .brokerId(broker.getBrokerId())
                                .brokerEmail(broker.getBrokerEmail())
                                .brokerName(broker.getBrokerName())
                                .brokerCompany(broker.getBrokerCompany())
                                .build()))
                .toList();
    }
}
