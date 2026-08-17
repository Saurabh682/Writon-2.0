package com.ibitvalley.writon.classes.roomdataclasses;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

public class UserDetail implements Serializable, Parcelable
{

    @SerializedName("id")
    @Expose
    private String id;
    @SerializedName("user_name")
    @Expose
    private String userName;
    @SerializedName("user_image")
    @Expose
    private String userImage;
    @SerializedName("QuoteofDay")
    @Expose
    private Object quoteofDay;
    @SerializedName("Introducation")
    @Expose
    private Object introducation;
    @SerializedName("WorkingOn")
    @Expose
    private Object workingOn;
    @SerializedName("UserCreationDate")
    @Expose
    private Object userCreationDate;
    @SerializedName("updated_at")
    @Expose
    private String updatedAt;
    @SerializedName("is_followed")
    @Expose
    private Boolean isFollowed;
    @SerializedName("user_followers_count")
    @Expose
    private Integer userFollowersCount;
    @SerializedName("user_following_count")
    @Expose
    private Integer userFollowingCount;
    public final static Parcelable.Creator<UserDetail> CREATOR = new Creator<UserDetail>() {


        @SuppressWarnings({
                "unchecked"
        })
        public UserDetail createFromParcel(Parcel in) {
            return new UserDetail(in);
        }

        public UserDetail[] newArray(int size) {
            return (new UserDetail[size]);
        }

    }
            ;
    private final static long serialVersionUID = -8417700302947578919L;

    protected UserDetail(Parcel in) {
        this.id = ((String) in.readValue((String.class.getClassLoader())));
        this.userName = ((String) in.readValue((String.class.getClassLoader())));
        this.userImage = ((String) in.readValue((String.class.getClassLoader())));
        this.quoteofDay = ((Object) in.readValue((Object.class.getClassLoader())));
        this.introducation = ((Object) in.readValue((Object.class.getClassLoader())));
        this.workingOn = ((Object) in.readValue((Object.class.getClassLoader())));
        this.userCreationDate = ((Object) in.readValue((Object.class.getClassLoader())));
        this.updatedAt = ((String) in.readValue((String.class.getClassLoader())));
        this.isFollowed = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
        this.userFollowersCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.userFollowingCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
    }

    public UserDetail() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public Object getQuoteofDay() {
        return quoteofDay;
    }

    public void setQuoteofDay(Object quoteofDay) {
        this.quoteofDay = quoteofDay;
    }

    public Object getIntroducation() {
        return introducation;
    }

    public void setIntroducation(Object introducation) {
        this.introducation = introducation;
    }

    public Object getWorkingOn() {
        return workingOn;
    }

    public void setWorkingOn(Object workingOn) {
        this.workingOn = workingOn;
    }

    public Object getUserCreationDate() {
        return userCreationDate;
    }

    public void setUserCreationDate(Object userCreationDate) {
        this.userCreationDate = userCreationDate;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
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

    public Integer getUserFollowingCount() {
        return userFollowingCount;
    }

    public void setUserFollowingCount(Integer userFollowingCount) {
        this.userFollowingCount = userFollowingCount;
    }

    public void writeToParcel(Parcel dest, int flags) {
        dest.writeValue(id);
        dest.writeValue(userName);
        dest.writeValue(userImage);
        dest.writeValue(quoteofDay);
        dest.writeValue(introducation);
        dest.writeValue(workingOn);
        dest.writeValue(userCreationDate);
        dest.writeValue(updatedAt);
        dest.writeValue(isFollowed);
        dest.writeValue(userFollowersCount);
        dest.writeValue(userFollowingCount);
    }

    public int describeContents() {
        return 0;
    }

}