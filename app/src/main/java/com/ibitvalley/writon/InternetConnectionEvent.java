package com.ibitvalley.writon;

/**
 * Created by tzarea, on 12/06/2018.
 * Copyright © HongLeong Bank.
 */

public class InternetConnectionEvent {
    boolean isConnected;


    public InternetConnectionEvent(boolean isConnected) {
        this.isConnected = isConnected;
    }
    public boolean getIsConnected(){
        return isConnected;
    }

    public void setIsConnected(boolean isConnected) {
        this.isConnected = isConnected;
    }
}
