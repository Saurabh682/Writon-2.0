package com.ibitvalley.writon.model;

/**
 * Created by Sahil Bharti on 14-10-2016.
 */

public class BlogComment {
    private String Id;
    private String Comment;

    public void setUsername(String username) {
        this.username = username;
    }

    private String username;

    public String getTitle() {
        return Title;
    }

    public void setTitle(String title) {
        Title = title;
    }

    private String Title;
    private String CreationDate;
    private String UserId;
    private String name;

    public String getBlogId() {
        return BlogId;
    }

    public void setBlogId(String blogId) {
        BlogId = blogId;
    }

    private String BlogId;



    public String getComment() {
        return Comment;
    }

    public void setComment(String comment) {
        Comment = comment;
    }

    public String getUserName() {
        return username;
    }

    public void setUserName(String userName) {
        username = userName;
    }



    public String getDateTime() {
        return CreationDate;
    }

    public void setDateTime(String dateTime) {
        CreationDate = dateTime;
    }

    public String getUserId() {
        return UserId;
    }

    public void setUserId(String userId) {
        UserId = userId;
    }



    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getId() {
        return Id;
    }

    public void setId(String Id) {
        this.Id = Id;
    }
}
