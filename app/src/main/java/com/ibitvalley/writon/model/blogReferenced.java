package com.ibitvalley.writon.model;

import java.io.Serializable;

public class blogReferenced implements Serializable {

    private String BlogId;
    private String Category;
    private String SubCat;
    private String Title;
    private String ShortDescription;
    private String LongDescription;
    private String Language;
    private String view_count;
    private String comments_count;
    private String votes_count;
    private String user_id;
    private String user_name;
    private String user_followers_count;
    private boolean is_bookmarked;

    public String getBlogId() {
        return BlogId;
    }

    public void setBlogId(String blogId) {
        BlogId = blogId;
    }

    public String getCategory() {
        return Category;
    }

    public void setCategory(String category) {
        Category = category;
    }

    public String getSubCat() {
        return SubCat;
    }

    public void setSubCat(String subCat) {
        SubCat = subCat;
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

    public String getLongDescription() {
        return LongDescription;
    }

    public void setLongDescription(String longDescription) {
        LongDescription = longDescription;
    }

    public String getLanguage() {
        return Language;
    }

    public void setLanguage(String language) {
        Language = language;
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

    public String getUser_id() {
        return user_id;
    }

    public void setUser_id(String user_id) {
        this.user_id = user_id;
    }

    public String getUser_name() {
        return user_name;
    }

    public void setUser_name(String user_name) {
        this.user_name = user_name;
    }

    public String getUser_followers_count() {
        return user_followers_count;
    }

    public void setUser_followers_count(String user_followers_count) {
        this.user_followers_count = user_followers_count;
    }

    public boolean getIs_bookmarked() {
        return is_bookmarked;
    }

    public void setIs_bookmarked(boolean is_bookmarked) {
        this.is_bookmarked = is_bookmarked;
    }


}
