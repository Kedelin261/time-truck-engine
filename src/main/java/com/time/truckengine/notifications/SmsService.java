package com.time.truckengine.notifications;

import com.time.truckengine.model.Load;
import com.time.truckengine.model.UserPreferences;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

/**
 * NOTIFICATION LAYER — SMS via Twilio REST API.
 *
 * Configure via environment variables (or application.properties):
 *   TWILIO_ACCOUNT_SID   — your Twilio Account SID
 *   TWILIO_AUTH_TOKEN    — your Twilio Auth Token
 *   TWILIO_FROM_NUMBER   — your Twilio phone number (e.g. +15551234567)
 *
 * In development mode (no credentials set) messages are printed to console.
 */
@Component
public class SmsService {

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.from.number:+15550000000}")
    private String fromNumber;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Send a Top-20 load summary SMS to the user.
     * Format is optimized for mobile readability — key numbers, broker contact.
     */
    public boolean sendTop20Summary(String toPhone, String userId, List<Load> top20, UserPreferences prefs) {
        if (toPhone == null || toPhone.isBlank()) return false;

        StringBuilder sb = new StringBuilder();
        sb.append("🚛 TRUCKING.TIME — TOP LOADS\n");
        sb.append("📍 From: ").append(prefs.getHomeCity().isBlank() ? prefs.getHomeState() : prefs.getHomeCity() + ", " + prefs.getHomeState()).append("\n\n");

        int count = Math.min(top20.size(), 5); // SMS limit — send top 5 in text
        for (int i = 0; i < count; i++) {
            Load l = top20.get(i);
            sb.append("#").append(i + 1).append(" ")
              .append(l.getOriginState()).append(" → ").append(l.getDestinationState()).append("\n");
            sb.append("  Miles: ").append(l.getTotalMiles())
              .append(" | Rate: $").append(String.format("%.0f", l.getRate()))
              .append(" ($").append(String.format("%.2f", l.getDollarsPerMile())).append("/mi)\n");
            if (!l.getBrokerPhone().isBlank()) {
                sb.append("  📞 ").append(l.getBrokerCompany().isBlank() ? l.getBrokerName() : l.getBrokerCompany())
                  .append(": ").append(l.getBrokerPhone()).append("\n");
            }
            sb.append("\n");
        }
        sb.append("View all ").append(top20.size()).append(" loads in your dashboard.\n");
        sb.append("Reply STOP to unsubscribe.");

        return send(toPhone, sb.toString());
    }

    /**
     * Send new loads alert SMS.
     */
    public boolean sendNewLoadsAlert(String toPhone, List<Load> newLoads) {
        if (toPhone == null || toPhone.isBlank() || newLoads.isEmpty()) return false;

        StringBuilder sb = new StringBuilder();
        sb.append("🚨 TRUCKING.TIME — NEW LOADS\n\n");

        for (Load l : newLoads) {
            sb.append("• ").append(l.getOriginState()).append(" → ").append(l.getDestinationState())
              .append(" | ").append(l.getTotalMiles()).append("mi")
              .append(" | $").append(String.format("%.0f", l.getRate()))
              .append(" ($").append(String.format("%.2f", l.getDollarsPerMile())).append("/mi)\n");
            if (!l.getBrokerPhone().isBlank()) {
                sb.append("  ☎ ").append(l.getBrokerPhone()).append("\n");
            }
        }
        sb.append("\nOpen dashboard for full details.");
        return send(toPhone, sb.toString());
    }

    /**
     * Core send method — uses Twilio REST API when credentials are available,
     * otherwise logs to console (dev mode).
     */
    public boolean send(String toPhone, String body) {
        System.out.println("[SMS] → " + toPhone + "\n" + body + "\n--- end SMS ---");

        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()) {
            System.out.println("[SMS] DEV MODE — not actually sending (configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
            return true;
        }

        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";
            String form = "To=" + encode(toPhone) + "&From=" + encode(fromNumber) + "&Body=" + encode(body);

            String credentials = Base64.getEncoder().encodeToString((accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            boolean ok = resp.statusCode() >= 200 && resp.statusCode() < 300;
            System.out.println("[SMS] Twilio response: " + resp.statusCode() + (ok ? " OK" : " ERROR: " + resp.body()));
            return ok;

        } catch (Exception e) {
            System.out.println("[SMS] ERROR sending to " + toPhone + ": " + e.getMessage());
            return false;
        }
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
