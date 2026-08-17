package com.ibitvalley.writon.model;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

public class followData implements Serializable, Parcelable
{

    @SerializedName("User_ID")
    @Expose
    private String userID;
    @SerializedName("user_name")
    @Expose
    private String userName;
    @SerializedName("user_image")
    @Expose
    private String userImage;
    @SerializedName("Fid")
    @Expose
    private String fid;
    @SerializedName("is_followed")
    @Expose
    private Boolean isFollowed;
    @SerializedName("user_followers_count")
    @Expose
    private Integer userFollowersCount;
    public final static Parcelable.Creator<followData> CREATOR = new Creator<followData>() {


        @SuppressWarnings({
                "unchecked"
        })
        public followData createFromParcel(Parcel in) {
            return new followData(in);
        }

        public followData[] newArray(int size) {
            return (new followData[size]);
        }

    }
            ;
    private final static long serialVersionUID = -7440873003603053338L;

    protected followData(Parcel in) {
        this.userID = ((String) in.readValue((String.class.getClassLoader())));
        this.userName = ((String) in.readValue((String.class.getClassLoader())));
        this.userImage = ((String) in.readValue((String.class.getClassLoader())));
        this.fid = ((String) in.readValue((String.class.getClassLoader())));
        this.isFollowed = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
        this.userFollowersCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
    }

    public followData() {
    }

    public String getUserID() {
        return userID;
    }

    public void setUserID(String userID) {
        this.userID = userID;
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

    public String getFid() {
        return fid;
    }

    public void setFid(String fid) {
        this.fid = fid;
    }

    public Boolean getIsFollowed() {
        return isFollowed;
    }

    public void setIsFollowed(Boolean isFollowed) {
        this.isFollowed = isFollowed;
    }

    public Integer getUserFollowersCount() {
        return userFollowersCount;
    }

    public void setUserFollowersCount(Integer userFollowersCount) {
        this.userFollowersCount = userFollowersCount;
    }

    public void writeToParcel(Parcel dest, int flags) {
        dest.writeValue(userID);
        dest.writeValue(userName);
        dest.writeValue(userImage);
        dest.writeValue(fid);
        dest.writeValue(isFollowed);
        dest.writeValue(userFollowersCount);
    }

    public int describeContents() {
        return 0;
    }

}
