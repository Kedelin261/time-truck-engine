package com.time.truckengine.notifications;

import com.time.truckengine.model.Load;
import com.time.truckengine.model.TruckLocation;
import com.time.truckengine.model.UserPreferences;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * EMAIL LAYER — sends transactional emails via SendGrid API.
 *
 * Configure via environment variables:
 *   SENDGRID_API_KEY     — your SendGrid API key
 *   SENDGRID_FROM_EMAIL  — verified sender email
 *   SENDGRID_FROM_NAME   — sender display name
 *
 * In development mode (no key set) emails are printed to console.
 */
@Component
public class EmailService {

    @Value("${sendgrid.api.key:}")
    private String apiKey;

    @Value("${sendgrid.from.email:noreply@trucking.time}")
    private String fromEmail;

    @Value("${sendgrid.from.name:Trucking.Time}")
    private String fromName;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("MM/dd/yyyy h:mm a").withZone(ZoneId.of("America/New_York"));

    // ─────────────────────────────────────────────────────────────────────────
    //  Top-20 Summary Email
    // ─────────────────────────────────────────────────────────────────────────
    public boolean sendTop20Summary(String toEmail, String userId, List<Load> top20, UserPreferences prefs) {
        if (toEmail == null || toEmail.isBlank()) return false;

        String subject = "Your Top " + top20.size() + " Loads — " + FMT.format(Instant.now());
        String html = buildTop20Html(userId, top20, prefs);
        return send(toEmail, prefs.getOwnerName().isBlank() ? "Driver" : prefs.getOwnerName(), subject, html);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Introduction Email
    // ─────────────────────────────────────────────────────────────────────────
    public boolean sendBrokerIntro(String toEmail, String brokerName, String brokerCompany,
                                   UserPreferences prefs, List<TruckLocation> trucks) {
        if (toEmail == null || toEmail.isBlank()) return false;

        String subject = prefs.getCompanyName() + " — Available Trucks & Introduction";
        String html = buildBrokerIntroHtml(brokerName, brokerCompany, prefs, trucks);
        return send(toEmail, brokerName.isBlank() ? "Freight Team" : brokerName, subject, html);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Follow-Up Email
    // ─────────────────────────────────────────────────────────────────────────
    public boolean sendBrokerFollowUp(String toEmail, String brokerName, String brokerCompany,
                                      UserPreferences prefs, List<TruckLocation> trucks, int followUpNumber) {
        if (toEmail == null || toEmail.isBlank()) return false;

        String subject = followUpNumber == 1
                ? "Following Up — " + prefs.getCompanyName() + " Available for Loads"
                : "Checking In — " + prefs.getCompanyName() + " Still Available";
        String html = buildBrokerFollowUpHtml(brokerName, brokerCompany, prefs, trucks, followUpNumber);
        return send(toEmail, brokerName.isBlank() ? "Freight Team" : brokerName, subject, html);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Broker Availability Blast (trucks are available now)
    // ─────────────────────────────────────────────────────────────────────────
    public boolean sendBrokerAvailability(String toEmail, String brokerName,
                                          UserPreferences prefs, List<TruckLocation> availableTrucks) {
        if (toEmail == null || toEmail.isBlank()) return false;

        String subject = "Available Trucks Now — " + prefs.getCompanyName();
        String html = buildAvailabilityHtml(brokerName, prefs, availableTrucks);
        return send(toEmail, brokerName.isBlank() ? "Freight Team" : brokerName, subject, html);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HTML Builders
    // ─────────────────────────────────────────────────────────────────────────

    private String buildTop20Html(String userId, List<Load> loads, UserPreferences prefs) {
        StringBuilder sb = new StringBuilder();
        sb.append(htmlHeader("Your Top Loads — " + FMT.format(Instant.now())));
        sb.append("<h2 style='color:#1a3c5e;'>🚛 Top ").append(loads.size()).append(" Loads for You</h2>");
        sb.append("<p style='color:#555;'>Hi ").append(prefs.getOwnerName().isBlank() ? "there" : prefs.getOwnerName())
          .append(", here are today's best-scored loads based on your preferences and route history.</p>");

        sb.append("<p><strong>📍 Home Base:</strong> ")
          .append(prefs.getHomeCity().isBlank() ? "" : prefs.getHomeCity() + ", ")
          .append(prefs.getHomeState())
          .append(" &nbsp;|&nbsp; <strong>Equipment:</strong> ")
          .append(formatEquipment(prefs.getEquipmentType())).append("</p>");

        sb.append("<table style='width:100%;border-collapse:collapse;margin-top:16px;'>");
        sb.append("<thead><tr style='background:#1a3c5e;color:#fff;'>");
        sb.append("<th style='padding:10px;text-align:left;'>#</th>");
        sb.append("<th style='padding:10px;text-align:left;'>Route</th>");
        sb.append("<th style='padding:10px;text-align:left;'>Miles</th>");
        sb.append("<th style='padding:10px;text-align:left;'>Deadhead</th>");
        sb.append("<th style='padding:10px;text-align:left;'>Rate</th>");
        sb.append("<th style='padding:10px;text-align:left;'>$/Mile</th>");
        sb.append("<th style='padding:10px;text-align:left;'>Pickup</th>");
        sb.append("<th style='padding:10px;text-align:left;'>Broker Contact</th>");
        sb.append("</tr></thead><tbody>");

        for (int i = 0; i < loads.size(); i++) {
            Load l = loads.get(i);
            String bg = i % 2 == 0 ? "#f9f9f9" : "#ffffff";
            sb.append("<tr style='background:").append(bg).append(";border-bottom:1px solid #e0e0e0;'>");
            sb.append("<td style='padding:10px;font-weight:bold;'>").append(i + 1).append("</td>");
            sb.append("<td style='padding:10px;'>")
              .append("<strong>").append(l.getOriginState()).append("</strong>")
              .append(l.getOriginCity().isBlank() ? "" : " (" + l.getOriginCity() + ")")
              .append(" → <strong>").append(l.getDestinationState()).append("</strong>")
              .append(l.getDestinationCity().isBlank() ? "" : " (" + l.getDestinationCity() + ")")
              .append("</td>");
            sb.append("<td style='padding:10px;'>").append(l.getTotalMiles()).append(" mi</td>");
            sb.append("<td style='padding:10px;'>").append(l.getDeadheadMiles()).append(" mi</td>");
            sb.append("<td style='padding:10px;font-weight:bold;color:#1a7a1a;'>$").append(String.format("%.0f", l.getRate())).append("</td>");
            sb.append("<td style='padding:10px;'>$").append(String.format("%.2f", l.getDollarsPerMile())).append("</td>");
            sb.append("<td style='padding:10px;'>").append(l.getPickupDate().isBlank() ? "—" : l.getPickupDate()).append("</td>");
            sb.append("<td style='padding:10px;'>");
            if (!l.getBrokerName().isBlank() || !l.getBrokerCompany().isBlank()) {
                sb.append("<strong>").append(l.getBrokerCompany().isBlank() ? l.getBrokerName() : l.getBrokerCompany()).append("</strong><br>");
                if (!l.getBrokerName().isBlank() && !l.getBrokerCompany().isBlank()) {
                    sb.append(l.getBrokerName()).append("<br>");
                }
                if (!l.getBrokerPhone().isBlank()) sb.append("📞 <a href='tel:").append(l.getBrokerPhone()).append("'>").append(l.getBrokerPhone()).append("</a><br>");
                if (!l.getBrokerEmail().isBlank()) sb.append("✉ <a href='mailto:").append(l.getBrokerEmail()).append("'>").append(l.getBrokerEmail()).append("</a>");
            } else {
                sb.append("—");
            }
            sb.append("</td></tr>");
        }

        sb.append("</tbody></table>");
        sb.append("<div style='margin-top:24px;padding:16px;background:#e8f4fd;border-radius:8px;'>");
        sb.append("<p style='margin:0;color:#1a3c5e;'><strong>💡 Pro Tip:</strong> These loads were scored based on your route history, ");
        sb.append("deadhead tolerance, and dollar-per-mile preferences. The top loads are ready to book — call the broker now!</p>");
        sb.append("</div>");
        sb.append(htmlFooter(prefs));
        return sb.toString();
    }

    private String buildBrokerIntroHtml(String brokerName, String brokerCompany,
                                        UserPreferences prefs, List<TruckLocation> trucks) {
        StringBuilder sb = new StringBuilder();
        sb.append(htmlHeader("Introduction — " + prefs.getCompanyName()));
        sb.append("<h2 style='color:#1a3c5e;'>Hello ").append(brokerName.isBlank() ? "Freight Team" : brokerName).append(",</h2>");
        sb.append("<p>My name is <strong>").append(prefs.getOwnerName()).append("</strong>, owner of <strong>")
          .append(prefs.getCompanyName()).append("</strong>. I'm reaching out to introduce ourselves and let you know we're available for freight.</p>");

        sb.append("<h3 style='color:#1a3c5e;'>About Us</h3>");
        sb.append("<ul>");
        sb.append("<li><strong>Company:</strong> ").append(prefs.getCompanyName()).append("</li>");
        if (!prefs.getMcNumber().isBlank()) sb.append("<li><strong>MC#:</strong> ").append(prefs.getMcNumber()).append("</li>");
        if (!prefs.getDotNumber().isBlank()) sb.append("<li><strong>DOT#:</strong> ").append(prefs.getDotNumber()).append("</li>");
        sb.append("<li><strong>Equipment:</strong> ").append(formatEquipment(prefs.getEquipmentType())).append("</li>");
        sb.append("<li><strong>Home Base:</strong> ").append(prefs.getHomeCity().isBlank() ? "" : prefs.getHomeCity() + ", ").append(prefs.getHomeState()).append("</li>");
        sb.append("</ul>");

        sb.append(buildTruckTable(trucks));

        sb.append("<h3 style='color:#1a3c5e;'>Why Work With Us?</h3>");
        sb.append("<ul>");
        sb.append("<li>✅ Reliable, on-time delivery</li>");
        sb.append("<li>✅ Fully insured and compliant</li>");
        sb.append("<li>✅ Transparent communication</li>");
        sb.append("<li>✅ Available for regular lanes</li>");
        sb.append("</ul>");

        sb.append("<p>We would love the opportunity to move freight for ").append(brokerCompany.isBlank() ? "your company" : brokerCompany)
          .append(". Please feel free to reach out directly to discuss available loads.</p>");
        sb.append("<p><strong>").append(prefs.getOwnerName()).append("</strong><br>");
        if (!prefs.getCompanyPhone().isBlank()) sb.append("📞 ").append(prefs.getCompanyPhone()).append("<br>");
        if (!prefs.getCompanyEmail().isBlank()) sb.append("✉ <a href='mailto:").append(prefs.getCompanyEmail()).append("'>").append(prefs.getCompanyEmail()).append("</a><br>");
        if (!prefs.getCompanyWebsite().isBlank()) sb.append("🌐 <a href='").append(prefs.getCompanyWebsite()).append("'>").append(prefs.getCompanyWebsite()).append("</a>");
        sb.append("</p>");
        sb.append(htmlFooter(prefs));
        return sb.toString();
    }

    private String buildBrokerFollowUpHtml(String brokerName, String brokerCompany,
                                           UserPreferences prefs, List<TruckLocation> trucks, int followUpNum) {
        StringBuilder sb = new StringBuilder();
        sb.append(htmlHeader("Following Up — " + prefs.getCompanyName()));
        sb.append("<h2 style='color:#1a3c5e;'>Hi ").append(brokerName.isBlank() ? "there" : brokerName).append(",</h2>");

        if (followUpNum == 1) {
            sb.append("<p>I wanted to follow up on my previous introduction. <strong>").append(prefs.getCompanyName())
              .append("</strong> is still available and actively looking for loads.</p>");
        } else {
            sb.append("<p>Checking in again on behalf of <strong>").append(prefs.getCompanyName())
              .append("</strong>. We have trucks ready to roll and would love to move some freight for you.</p>");
        }

        sb.append("<p>Here's our current truck availability:</p>");
        sb.append(buildTruckTable(trucks));

        sb.append("<p>We're flexible on lanes and ready to discuss rates that work for both sides. ");
        sb.append("Please give us a call or reply to this email — we'd love to build a long-term relationship.</p>");
        sb.append("<p><strong>").append(prefs.getOwnerName()).append("</strong><br>");
        if (!prefs.getCompanyPhone().isBlank()) sb.append("📞 ").append(prefs.getCompanyPhone()).append("<br>");
        if (!prefs.getCompanyEmail().isBlank()) sb.append("✉ <a href='mailto:").append(prefs.getCompanyEmail()).append("'>").append(prefs.getCompanyEmail()).append("</a>");
        sb.append("</p>");
        sb.append(htmlFooter(prefs));
        return sb.toString();
    }

    private String buildAvailabilityHtml(String brokerName, UserPreferences prefs, List<TruckLocation> trucks) {
        StringBuilder sb = new StringBuilder();
        sb.append(htmlHeader("Trucks Available Now — " + prefs.getCompanyName()));
        sb.append("<h2 style='color:#1a3c5e;'>Hi ").append(brokerName.isBlank() ? "there" : brokerName).append(",</h2>");
        sb.append("<p>Just a quick heads up — <strong>").append(prefs.getCompanyName())
          .append("</strong> has trucks available right now and ready to load.</p>");
        sb.append(buildTruckTable(trucks));
        sb.append("<p>Call us now to lock in a load before these trucks are gone!</p>");
        sb.append("<p><strong>").append(prefs.getOwnerName()).append("</strong><br>");
        if (!prefs.getCompanyPhone().isBlank()) sb.append("📞 ").append(prefs.getCompanyPhone()).append("<br>");
        if (!prefs.getCompanyEmail().isBlank()) sb.append("✉ <a href='mailto:").append(prefs.getCompanyEmail()).append("'>").append(prefs.getCompanyEmail()).append("</a>");
        sb.append("</p>");
        sb.append(htmlFooter(prefs));
        return sb.toString();
    }

    private String buildTruckTable(List<TruckLocation> trucks) {
        if (trucks == null || trucks.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        sb.append("<h3 style='color:#1a3c5e;'>Available Trucks</h3>");
        sb.append("<table style='width:100%;border-collapse:collapse;'>");
        sb.append("<thead><tr style='background:#1a3c5e;color:#fff;'>");
        sb.append("<th style='padding:8px;'>Truck</th><th style='padding:8px;'>Driver</th>");
        sb.append("<th style='padding:8px;'>Current Location</th><th style='padding:8px;'>Equipment</th>");
        sb.append("<th style='padding:8px;'>Available</th><th style='padding:8px;'>Status</th>");
        sb.append("</tr></thead><tbody>");
        for (int i = 0; i < trucks.size(); i++) {
            TruckLocation t = trucks.get(i);
            String bg = i % 2 == 0 ? "#f9f9f9" : "#fff";
            sb.append("<tr style='background:").append(bg).append(";border-bottom:1px solid #e0e0e0;'>");
            sb.append("<td style='padding:8px;'>").append(t.getTruckNumber()).append("</td>");
            sb.append("<td style='padding:8px;'>").append(t.getDriverName() == null ? "—" : t.getDriverName()).append("</td>");
            sb.append("<td style='padding:8px;'>").append(t.getCurrentCity()).append(", ").append(t.getCurrentState()).append("</td>");
            sb.append("<td style='padding:8px;'>").append(formatEquipment(t.getEquipmentType())).append("</td>");
            sb.append("<td style='padding:8px;'>").append(t.getAvailableDate() == null ? "Now" : FMT.format(t.getAvailableDate())).append("</td>");
            sb.append("<td style='padding:8px;font-weight:bold;color:").append("AVAILABLE".equals(t.getStatus()) ? "#1a7a1a" : "#c0392b").append(";'>")
              .append(t.getStatus()).append("</td>");
            sb.append("</tr>");
        }
        sb.append("</tbody></table>");
        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HTML Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String htmlHeader(String title) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>" + title + "</title></head>" +
               "<body style='font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#333;'>" +
               "<div style='background:#1a3c5e;padding:20px;border-radius:8px 8px 0 0;margin-bottom:20px;'>" +
               "<h1 style='color:#fff;margin:0;font-size:24px;'>🚛 Trucking.Time</h1>" +
               "<p style='color:#a8c4e0;margin:4px 0 0 0;font-size:13px;'>Smarter loads. More miles. Your time back.</p>" +
               "</div>";
    }

    private String htmlFooter(UserPreferences prefs) {
        return "<hr style='border:none;border-top:1px solid #e0e0e0;margin:24px 0;'>" +
               "<p style='font-size:12px;color:#999;'>This message was sent by Trucking.Time on behalf of " +
               (prefs.getCompanyName().isBlank() ? "your account" : prefs.getCompanyName()) +
               ". To manage your notification settings, log into your Trucking.Time dashboard.</p>" +
               "</body></html>";
    }

    private String formatEquipment(String type) {
        if (type == null) return "—";
        return switch (type) {
            case "BOX_TRUCK_26" -> "26' Box Truck";
            case "DRY_VAN" -> "Dry Van";
            case "REEFER" -> "Refrigerated";
            case "FLATBED" -> "Flatbed";
            case "STEP_DECK" -> "Step Deck";
            default -> type;
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Core Send (SendGrid v3 API)
    // ─────────────────────────────────────────────────────────────────────────

    public boolean send(String toEmail, String toName, String subject, String htmlBody) {
        System.out.println("[EMAIL] → " + toEmail + " | Subject: " + subject);

        if (apiKey == null || apiKey.isBlank()) {
            System.out.println("[EMAIL] DEV MODE — not actually sending (configure SENDGRID_API_KEY)");
            System.out.println("[EMAIL] Body preview (first 300 chars): " + htmlBody.substring(0, Math.min(300, htmlBody.length())));
            return true;
        }

        try {
            String json = buildSendGridJson(toEmail, toName, subject, htmlBody);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.sendgrid.com/v3/mail/send"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            boolean ok = resp.statusCode() == 202;
            System.out.println("[EMAIL] SendGrid response: " + resp.statusCode() + (ok ? " OK" : " ERROR: " + resp.body()));
            return ok;

        } catch (Exception e) {
            System.out.println("[EMAIL] ERROR sending to " + toEmail + ": " + e.getMessage());
            return false;
        }
    }

    private String buildSendGridJson(String toEmail, String toName, String subject, String htmlBody) {
        String safeName = toName.replace("\"", "'");
        String safeFromName = fromName.replace("\"", "'");
        String safeSubject = subject.replace("\"", "'");
        String escapedHtml = htmlBody.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "");
        return "{" +
               "\"personalizations\":[{\"to\":[{\"email\":\"" + toEmail + "\",\"name\":\"" + safeName + "\"}]}]," +
               "\"from\":{\"email\":\"" + fromEmail + "\",\"name\":\"" + safeFromName + "\"}," +
               "\"subject\":\"" + safeSubject + "\"," +
               "\"content\":[{\"type\":\"text/html\",\"value\":\"" + escapedHtml + "\"}]" +
               "}";
    }
}
