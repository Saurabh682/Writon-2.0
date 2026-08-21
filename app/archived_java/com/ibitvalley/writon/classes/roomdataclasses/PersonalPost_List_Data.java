package com.ibitvalley.writon.classes.roomdataclasses;



import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.PrimaryKey;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

@Entity(tableName = "personalPostList", indices = {@Index(value = {"blogId"},
        unique = true)})
public class PersonalPost_List_Data  implements Serializable
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
    @SerializedName("is_rated")
    @Expose
    private Boolean isRated;
    @SerializedName("is_bookmarked")
    @Expose
    private Boolean isBookmarked;
    @SerializedName("BookMarkedCount")
    @Expose
    private Integer bookMarkedCount;
    @SerializedName("view_count")
    @Expose
    private Integer viewCount;
    @SerializedName("rating_count")
    @Expose
    private Integer ratingCount;
    @SerializedName("comments_count")
    @Expose
    private Integer commentsCount;

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
    @SerializedName("is_followed")
    @Expose
    private Boolean isFollowed;
    @SerializedName("user_followers_count")
    @Expose
    private Integer userFollowersCount;
    @SerializedName("user_following_count")
    @Expose
    private Integer userFollowingCount;
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

}

