package com.time.truckengine.api;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * SPA fallback — forward all non-API, non-asset routes to index.html
 * so React Router can handle client-side navigation.
 */
@Controller
public class SpaController {

    @RequestMapping(value = {
            "/dashboard", "/loads", "/trucks", "/brokers",
            "/notifications", "/history", "/preferences"
    })
    public String spa() {
        return "forward:/index.html";
    }
}
