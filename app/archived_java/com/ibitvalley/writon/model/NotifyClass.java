package com.ibitvalley.writon.model;

import java.io.Serializable;

/**
 * Created by kushwaha on 06-Dec-16.
 */

public class NotifyClass implements Serializable {

    private String UserID;
    private String BlogID;
    private String Message;
    private String EntryDate;
    private int AvatorCode;

    public String getUserID() {
        return UserID;
    }

    public void setUserID(String userID) {
        UserID = userID;
    }

    public String getBlogID() {
        return BlogID;
    }

    public void setBlogID(String blogID) {
        BlogID = blogID;
    }

    public String getMessage() {
        return Message;
    }

    public void setMessage(String message) {
        Message = message;
    }

    public String getCreatedDate() {
        return EntryDate;
    }

    public void setCreatedDate(String createdDate) {
        EntryDate = createdDate;
    }

    public int getAvatorCode() {
        return AvatorCode;
    }

    public void setAvatorCode(int avatorCode) {
        AvatorCode = avatorCode;
    }
}
