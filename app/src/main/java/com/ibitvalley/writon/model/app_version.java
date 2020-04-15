package com.ibitvalley.writon.model;

import java.io.Serializable;

public class app_version implements Serializable {

    private int Current_Version;
    private int Older_Version;

    public int getCurrent_Version() {
        return Current_Version;
    }

    public int getOlder_Version() {
        return Older_Version;
    }



}
