package com.ibitvalley.writon.model;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

public class UserData implements Serializable
{

    @SerializedName("uId")
    @Expose
    private String uId;
    @SerializedName("user_name")
    @Expose
    private String userName;
    @SerializedName("user_image")
    @Expose
    private String userImage;
    @SerializedName("QuoteofDay")
    @Expose
    private String quoteofDay;
    @SerializedName("Introducation")
    @Expose
    private String introducation;
    @SerializedName("WorkingOn")
    @Expose
    private String workingOn;
    @SerializedName("UserCreationDate")
    @Expose
    private String userCreationDate;
    @SerializedName("updated_at")
    @Expose
    private String updatedAt;
    @SerializedName("name")
    @Expose
    private String name;

    @SerializedName("dob")
    @Expose
    private String dob;
    private final static long serialVersionUID = -5210239684652526207L;

    public String getUId() {
        return uId;
    }

    public void setUId(String uId) {
        this.uId = uId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserImage() {
        return userImage;
    }

    public void setUserImage(String userImage) {
        this.userImage = userImage;
    }

    public String getQuoteofDay() {
        return quoteofDay;
    }

    public void setQuoteofDay(String quoteofDay) {
        this.quoteofDay = quoteofDay;
    }

    public String getIntroducation() {
        return introducation;
    }

    public void setIntroducation(String introducation) {
        this.introducation = introducation;
    }

    public String getWorkingOn() {
        return workingOn;
    }

    public void setWorkingOn(String workingOn) {
        this.workingOn = workingOn;
    }

    public String getUserCreationDate() {
        return userCreationDate;
    }

    public void setUserCreationDate(String userCreationDate) {
        this.userCreationDate = userCreationDate;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDob() {
        return dob;
    }

    public void setDob(String dob) {
        this.dob = dob;
    }
}
