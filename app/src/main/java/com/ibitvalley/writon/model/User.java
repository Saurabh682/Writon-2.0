package com.ibitvalley.writon.model;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

public class User implements Serializable {

    @SerializedName("id")
    @Expose
    private String id;

    @SerializedName("penName")
    @Expose
    private String penName;

    @SerializedName("fullName")
    @Expose
    private String fullName;

    @SerializedName("email")
    @Expose
    private String email;

    @SerializedName("avatarUrl")
    @Expose
    private String avatarUrl;

    @SerializedName("bio")
    @Expose
    private String bio;

    @SerializedName("quoteOfDay")
    @Expose
    private String quoteOfDay;

    @SerializedName("followersCnt")
    @Expose
    private Integer followersCnt;

    @SerializedName("followingCnt")
    @Expose
    private Integer followingCnt;

    @SerializedName("api_access_token")
    @Expose
    private String apiAccessToken;

    private final static long serialVersionUID = 5756265870593921255L;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPenName() {
        return penName;
    }

    public void setPenName(String penName) {
        this.penName = penName;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getQuoteOfDay() {
        return quoteOfDay;
    }

    public void setQuoteOfDay(String quoteOfDay) {
        this.quoteOfDay = quoteOfDay;
    }

    public Integer getFollowersCnt() {
        return followersCnt != null ? followersCnt : 0;
    }

    public void setFollowersCnt(Integer followersCnt) {
        this.followersCnt = followersCnt;
    }

    public Integer getFollowingCnt() {
        return followingCnt != null ? followingCnt : 0;
    }

    public void setFollowingCnt(Integer followingCnt) {
        this.followingCnt = followingCnt;
    }

    public String getAccess_token() {
        return apiAccessToken;
    }

    public void setAccess_token(String apiAccessToken) {
        this.apiAccessToken = apiAccessToken;
    }

    // Compatibility methods for old code
    public String getName() {
        return fullName;
    }

    public String getUsername() {
        return penName;
    }

    public String getuId() {
        return id;
    }

    public String getImage() {
        return avatarUrl;
    }
}
