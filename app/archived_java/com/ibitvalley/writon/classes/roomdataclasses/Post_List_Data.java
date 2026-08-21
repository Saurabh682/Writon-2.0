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
import java.util.Objects;

@Entity(tableName = "BlogList", indices = {@Index(value = {"blogId"},
        unique = true)})
public class Post_List_Data implements Serializable, Parcelable
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
    @SerializedName("Title")
    @Expose
    private String title;
    @SerializedName("Category")
    @Expose
    private String category;
    @SerializedName("SubCat")
    @Expose
    private String subCat;
    @SerializedName("LongDescription")
    @Expose
    private String longDescription;
    @SerializedName("ShortDescription")
    @Expose
    private String shortDescription;
    @SerializedName("CreationDate")
    @Expose
    private String creationDate;
    @SerializedName("Language")
    @Expose
    private String language;
    @SerializedName("BlogId")
    @Expose
    private String blogId;
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
    @SerializedName("is_rated")
    @Expose
    private Boolean isRated;
    @SerializedName("is_bookmarked")
    @Expose
    private Boolean isBookmarked;
    @SerializedName("is_followed")
    @Expose
    private Boolean isFollowed;
    @SerializedName("BookMarkedCount")
    @Expose
    private Integer bookMarkedCount;
//    @SerializedName("BookMarkedCount")
//    @Expose
//    private Integer bookMarkedCount;

    @Ignore

    public void Post_List_Data1(Objects objects) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.category = category;
        this.subCat = subCat;
        this.longDescription = longDescription;
        this.shortDescription = shortDescription;
        this.creationDate = creationDate;
        this.language = language;
        this.blogId = blogId;
        this.userName = userName;
        this.userImage = userImage;
        this.quoteofDay = quoteofDay;
        this.introducation = introducation;
        this.workingOn = workingOn;
        this.userCreationDate = userCreationDate;
        this.updatedAt = updatedAt;
        this.isRated = isRated;
        this.isBookmarked = isBookmarked;
        this.isFollowed = isFollowed;
        this.bookMarkedCount = bookMarkedCount;
        this.viewCount = viewCount;
        this.ratingCount = ratingCount;
        this.commentsCount = commentsCount;
        this.userFollowersCount = userFollowersCount;
        this.userFollowingCount = userFollowingCount;
        this.total = total;
    }

    @SerializedName("view_count")
    @Expose
    private Integer viewCount;
    @SerializedName("rating_count")
    @Expose
    private Integer ratingCount;
    @SerializedName("comments_count")
    @Expose
    private Integer commentsCount;
    @SerializedName("user_followers_count")
    @Expose
    private Integer userFollowersCount;
    @SerializedName("user_following_count")
    @Expose
    private Integer userFollowingCount;
    @SerializedName("total")
    @Expose
    private Integer total;
    public final static Parcelable.Creator<Post_List_Data> CREATOR = new Creator<Post_List_Data>() {


        @SuppressWarnings({
                "unchecked"
        })
        public Post_List_Data createFromParcel(Parcel in) {
            return new Post_List_Data(in);
        }

        public Post_List_Data[] newArray(int size) {
            return (new Post_List_Data[size]);
        }

    }
            ;
    private final static long serialVersionUID = -5922048851166867070L;

    protected Post_List_Data(Parcel in) {
        this.userId = ((String) in.readValue((String.class.getClassLoader())));
        this.title = ((String) in.readValue((String.class.getClassLoader())));
        this.category = ((String) in.readValue((String.class.getClassLoader())));
        this.subCat = ((String) in.readValue((String.class.getClassLoader())));
        this.longDescription = ((String) in.readValue((String.class.getClassLoader())));
        this.shortDescription = ((String) in.readValue((String.class.getClassLoader())));
        this.creationDate = ((String) in.readValue((String.class.getClassLoader())));
        this.language = ((String) in.readValue((String.class.getClassLoader())));
        this.blogId = ((String) in.readValue((String.class.getClassLoader())));
        this.userName = ((String) in.readValue((String.class.getClassLoader())));
        this.userImage = ((String) in.readValue((String.class.getClassLoader())));
        this.quoteofDay = ((String) in.readValue((String.class.getClassLoader())));
        this.introducation = ((String) in.readValue((String.class.getClassLoader())));
        this.workingOn = ((String) in.readValue((String.class.getClassLoader())));
        this.userCreationDate = ((String) in.readValue((String.class.getClassLoader())));
        this.updatedAt = ((String) in.readValue((String.class.getClassLoader())));
        this.isRated = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
        this.isBookmarked = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
        this.isFollowed = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
        this.bookMarkedCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.viewCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.ratingCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.commentsCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.userFollowersCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.userFollowingCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
        this.total = ((Integer) in.readValue((Integer.class.getClassLoader())));
    }

    public Post_List_Data() {
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSubCat() {
        return subCat;
    }

    public void setSubCat(String subCat) {
        this.subCat = subCat;
    }

    public String getLongDescription() {
        return longDescription;
    }

    public void setLongDescription(String longDescription) {
        this.longDescription = longDescription;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getCreationDate() {
        return creationDate;
    }

    public void setCreationDate(String creationDate) {
        this.creationDate = creationDate;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getBlogId() {
        return blogId;
    }

    public void setBlogId(String blogId) {
        this.blogId = blogId;
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

    public Boolean getIsRated() {
        return isRated;
    }

    public void setIsRated(Boolean isRated) {
        this.isRated = isRated;
    }

    public Boolean getIsBookmarked() {
        return isBookmarked;
    }

    public void setIsBookmarked(Boolean isBookmarked) {
        this.isBookmarked = isBookmarked;
    }

    public Boolean getIsFollowed() {
        return isFollowed;
    }

    public void setIsFollowed(Boolean isFollowed) {
        this.isFollowed = isFollowed;
    }

    public Integer getBookMarkedCount() {
        return bookMarkedCount;
    }

    public void setBookMarkedCount(Integer bookMarkedCount) {
        this.bookMarkedCount = bookMarkedCount;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public void setViewCount(Integer viewCount) {
        this.viewCount = viewCount;
    }

    public Integer getRatingCount() {
        return ratingCount;
    }

    public void setRatingCount(Integer ratingCount) {
        this.ratingCount = ratingCount;
    }

    public Integer getCommentsCount() {
        return commentsCount;
    }

    public void setCommentsCount(Integer commentsCount) {
        this.commentsCount = commentsCount;
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

    public Integer getTotal() {
        return total;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }

    public void writeToParcel(Parcel dest, int flags) {
        dest.writeValue(userId);
        dest.writeValue(title);
        dest.writeValue(category);
        dest.writeValue(subCat);
        dest.writeValue(longDescription);
        dest.writeValue(shortDescription);
        dest.writeValue(creationDate);
        dest.writeValue(language);
        dest.writeValue(blogId);
        dest.writeValue(userName);
        dest.writeValue(userImage);
        dest.writeValue(quoteofDay);
        dest.writeValue(introducation);
        dest.writeValue(workingOn);
        dest.writeValue(userCreationDate);
        dest.writeValue(updatedAt);
        dest.writeValue(isRated);
        dest.writeValue(isBookmarked);
        dest.writeValue(isFollowed);
        dest.writeValue(bookMarkedCount);
        dest.writeValue(viewCount);
        dest.writeValue(ratingCount);
        dest.writeValue(commentsCount);
        dest.writeValue(userFollowersCount);
        dest.writeValue(userFollowingCount);
        dest.writeValue(total);
    }

    public int describeContents() {
        return 0;
    }

}