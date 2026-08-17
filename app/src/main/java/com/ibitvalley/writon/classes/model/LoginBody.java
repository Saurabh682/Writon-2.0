package com.ibitvalley.writon.classes.model;

import com.google.gson.annotations.SerializedName;

public class LoginBody {
    @SerializedName("identifier")
    private String identifier;
    
    @SerializedName("password")
    private String password;

    public LoginBody(String identifier, String password) {
        this.identifier = identifier;
        this.password = password;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
