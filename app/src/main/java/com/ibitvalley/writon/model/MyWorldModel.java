package com.ibitvalley.writon.model;

import android.os.Parcel;
import android.os.Parcelable;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.PrimaryKey;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

@Entity(tableName = "myWorld", indices = {@Index(value = {"id"},
        unique = true)})
public class MyWorldModel implements Comparable<MyWorldModel>, Serializable, Parcelable {

    @PrimaryKey
    @SerializedName("id")
    @Expose
    @NonNull
    private String id;
    @SerializedName("Blog_id")
    @Expose
    private String blogId;
    @SerializedName("Action")
    @Expose
    private String action;
    @SerializedName("Notify_Status")
    @Expose
    private String notifyStatus;
    @SerializedName("User_id")
    @Expose
    private String userId;
    @SerializedName("OtherUser_id")
    @Expose
    private String otherUserId;
    @SerializedName("RelatedUser_id")
    @Expose
    private String relatedUserId;
    @SerializedName("Updated_at")
    @Expose
    private String updatedAt;
    @SerializedName("Title")
    @Expose
    private String title;
    @SerializedName("otherUser_name")
    @Expose
    private String otherUserName;
    @SerializedName("otherUser_image")
    @Expose
    private String otherUserImage;
    @SerializedName("user_name")
    @Expose
    private String userName;
    @SerializedName("user_image")
    @Expose
    private String userImage;

    @SerializedName("is_followed")
    @Expose
    private boolean isFollowed;

    @SerializedName("is_rated")
    @Expose
    private boolean isRated;

    @SerializedName("is_bookmarked")
    @Expose
    private boolean isBookmarked;

    public MyWorldModel(String id , String blogId , String action , String notifyStatus , String userId , String otherUserId , String relatedUserId , String updatedAt , String title , String otherUserName , String otherUserImage , String userName , String userImage , boolean isFollowed , boolean isRated , boolean isBookmarked) {
        this.id = id;
        this.blogId = blogId;
        this.action = action;
        this.notifyStatus = notifyStatus;
        this.userId = userId;
        this.otherUserId = otherUserId;
        this.relatedUserId = relatedUserId;
        this.updatedAt = updatedAt;
        this.title = title;
        this.otherUserName = otherUserName;
        this.otherUserImage = otherUserImage;
        this.userName = userName;
        this.userImage = userImage;
        this.isFollowed = isFollowed;
        this.isRated = isRated;
        this.isBookmarked = isBookmarked;
    }

    protected MyWorldModel(Parcel in) {
        id = in.readString();
        blogId = in.readString();
        action = in.readString();
        notifyStatus = in.readString();
        userId = in.readString();
        otherUserId = in.readString();
        relatedUserId = in.readString();
        updatedAt = in.readString();
        title = in.readString();
        otherUserName = in.readString();
        otherUserImage = in.readString();
        userName = in.readString();
        userImage = in.readString();
        isFollowed = in.readByte() != 0;
        isRated = in.readByte() != 0;
        isBookmarked = in.readByte() != 0;
    }

    public static final Creator<MyWorldModel> CREATOR = new Creator<MyWorldModel>() {
        @Override
        public MyWorldModel createFromParcel(Parcel in) {
            return new MyWorldModel( in );
        }

        @Override
        public MyWorldModel[] newArray(int size) {
            return new MyWorldModel[size];
        }
    };

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getBlogId() {
        return blogId;
    }

    public void setBlogId(String blogId) {
        this.blogId = blogId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getNotifyStatus() {
        return notifyStatus;
    }

    public void setNotifyStatus(String notifyStatus) {
        this.notifyStatus = notifyStatus;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getOtherUserId() {
        return otherUserId;
    }

    public void setOtherUserId(String otherUserId) {
        this.otherUserId = otherUserId;
    }

    public String getRelatedUserId() {
        return relatedUserId;
    }

    public void setRelatedUserId(String relatedUserId) {
        this.relatedUserId = relatedUserId;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getOtherUserName() {
        return otherUserName;
    }

    public void setOtherUserName(String otherUserName) {
        this.otherUserName = otherUserName;
    }

    public String getOtherUserImage() {
        return otherUserImage;
    }

    public void setOtherUserImage(String otherUserImage) {
        this.otherUserImage = otherUserImage;
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

    public boolean isFollowed() {
        return isFollowed;
    }

    public void setFollowed(boolean followed) {
        isFollowed = followed;
    }

    public boolean isRated() {
        return isRated;
    }

    public void setRated(boolean rated) {
        isRated = rated;
    }

    public boolean isBookmarked() {
        return isBookmarked;
    }

    public void setBookmarked(boolean bookmarked) {
        isBookmarked = bookmarked;
    }

    @Override
    public int compareTo(MyWorldModel o) {
        return this.updatedAt.compareTo( o.updatedAt );
    }

    @Override
    public int describeContents() {
        return 0;
    }

    @Override
    public void writeToParcel(Parcel dest , int flags) {
        dest.writeString( id );
        dest.writeString( blogId );
        dest.writeString( action );
        dest.writeString( notifyStatus );
        dest.writeString( userId );
        dest.writeString( otherUserId );
        dest.writeString( relatedUserId );
        dest.writeString( updatedAt );
        dest.writeString( title );
        dest.writeString( otherUserName );
        dest.writeString( otherUserImage );
        dest.writeString( userName );
        dest.writeString( userImage );
        dest.writeByte( (byte) (isFollowed ? 1 : 0) );
        dest.writeByte( (byte) (isRated ? 1 : 0) );
        dest.writeByte( (byte) (isBookmarked ? 1 : 0) );
    }
}
