package com.ibitvalley.writon.classes.roomdataclasses;

import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.PrimaryKey;
import androidx.room.TypeConverters;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.dao.DataConverter;

import java.io.Serializable;
import java.util.List;

@Entity(tableName = "OtherUsers", indices = {@Index(value = {"blogId"},
        unique = true)})
public class Other_Users_Room   implements Serializable {
    @PrimaryKey(autoGenerate = true)
    //@NonNull
    private long id;

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
    @SerializedName("Intro")
    @Expose
    private String intro;
    @SerializedName("WorkingOn")
    @Expose
    private String workingOn;
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
    @SerializedName("Language")
    @Expose
    private String language;
    @SerializedName("BlogId")
    @Expose
    private String blogId;
    @SerializedName("CreateBY")
    @Expose
    private String createBY;
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
    @SerializedName("total")
    @Expose
    private Integer total;
    @TypeConverters(DataConverter.class)
    private List<Other_Users_Room> UserList;

    public Other_Users_Room(List<Other_Users_Room> userList) {
        UserList = userList;
    }

    public List<Other_Users_Room> getUserList() {
        return UserList;
    }

    public void setUserList(List<Other_Users_Room> userList) {
        UserList = userList;
    }

    //private Map<String, Object> additionalProperties = new HashMap<String, Object>();


   /* public Other_Users_Room(String user_name, String UserID, int FollowersCount, int FollowingCount,
                            String image, String Quote_of_Day, String Introduction, String Working_On, Long id) {
        this.user_name = user_name;
        this.UserID = UserID;
        this.FollowersCount = FollowersCount;
        this.FollowingCount = FollowingCount;
        this.Image = image;
        this.Quote_of_Day = Quote_of_Day;
        this.Introduction = Introduction;
        this.Working_On = Working_On;
        this.id=id;
    }*/

   /* public Other_Users_Room(ArrayList<Other_Users_Room> ourList){
        int i = ourList.size();
        for
    }*/

   /* public Other_Users_Room(JSONObject jsonObject) {
        try {
            Other_Users_Room user = new Other_Users_Room();
            user.user_name = jsonObject.getString("user_name");
            user.UserID = jsonObject.getString("UserID");
            user.Introduction = jsonObject.getString("Introduction");
            user.Quote_of_Day = jsonObject.getString("Quote_of_Day");
            user.Working_On = jsonObject.getString("Working_On");
            user.Image = jsonObject.getString("Image");
            user.FollowersCount = jsonObject.getInt("user_followers_count");
            user.FollowingCount = jsonObject.getInt("user_followers_count");
        }catch (JSONException je){
            System.out.println(je.toString());
        }
    }*/

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
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

    public String getIntro() {
        return intro;
    }

    public void setIntro(String intro) {
        this.intro = intro;
    }

    public String getWorkingOn() {
        return workingOn;
    }

    public void setWorkingOn(String workingOn) {
        this.workingOn = workingOn;
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

    public String getCreateBY() {
        return createBY;
    }

    public void setCreateBY(String createBY) {
        this.createBY = createBY;
    }

    public Boolean getRated() {
        return isRated;
    }

    public void setRated(Boolean rated) {
        isRated = rated;
    }

    public Boolean getBookmarked() {
        return isBookmarked;
    }

    public void setBookmarked(Boolean bookmarked) {
        isBookmarked = bookmarked;
    }

    public Boolean getFollowed() {
        return isFollowed;
    }

    public void setFollowed(Boolean followed) {
        isFollowed = followed;
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

    public Integer getTotal() {
        return total;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }

    public Other_Users_Room() {
        this.id = id;
        this.userName = userName;
        this.userId = userId;
        this.userImage = userImage;
        this.quoteofDay = quoteofDay;
        this.intro = intro;
        this.workingOn = workingOn;
        this.title = title;
        this.category = category;
        this.subCat = subCat;
        this.longDescription = longDescription;
        this.shortDescription = shortDescription;
        this.language = language;
        this.blogId = blogId;
        this.createBY = createBY;
        this.isRated = isRated;
        this.isBookmarked = isBookmarked;
        this.isFollowed = isFollowed;
        this.bookMarkedCount = bookMarkedCount;
        this.viewCount = viewCount;
        this.ratingCount = ratingCount;
        this.commentsCount = commentsCount;
        this.userFollowersCount = userFollowersCount;
    }

    /*public void setAdditionalProperties(Map<String, Object> additionalProperties) {
            this.additionalProperties = additionalProperties;
        }
    */


    /*public static Other_Users_Room (JSONObject jsonObject) throws JSONException {
        Other_Users_Room user = new Other_Users_Room();
        user.user_name = jsonObject.getString("user_name");
        user.UserID = jsonObject.getString("UserID");
        user.Introduction = jsonObject.getString("Introduction");
        user.Quote_of_Day = jsonObject.getString("Quote_of_Day");
        user.Working_On = jsonObject.getString("Working_On");
        user.Image = jsonObject.getString("Image");
        user.FollowersCount = jsonObject.getInt("user_followers_count");
        user.FollowingCount = jsonObject.getInt("user_followers_count");
        return user;
    }
*/

}
