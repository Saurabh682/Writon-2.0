package com.ibitvalley.writon.classes.roomdataclasses;

import android.os.Parcel;
import android.os.Parcelable;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.Ignore;
import androidx.room.Index;
import androidx.room.PrimaryKey;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

@Entity(tableName = "UserList", indices = {@Index(value = {"userId"},
        unique = true)})
public class User_List_Data implements Serializable, Parcelable
{
    @PrimaryKey(autoGenerate = true)
    @NonNull
    private long id;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }


    @SerializedName("user_id")
    @Expose
    private String userId;
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
    @SerializedName("CreationDate")
    @Expose
    private String creationDate;
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
    public final static Parcelable.Creator<User_List_Data> CREATOR = new Creator<User_List_Data>() {


        @SuppressWarnings({
                "unchecked"
        })
        @Ignore
        public User_List_Data createFromParcel(Parcel in) {
            return new User_List_Data(in);
        }

        public User_List_Data[] newArray(int size) {
            return (new User_List_Data[size]);
        }

    }
            ;
    private final static long serialVersionUID = -9116079008388859246L;
    @Ignore
    protected User_List_Data(Parcel in) {
        this.userId = ((String) in.readValue((String.class.getClassLoader())));
        this.userName = ((String) in.readValue((String.class.getClassLoader())));
        this.userImage = ((String) in.readValue((String.class.getClassLoader())));
        this.quoteofDay = ((String) in.readValue((String.class.getClassLoader())));
        this.introducation = ((String) in.readValue((String.class.getClassLoader())));
        this.workingOn = ((String) in.readValue((String.class.getClassLoader())));
        this.creationDate = ((String) in.readValue((String.class.getClassLoader())));
        this.updatedAt = ((String) in.readValue((String.class.getClassLoader())));
        this.isFollowed = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
        this.userFollowersCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.userFollowingCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
    }
    @Ignore
    public User_List_Data() {
    }

    public User_List_Data(long id, String userId, String userName, String userImage, String quoteofDay, String introducation, String workingOn, String creationDate, String updatedAt, Boolean isFollowed, Integer userFollowersCount, Integer userFollowingCount) {
        super();
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.userImage = userImage;
        this.quoteofDay = quoteofDay;
        this.introducation = introducation;
        this.workingOn = workingOn;
        this.creationDate = creationDate;
        this.updatedAt = updatedAt;
        this.isFollowed = isFollowed;
        this.userFollowersCount = userFollowersCount;
        this.userFollowingCount = userFollowingCount;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
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

    public String getCreationDate() {
        return creationDate;
    }

    public void setCreationDate(String creationDate) {
        this.creationDate = creationDate;
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
        dest.writeValue(userId);
        dest.writeValue(userName);
        dest.writeValue(userImage);
        dest.writeValue(quoteofDay);
        dest.writeValue(introducation);
        dest.writeValue(workingOn);
        dest.writeValue(creationDate);
        dest.writeValue(updatedAt);
        dest.writeValue(isFollowed);
        dest.writeValue(userFollowersCount);
        dest.writeValue(userFollowingCount);
    }

    public int describeContents() {
        return 0;
    }

}



