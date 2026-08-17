package com.ibitvalley.writon.model;

import java.io.Serializable;

/**
 * Created by on 30-09-2016.
 */

public class Blog implements Serializable {
    private String Category;
    private String Title;
    private String ShortDescription;
    private String LongDescription;
    private String CreateBy;
    private String BlogId;
    private String UserID;
    private String CommentCount;
    private String BookMarkedCount;
    private String Rating;
    private int AvatorCode;
    private String Language;
    private String SubCat;
    private String user_name;
    private String view_count;
    private String comments_count;
    private String votes_count;
    private String user_followers_count;
    private String user_image;
    private String user_id;
    private boolean is_bookmarked;
    private boolean is_followed;
    private boolean is_rated;


    public boolean isIs_followed() {
        return is_followed;
    }

    public void setIs_followed(boolean is_followed) {
        this.is_followed = is_followed;
    }

    public boolean isIs_rated() {
        return is_rated;
    }

    public void setIs_rated(boolean is_rated) {
        this.is_rated = is_rated;
    }





    public String getUser_id() {
        return user_id;
    }

    public void setUser_id(String user_id) {
        this.user_id = user_id;
    }

    public String getUser_followers_count() {
        return user_followers_count;
    }

    public void setUser_followers_count(String user_followers_count) {
        this.user_followers_count = user_followers_count;
    }

    public String getView_count() {
        return view_count;
    }

    public void setView_count(String view_count) {
        this.view_count = view_count;
    }

    public String getComments_count() {
        return comments_count;
    }

    public void setComments_count(String comments_count) {
        this.comments_count = comments_count;
    }

    public String getVotes_count() {
        return votes_count;
    }

    public void setVotes_count(String votes_count) {
        this.votes_count = votes_count;
    }





    public String getCategory() {
        return Category;
    }

    public void setCategory(String category) {
        Category = category;
    }

    public String getTitle() {
        return Title;
    }

    public void setTitle(String title) {
        Title = title;
    }

    public String getShortDescription() {
        return ShortDescription;
    }

    public void setShortDescription(String shortDescription) {
        ShortDescription = shortDescription;
    }

    public String getLongDescripton() {
        return LongDescription;
    }

    public void setLongDescripton(String longDescripton) {
        LongDescription = longDescripton;
    }

    public String getCreateBy() {
        return CreateBy;
    }

    public void setCreateBy(String createBy) {
        CreateBy = createBy;
    }

    public String getBlogId() {
        return BlogId;
    }

    public void setBlogId(String blogId) {
        BlogId = blogId;
    }

    public boolean isBookMark() {
        return is_bookmarked;
    }

    public void setBookMark(boolean bookMark) {
        is_bookmarked = bookMark;
    }

    public String getUserID() {
        return UserID;
    }

    public void setUserID(String userID) {
        UserID = userID;
    }

    public String getCommentCount() {
        return CommentCount;
    }

    public void setCommentCount(String comments_count) {
        CommentCount = comments_count;
    }

    public String getBookMarkedCount() {
        return BookMarkedCount;
    }

    public void setBookMarkedCount(String bookMarkedCount) {
        BookMarkedCount = bookMarkedCount;
    }

    public String getRating() {
        return Rating;
    }

    public void setRating(String rating) {
        Rating = rating;
    }

    public int getAvatorCode() {
        return AvatorCode;
    }

    public void setAvatorCode(int avatorCode) {
        AvatorCode = avatorCode;
    }

    public String getLanguage() {
        return Language;
    }

    public void setLanguage(String language) {
        Language = language;
    }

    public String getSubCat() {
        return SubCat;
    }

    public void setSubCat(String subCat) {
        SubCat = subCat;
    }

    public String getUser_name() {
        return user_name;
    }

    public void setUser_name(String user_name) {
        this.user_name = user_name;
    }


    public String getUser_image() {
        return user_image;
    }

    public void setUser_image(String user_image) {
        this.user_image = user_image;
    }


}
