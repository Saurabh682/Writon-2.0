package com.ibitvalley.writon.model;

import java.io.Serializable;

public class TrendingPost_Model implements Serializable {


    private String Comment;
    private String UserId;
    private String profile_image_url;

    private String user_image;
    private Integer followers_count;
    private boolean is_followed;
    private boolean is_rated;

    private  String user_id;

    private String id;
    private String name;
    private String email;
    private String mobile;
    private String image;
    private String DOB;
    private String Gender;
    private String password;
    private String verified;
    private String remember_token;
    private String IsActive;
    private String IsDeleted;
    private String CreationDate;
    private String user_name;
    private String QuoteofDay;
    private String Introducation;
    private String WorkingOn;
    private String LoginType;
    private String FacebookId;
    private String AvatorCode;
    private String FcmID;
    private String api_access_token;
    private String provider;
    private String provider_id;
    private String provider_avatar;
    private String created_at;
    private String updated_at;
    private String BlogId;
    private String Category;
    private String SubCat;
    private String Title;
    private String ShortDescription;
    private String LongDescription;
    private String CreateBy;
    private String Language;
    private String IsDraft;
    private String Trending;
    private String delete_status;
    private String ID;
    private String BlogID;
    private String UserID;
    private String Rating;
    private String rating;
    private boolean is_bookmarked;

    private String view_count;
    private String comments_count;
    private String votes_count;

    private String user_followers_count;


    private String message;
    private String human_date;
    private blogReferenced blogReferenced;
    private userReferenced userReferenced;
    private userCreated userCreated;


    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    private String username;

    public boolean isIs_followed() {
        return is_followed;
    }

    public void setIs_followed(boolean is_followed) {
        this.is_followed = is_followed;
    }



    public userReferenced getUserReferenced() {
        return userReferenced;
    }

    public void setUserReferenced(userReferenced userReferenced) {
        this.userReferenced = userReferenced;
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


    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getDOB() {
        return DOB;
    }

    public void setDOB(String DOB) {
        this.DOB = DOB;
    }

    public String getGender() {
        return Gender;
    }

    public void setGender(String gender) {
        Gender = gender;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getVerified() {
        return verified;
    }

    public void setVerified(String verified) {
        this.verified = verified;
    }

    public String getRemember_token() {
        return remember_token;
    }

    public void setRemember_token(String remember_token) {
        this.remember_token = remember_token;
    }

    public String getIsActive() {
        return IsActive;
    }

    public void setIsActive(String isActive) {
        IsActive = isActive;
    }

    public String getIsDeleted() {
        return IsDeleted;
    }

    public void setIsDeleted(String isDeleted) {
        IsDeleted = isDeleted;
    }

    public String getCreationDate() {
        return CreationDate;
    }

    public void setCreationDate(String creationDate) {
        CreationDate = creationDate;
    }

    public String getUser_name() {
        return user_name;
    }

    public void setUser_name(String user_name) {
        this.user_name = user_name;
    }

    public String getQuoteofDay() {
        return QuoteofDay;
    }

    public void setQuoteofDay(String quoteofDay) {
        QuoteofDay = quoteofDay;
    }

    public String getIntroducation() {
        return Introducation;
    }

    public void setIntroducation(String introducation) {
        Introducation = introducation;
    }

    public String getWorkingOn() {
        return WorkingOn;
    }

    public void setWorkingOn(String workingOn) {
        WorkingOn = workingOn;
    }

    public String getLoginType() {
        return LoginType;
    }

    public void setLoginType(String loginType) {
        LoginType = loginType;
    }

    public String getFacebookId() {
        return FacebookId;
    }

    public void setFacebookId(String facebookId) {
        FacebookId = facebookId;
    }

    public String getAvatorCode() {
        return AvatorCode;
    }

    public void setAvatorCode(String avatorCode) {
        AvatorCode = avatorCode;
    }

    public String getFcmID() {
        return FcmID;
    }

    public void setFcmID(String fcmID) {
        FcmID = fcmID;
    }

    public String getApi_access_token() {
        return api_access_token;
    }

    public void setApi_access_token(String api_access_token) {
        this.api_access_token = api_access_token;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProvider_id() {
        return provider_id;
    }

    public void setProvider_id(String provider_id) {
        this.provider_id = provider_id;
    }

    public String getProvider_avatar() {
        return provider_avatar;
    }

    public void setProvider_avatar(String provider_avatar) {
        this.provider_avatar = provider_avatar;
    }

    public String getCreated_at() {
        return created_at;
    }

    public void setCreated_at(String created_at) {
        this.created_at = created_at;
    }

    public String getUpdated_at() {
        return updated_at;
    }

    public void setUpdated_at(String updated_at) {
        this.updated_at = updated_at;
    }

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

    public String getCreateBy() {
        return CreateBy;
    }

    public void setCreateBy(String createBy) {
        CreateBy = createBy;
    }

    public String getLanguage() {
        return Language;
    }

    public void setLanguage(String language) {
        Language = language;
    }

    public String getIsDraft() {
        return IsDraft;
    }

    public void setIsDraft(String isDraft) {
        IsDraft = isDraft;
    }

    public String getTrending() {
        return Trending;
    }

    public void setTrending(String trending) {
        Trending = trending;
    }

    public String getDelete_status() {
        return delete_status;
    }

    public void setDelete_status(String delete_status) {
        this.delete_status = delete_status;
    }

    public String getID() {
        return ID;
    }

    public void setID(String ID) {
        this.ID = ID;
    }

    public String getBlogID() {
        return BlogID;
    }

    public void setBlogID(String blogID) {
        BlogID = blogID;
    }

    public String getUserID() {
        return UserID;
    }

    public void setUserID(String userID) {
        UserID = userID;
    }

    public String getRating() {
        return Rating;
    }

    public void setRating(String rating) {
        Rating = rating;
    }


    public boolean isBookMark() {
        return is_bookmarked;
    }

    public void setBookMark(boolean bookMark) {
        is_bookmarked = bookMark;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getHuman_date() {
        return human_date;
    }

    public void setHuman_date(String human_date) {
        this.human_date = human_date;
    }

    public blogReferenced getBlogreferenced() {
        return blogReferenced;
    }

    public void setBlogreferenced(blogReferenced blogreferenced) {
        this.blogReferenced = blogreferenced;
    }

    public String getComment() {
        return Comment;
    }

    public void setComment(String comment) {
        Comment = comment;
    }

    public String getUserId() {
        return UserId;
    }

    public void setUserId(String userId) {
        UserId = userId;
    }

    public String getProfile_image_url() {
        return profile_image_url;
    }

    public void setProfile_image_url(String profile_image_url) {
        this.profile_image_url = profile_image_url;
    }

    public userCreated getUserCreated() {
        return userCreated;
    }

    public void setUserCreated(userCreated userCreated) {
        this.userCreated = userCreated;
    }

    public String getUser_image() {
        return user_image;
    }

    public void setUser_image(String user_image) {
        this.user_image = user_image;
    }

    public Integer getFollowers_count() {
        return followers_count;
    }

    public void setFollowers_count(Integer followers_count) {
        this.followers_count = followers_count;
    }

    public String getUser_id() {
        return user_id;
    }

    public void setUser_id(String user_id) {
        this.user_id = user_id;
    }

    public boolean isIs_rated() {
        return is_rated;
    }

    public void setIs_rated(boolean is_rated) {
        this.is_rated = is_rated;
    }
}
