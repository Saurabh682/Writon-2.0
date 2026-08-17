package com.ibitvalley.writon.classes.model;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.model.User;

public class SignupResponse {

    @SerializedName("message")
    @Expose
    private String message;

    @SerializedName("token")
    @Expose
    private String token;

    @SerializedName("user")
    @Expose
    private User user;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    // Compatibility methods
    public int getSuccess() {
        return (user != null || token != null) ? 1 : 0;
    }

    public User getData() {
        return user;
    }
}
