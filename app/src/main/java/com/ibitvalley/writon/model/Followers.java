package com.ibitvalley.writon.model;

import java.io.Serializable;

public class Followers implements Serializable{

    private String user_name;
    private String username;
    private String user_followers_count;
    private String User_ID;

    private String user_image;

    public String getUser_image() {
        return user_image;
    }

    public void setUser_image(String user_image) {
        this.user_image = user_image;
    }

    private boolean is_followed;

    public String getUser_name() {
        return user_name;
    }

    public void setUser_name(String user_name) {
        this.user_name = user_name;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUser_followers_count() {
        return user_followers_count;
    }

    public void setUser_followers_count(String user_followers_count) {
        this.user_followers_count = user_followers_count;
    }

    public String getUser_id() {
        return User_ID;
    }

    public void setUser_id(String user_id) {
        this.User_ID = user_id;
    }

    public boolean isIs_followed() {
        return is_followed;
    }

    public void setIs_followed(boolean is_followed) {
        this.is_followed = is_followed;
    }


}
