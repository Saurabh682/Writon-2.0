package com.ibitvalley.writon.model;


    import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;


public class PostData implements Serializable, Parcelable
    {

        @SerializedName("user_id")
        @Expose
        private String userId;
        @SerializedName("user_name")
        @Expose
        private String userName;
        @SerializedName("user_image")
        @Expose
        private String userImage;
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

        @SerializedName("fulldescription")
        @Expose
        private String fulldescription;
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

        @SerializedName("is_draft")
        @Expose
        private String is_draft;
        public final static Parcelable.Creator<PostData> CREATOR = new Creator<PostData>() {


            @SuppressWarnings({
                    "unchecked"
            })
            public PostData createFromParcel(Parcel in) {
                return new PostData(in);
            }

            public PostData[] newArray(int size) {
                return (new PostData[size]);
            }

        }
                ;
        private final static long serialVersionUID = 9160033910601933204L;

        protected PostData(Parcel in) {
            this.userId = ((String) in.readValue((String.class.getClassLoader())));
            this.userName = ((String) in.readValue((String.class.getClassLoader())));
            this.userImage = ((String) in.readValue((String.class.getClassLoader())));
            this.title = ((String) in.readValue((String.class.getClassLoader())));
            this.category = ((String) in.readValue((String.class.getClassLoader())));
            this.subCat = ((String) in.readValue((String.class.getClassLoader())));
            this.longDescription = ((String) in.readValue((String.class.getClassLoader())));
            this.shortDescription = ((String) in.readValue((String.class.getClassLoader())));
            this.language = ((String) in.readValue((String.class.getClassLoader())));
            this.blogId = ((String) in.readValue((String.class.getClassLoader())));
            this.createBY = ((String) in.readValue((String.class.getClassLoader())));
            this.isRated = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
            this.isBookmarked = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
            this.isFollowed = ((Boolean) in.readValue((Boolean.class.getClassLoader())));
            this.bookMarkedCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
            this.viewCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
            this.ratingCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
            this.commentsCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
            this.userFollowersCount = ((Integer) in.readValue((Integer.class.getClassLoader())));
            this.fulldescription = ((String) in.readValue((String.class.getClassLoader())));
            this.is_draft = ((String) in.readValue((Boolean.class.getClassLoader())));

        }

        /**
         * No args constructor for use in serialization
         *
         */
        public PostData() {
        }

        /**
         *
         * @param longDescription
         * @param userFollowersCount
         * @param isBookmarked
         * @param isRated
         * @param language
         * @param shortDescription
         * @param userName
         * @param title
         * @param ratingCount
         * @param userId
         * @param subCat
         * @param isFollowed
         * @param createBY
         * @param userImage
         * @param bookMarkedCount
         * @param commentsCount
         * @param viewCount
         * @param category
         * @param blogId
         */
        public PostData(String userId, String userName, String userImage, String title, String category, String subCat, String longDescription, String shortDescription, String language, String blogId, String createBY, Boolean isRated, Boolean isBookmarked, Boolean isFollowed, Integer bookMarkedCount, Integer viewCount, Integer ratingCount, Integer commentsCount, Integer userFollowersCount) {
            super();
            this.userId = userId;
            this.userName = userName;
            this.userImage = userImage;
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

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public PostData withUserId(String userId) {
            this.userId = userId;
            return this;
        }

        public String getUserName() {
            return userName;
        }

        public void setUserName(String userName) {
            this.userName = userName;
        }

        public PostData withUserName(String userName) {
            this.userName = userName;
            return this;
        }

        public String getUserImage() {
            return userImage;
        }

        public void setUserImage(String userImage) {
            this.userImage = userImage;
        }

        public PostData withUserImage(String userImage) {
            this.userImage = userImage;
            return this;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public PostData withTitle(String title) {
            this.title = title;
            return this;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public PostData withCategory(String category) {
            this.category = category;
            return this;
        }

        public String getSubCat() {
            return subCat;
        }

        public void setSubCat(String subCat) {
            this.subCat = subCat;
        }

        public PostData withSubCat(String subCat) {
            this.subCat = subCat;
            return this;
        }

        public String getLongDescription() {
            return longDescription;
        }

        public void setLongDescription(String longDescription) {
            this.longDescription = longDescription;
        }

        public PostData withLongDescription(String longDescription) {
            this.longDescription = longDescription;
            return this;
        }

        public String getShortDescription() {
            return shortDescription;
        }

        public void setShortDescription(String shortDescription) {
            this.shortDescription = shortDescription;
        }

        public PostData withShortDescription(String shortDescription) {
            this.shortDescription = shortDescription;
            return this;
        }

        public String getLanguage() {
            return language;
        }

        public void setLanguage(String language) {
            this.language = language;
        }

        public PostData withLanguage(String language) {
            this.language = language;
            return this;
        }

        public String getBlogId() {
            return blogId;
        }

        public void setBlogId(String blogId) {
            this.blogId = blogId;
        }

        public PostData withBlogId(String blogId) {
            this.blogId = blogId;
            return this;
        }

        public String getCreateBY() {
            return createBY;
        }

        public void setCreateBY(String createBY) {
            this.createBY = createBY;
        }

        public PostData withCreateBY(String createBY) {
            this.createBY = createBY;
            return this;
        }

        public Boolean getIsRated() {
            return isRated;
        }

        public void setIsRated(Boolean isRated) {
            this.isRated = isRated;
        }

        public PostData withIsRated(Boolean isRated) {
            this.isRated = isRated;
            return this;
        }

        public Boolean getIsBookmarked() {
            return isBookmarked;
        }

        public void setIsBookmarked(Boolean isBookmarked) {
            this.isBookmarked = isBookmarked;
        }

        public PostData withIsBookmarked(Boolean isBookmarked) {
            this.isBookmarked = isBookmarked;
            return this;
        }

        public Boolean getIsFollowed() {
            return isFollowed;
        }

        public void setIsFollowed(Boolean isFollowed) {
            this.isFollowed = isFollowed;
        }

        public PostData withIsFollowed(Boolean isFollowed) {
            this.isFollowed = isFollowed;
            return this;
        }

        public Integer getBookMarkedCount() {
            return bookMarkedCount;
        }

        public void setBookMarkedCount(Integer bookMarkedCount) {
            this.bookMarkedCount = bookMarkedCount;
        }

        public PostData withBookMarkedCount(Integer bookMarkedCount) {
            this.bookMarkedCount = bookMarkedCount;
            return this;
        }

        public Integer getViewCount() {
            return viewCount;
        }

        public void setViewCount(Integer viewCount) {
            this.viewCount = viewCount;
        }

        public PostData withViewCount(Integer viewCount) {
            this.viewCount = viewCount;
            return this;
        }

        public Integer getRatingCount() {
            return ratingCount;
        }

        public void setRatingCount(Integer ratingCount) {
            this.ratingCount = ratingCount;
        }

        public PostData withRatingCount(Integer ratingCount) {
            this.ratingCount = ratingCount;
            return this;
        }

        public Integer getCommentsCount() {
            return commentsCount;
        }

        public void setCommentsCount(Integer commentsCount) {
            this.commentsCount = commentsCount;
        }

        public PostData withCommentsCount(Integer commentsCount) {
            this.commentsCount = commentsCount;
            return this;
        }

        public Integer getUserFollowersCount() {
            return userFollowersCount;
        }

        public void setUserFollowersCount(Integer userFollowersCount) {
            this.userFollowersCount = userFollowersCount;
        }

        public PostData withUserFollowersCount(Integer userFollowersCount) {
            this.userFollowersCount = userFollowersCount;
            return this;
        }

        public String getFulldescription() {
            return fulldescription;
        }

        public void setFulldescription(String fulldescription) {
            this.fulldescription = fulldescription;
        }

        public String isIs_draft() {
            return is_draft;
        }

        public void setIs_draft(String is_draft) {
            this.is_draft = is_draft;
        }

        public void writeToParcel(Parcel dest, int flags) {
            dest.writeValue(userId);
            dest.writeValue(userName);
            dest.writeValue(userImage);
            dest.writeValue(title);
            dest.writeValue(category);
            dest.writeValue(subCat);
            dest.writeValue(longDescription);
            dest.writeValue(shortDescription);
            dest.writeValue(language);
            dest.writeValue(blogId);
            dest.writeValue(createBY);
            dest.writeValue(isRated);
            dest.writeValue(isBookmarked);
            dest.writeValue(isFollowed);
            dest.writeValue(bookMarkedCount);
            dest.writeValue(viewCount);
            dest.writeValue(ratingCount);
            dest.writeValue(commentsCount);
            dest.writeValue(userFollowersCount);
            dest.writeValue(fulldescription);
            dest.writeValue(is_draft);


        }

        public int describeContents() {
            return 0;
        }

    }

