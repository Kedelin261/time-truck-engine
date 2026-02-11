package com.time.truckengine.loadboard;

import com.time.truckengine.model.Load;

import java.util.List;

public interface LoadBoardClient {

    List<Load> fetchLoads(String userId);
}
