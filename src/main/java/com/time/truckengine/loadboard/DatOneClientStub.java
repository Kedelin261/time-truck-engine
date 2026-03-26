package com.time.truckengine.loadboard;

import com.time.truckengine.engine.AccountStore;
import com.time.truckengine.model.Load;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;

/**
 * Stub load board client — simulates DAT ONE API responses with realistic data.
 * Replace fetchLoads() with actual DAT API HTTP call when credentials are ready.
 */
@Component
public class DatOneClientStub implements LoadBoardClient {

    private final AccountStore accountStore;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MM/dd/yyyy");

    public DatOneClientStub(AccountStore accountStore) {
        this.accountStore = accountStore;
    }

    @Override
    public List<Load> fetchLoads(String userId) {
        if (accountStore.getDatTokenDecrypted(userId).isEmpty()) {
            return List.of();
        }

        // Simulate varying load availability — new loads appear over time
        int seed = (int) (System.currentTimeMillis() / 30000); // changes every 30s
        Random rng = new Random(seed);

        String today = LocalDate.now().format(DATE_FMT);
        String tomorrow = LocalDate.now().plusDays(1).format(DATE_FMT);
        String dayAfter = LocalDate.now().plusDays(2).format(DATE_FMT);

        return List.of(
                new Load("DAT-1001", "Wilmington", "DE", "Pittsburgh", "PA",
                        18, 350, 980 + rng.nextInt(100), "BOX_TRUCK_26",
                        today, tomorrow, 14500,
                        "James Carter", "Carter Freight LLC",
                        "+13025551001", "jcarter@carterfreight.com", "MC-112233"),

                new Load("DAT-1002", "Newark", "NJ", "Charlotte", "NC",
                        28, 510, 1550 + rng.nextInt(150), "DRY_VAN",
                        today, tomorrow, 42000,
                        "Maria Santos", "Atlantic Brokerage Co",
                        "+12015552002", "msantos@atlanticbkg.com", "MC-445566"),

                new Load("DAT-1003", "Philadelphia", "PA", "Columbus", "OH",
                        22, 465, 1200 + rng.nextInt(120), "DRY_VAN",
                        today, dayAfter, 38000,
                        "Derek Williams", "Mid-Atlantic Logistics",
                        "+12155553003", "dwilliams@mal.com", "MC-778899"),

                new Load("DAT-1004", "Baltimore", "MD", "Atlanta", "GA",
                        35, 695, 2100 + rng.nextInt(200), "REEFER",
                        today, dayAfter, 22000,
                        "Linda Chen", "Southeast Carriers Inc",
                        "+14435554004", "lchen@secarriers.com", "MC-334455"),

                new Load("DAT-1005", "Trenton", "NJ", "Richmond", "VA",
                        30, 290, 820 + rng.nextInt(80), "BOX_TRUCK_26",
                        today, today, 16000,
                        "Robert Mills", "Express Freight Solutions",
                        "+16095555005", "rmills@expressfreight.com", "MC-667788"),

                new Load("DAT-1006", "Dover", "DE", "Cincinnati", "OH",
                        12, 520, 1480 + rng.nextInt(140), "DRY_VAN",
                        today, tomorrow, 41000,
                        "Angela Brooks", "Eastern Transport Group",
                        "+13025556006", "abrooks@etgroup.com", "MC-990011"),

                new Load("DAT-1007", "Allentown", "PA", "Nashville", "TN",
                        25, 780, 2350 + rng.nextInt(250), "FLATBED",
                        tomorrow, dayAfter, 48000,
                        "Steve Turner", "Nationwide Logistics LLC",
                        "+16105557007", "sturner@nationwidelogistics.com", "MC-223344"),

                new Load("DAT-1008", "Norristown", "PA", "Detroit", "MI",
                        20, 555, 1650 + rng.nextInt(160), "DRY_VAN",
                        today, tomorrow, 39000,
                        "Christine Park", "Great Lakes Freight",
                        "+16105558008", "cpark@glfreight.com", "MC-556677"),

                new Load("DAT-1009", "Wilmington", "DE", "Boston", "MA",
                        15, 310, 950 + rng.nextInt(90), "BOX_TRUCK_26",
                        today, today, 12000,
                        "Tony Reeves", "Northeast Dispatch Hub",
                        "+13025559009", "treeves@nedispatch.com", "MC-889900"),

                new Load("DAT-1010", "Camden", "NJ", "Chicago", "IL",
                        40, 755, 2250 + rng.nextInt(225), "DRY_VAN",
                        tomorrow, dayAfter, 44000,
                        "Sandra Green", "Central Freight Corp",
                        "+8565550010", "sgreen@centralfreight.com", "MC-112244"),

                new Load("DAT-1011", "Wilmington", "DE", "Memphis", "TN",
                        20, 910, 2750 + rng.nextInt(275), "REEFER",
                        tomorrow, dayAfter, 25000,
                        "Kevin Hall", "Southern Lanes LLC",
                        "+13025551011", "khall@southernlanes.com", "MC-334466"),

                new Load("DAT-1012", "Baltimore", "MD", "Louisville", "KY",
                        33, 620, 1850 + rng.nextInt(185), "DRY_VAN",
                        today, tomorrow, 40000,
                        "Patricia Moore", "Chesapeake Freight Group",
                        "+14435552012", "pmoore@cbfgroup.com", "MC-556688"),

                new Load("DAT-1013", "Philadelphia", "PA", "Dallas", "TX",
                        22, 1450, 4350 + rng.nextInt(400), "FLATBED",
                        tomorrow, dayAfter, 52000,
                        "Marcus Johnson", "Lone Star Brokerage",
                        "+12155553013", "mjohnson@lonestarbkg.com", "MC-778810"),

                new Load("DAT-1014", "Wilmington", "DE", "Miami", "FL",
                        18, 1150, 3500 + rng.nextInt(350), "REEFER",
                        tomorrow, dayAfter, 21000,
                        "Rachel Adams", "Florida Freight Exchange",
                        "+13025554014", "radams@ffreight.com", "MC-990022"),

                new Load("DAT-1015", "Cherry Hill", "NJ", "Cleveland", "OH",
                        28, 420, 1150 + rng.nextInt(115), "BOX_TRUCK_26",
                        today, tomorrow, 15000,
                        "Gary Thompson", "Tristate Logistics Partners",
                        "+8565555015", "gthompson@tristate.com", "MC-112255"),

                new Load("DAT-1016", "Wilmington", "DE", "Indianapolis", "IN",
                        15, 680, 2050 + rng.nextInt(200), "DRY_VAN",
                        today, dayAfter, 43000,
                        "Beverly Clark", "Indy Freight Solutions",
                        "+13025556016", "bclark@indyfreight.com", "MC-334477"),

                new Load("DAT-1017", "Baltimore", "MD", "St. Louis", "MO",
                        38, 835, 2500 + rng.nextInt(250), "DRY_VAN",
                        tomorrow, dayAfter, 45000,
                        "Frank Rivera", "Midwest Cargo Direct",
                        "+14435557017", "frivera@mwcargo.com", "MC-556699"),

                new Load("DAT-1018", "Trenton", "NJ", "Kansas City", "KS",
                        33, 1100, 3300 + rng.nextInt(330), "DRY_VAN",
                        tomorrow, dayAfter, 47000,
                        "Alice Morgan", "Plains Freight Alliance",
                        "+16095558018", "amorgan@plainsfreight.com", "MC-778811"),

                new Load("DAT-1019", "Philadelphia", "PA", "Minneapolis", "MN",
                        22, 1100, 3300 + rng.nextInt(320), "REEFER",
                        tomorrow, dayAfter, 24000,
                        "Jerome Walker", "Twin Cities Transport",
                        "+12155559019", "jwalker@tcttransport.com", "MC-990033"),

                new Load("DAT-1020", "Wilmington", "DE", "Portland", "OR",
                        15, 2850, 8550 + rng.nextInt(800), "FLATBED",
                        dayAfter, dayAfter, 55000,
                        "Donna White", "West Coast Brokers Inc",
                        "+13025550020", "dwhite@wcbrokers.com", "MC-112266")
        );
    }
}
