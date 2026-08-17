package com.ibitvalley.writon.retroFit;

import com.ibitvalley.writon.classes.model.AddPostResponse;
import com.ibitvalley.writon.classes.model.BookMark_List;
import com.ibitvalley.writon.classes.model.DraftCreationResponse;
import com.ibitvalley.writon.classes.model.PersonalPost_List;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.model.Posts_List_Response;
import com.ibitvalley.writon.classes.model.LoginBody;
import com.ibitvalley.writon.classes.model.SignupBody;
import com.ibitvalley.writon.classes.model.SignupResponse;
import com.ibitvalley.writon.classes.model.UserList;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.Followers;
import com.ibitvalley.writon.model.LatestPost;
import com.ibitvalley.writon.model.LoginUserDetails;
import com.ibitvalley.writon.model.DefaultResponse;
import com.ibitvalley.writon.model.MyWorldResponse;
import com.ibitvalley.writon.model.TrendingUserResponse;
import com.ibitvalley.writon.model.UserData;
import com.ibitvalley.writon.model.UserInfo;

import org.json.JSONObject;

import io.reactivex.Flowable;
import io.reactivex.Observable;
import io.reactivex.Single;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.Field;
import retrofit2.http.FormUrlEncoded;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.Headers;
import retrofit2.http.POST;
import retrofit2.http.Query;


public interface RetroFitClient {
    //https://api.github.com/users/azemZejnil/repos is whole URL

    //"users/{user}/repos" is the part of URL will be added to base URL.
   /* @GET("users/{user}/repos")
    //List<GithubRepo> is return type    @Path("user")String user is the parameter we will pass
    Call<List<UserList>> reposForUser(@Path("user")String user);*/


//    @POST("register")
//    @Headers({
//            "Connection: keep-alive",
//            "User-Agent: WritOnApp",
//    })
//    @FormUrlEncoded
//    Single<SignupResponse> register(@Field("Name") String Uname ,
//                                      @Field("PenName") String Pname ,
//                                      @Field("Email") String Email ,
//                                      @Field("Mobile") String Mobile ,
//                                      @Field("ProfilePic") String ProfilePic ,
//                                      @Field("Password") String password );

    @POST("register")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    Single<SignupResponse> register(@Body SignupBody signupBody);



    @POST("SocialSignUp.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Call<SignupResponse> socialSignup(@Field("Uname") String Uname ,
                                      @Field("Pname") String Pname ,
                                      @Field("Email") String Email ,
                                      @Field("Mobile") String Mobile ,
                                      @Field("ProfilePic") String ProfilePic ,
                                      @Field("Provider") String Provider ,
                                      @Field("ProviderId") String ProviderId );

    @POST("allPosts.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Call<Posts_List> getPostData(@Field("id") String id , @Field("lim") int lim);




    @POST("add-post")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Single<AddPostResponse> addPost(@Header("access-token") String userkey,
                                    @Field("subcategory") String subcategory,
                                    @Field("category") String category,
                                    @Field("title") String title,
                                    @Field("shortdescription") String shortdescription,
                                    @Field("fulldescription") String fulldescription,
                                    @Field("is_draft") String is_draft,
                                    @Field("language") String language
                                    );


    @POST("allPosts.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Observable<Posts_List> getPostDataRx(@Field("id") String id , @Field("lim") int lim);

    @POST("allPosts_Pagi.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Observable<Posts_List> getPostDataPagintion(@Field("id") String id , @Field("lim") int lim,@Field("page") int page);


    @POST("allPosts.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Single<Posts_List> getUpdatedPostDataRx(@Field("id") String id , @Field("lim") int lim);

    @POST("blogDetails.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Observable<Posts_List> getPostDetailsRx(@Field("bid") String bid , @Field("id") String id);

    @POST("personalPost.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Observable<PersonalPost_List> getPersonalPostRx(@Field("id") String id , @Field("isDraft") int isDraft);

    @POST("recentRead.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Observable<Posts_List> getRecentReadDataRx(@Field("id") String id , @Field("lim") int lim);

    @POST("allPostsBookmark.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Observable<BookMark_List> getBookmarkDataRx(@Field("id") String id , @Field("lim") int lim);


    @POST("SingleUserDetail.php")
    @FormUrlEncoded
    Call<UserList> getUserDetail(@Field("id") String id , @Field("OtherID") String otherid);

    @POST("LatestPost.php")
    @FormUrlEncoded
    Call<LatestPost> getLatestPost(@Field("id") String id , @Field("lim") int lim);

    @POST("TrendingPost.php")
    @FormUrlEncoded
    Call<LatestPost> getTrendingPost(@Field("id") String id );

    @POST("MostFollowed.php")
    @FormUrlEncoded
    Call<LatestPost> getMostFollowed(@Field("id") String id , @Field("lim") int lim);

    @POST("MostRatedPost.php")
    @FormUrlEncoded
    Call<LatestPost> getMostRatedPost(@Field("id") String id , @Field("lim") int lim);

    @POST("RatePost.php")
    @FormUrlEncoded
    Call<JSONObject> RatePost(@Field("id") String id , @Field("Bid") String bid);

    @GET("fcm_noti_multiuser3.php")
    Call<String> fcm_noti_multiuser(@Query("id") String id , @Query("tp") String tp , @Query("sp") String sp,@Query("Action") String action,@Query("Blogid") String Blogid,@Query("Oid") String Oid,@Query("action2") String action2);

    @GET("fcm_noti_single_2.php")
    Call<String> fcm_noti_single(@Query("id") String id , @Query("tp") String tp , @Query("sp") String sp,@Query("action") String action);

    @GET("addFCMid.php")
    Single<String> registerFcm(@Query("id") String id , @Query("fcmid") String fcmId );

    @POST("followersList.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Call<Followers> getFollowersList(@Header("access-token") String accessToken ,@Field("id") String id);

    @POST("followingList.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Call<Followers> getFollowingList(@Header("access-token") String accessToken ,@Field("id") String id);

    @POST("discussions")
    @FormUrlEncoded
    Call<LatestPost> getDiscussionsList(@Field("id") String id);

    @POST("recent-blogs")
    @FormUrlEncoded
    Call<LatestPost> getRecentBlogsList(@Field("id") String id);

    @POST("userDetails.php")
    @FormUrlEncoded
    Call<UserInfo> getUserData(@Field("id") String id);

    @POST("bookmarked")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Call<LatestPost> getBookmarkList();

    @POST("bookmark")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Single<String> bookmark(@Header("access-token") String accessToken , @Field("blogid") String bid , @Field("userid") String id);

    @POST("unbookmark")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Single<String> unBookmark(@Header("access-token") String accessToken , @Field("blogid") String bid , @Field("userid") String id);

    @POST("FollowUser.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Call<DefaultResponse> follow(@Header("access-token") String accessToken , @Field("Oid") String followerId , @Field("id") String id);

    @POST("unfollow")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    @FormUrlEncoded
    Call<DefaultResponse> unfollow(@Header("access-token") String accessToken , @Field("FollowerID") String followerId , @Field("UserID") String id);

    @GET("addRating.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
    })
    Single<String> addRating( @Query("Bid") String bid,@Query("id") String id,@Query("Rate") String rate);


    @POST("personalPost.php")
    @Headers({
            "Connection: keep-alive",
            "User-Agent: WritOnApp",
            "access-token: WritOnApp",
    })
    @FormUrlEncoded
    Call<JSONObject> publishedBlogs(@Field("id") String id , @Field("isDraft") int bid);

    @POST("update-profile-image")
    @FormUrlEncoded
    Call<LatestPost> updateprofileimage(@Header("access-token") String accessToken , @Field("image") String id);

    @POST("AddComment")
    @FormUrlEncoded
    Call<LatestPost> postComment(@Header("access-token") String accessToken , @Field("UserId") String id , @Field("BlogId") String bid , @Field("Comment") String comment);

    @POST("UserProfileUpdate2.php")
    @FormUrlEncoded
    Call<UserData> updateProfile(@Field("id") String id , @Field("Pname") String Pname , @Field("Uname") String Uname ,@Field( "QoD" ) String QoD, @Field("Wo") String Wo , @Field("Intro") String Intro , @Field("dob") String dob);

    @POST("login")
    Single<LoginUserDetails> login(@Body LoginBody loginBody);


    @GET("ForgotPassword.php")
    Single<DefaultResponse> forgetPassword(@Query("Email") String id );


    @POST("trending-users")
    Single<TrendingUserResponse> getTrendingUsers(@Header("access-token") String accessToken);

    @POST("search")
    @FormUrlEncoded
    Single<Posts_List_Response> searchBlogByCategory(@Header("access-token") String accessToken, @Field("subcategory") String subCategory);

//    @POST("myworld")
//    Single<TrendingUserResponse> getMyWorldBlogs(@Header("access-token") String accessToken);

    @POST("GetNotification.php")
    @FormUrlEncoded
    Single<MyWorldResponse> getMyWorldBlogs(@Header("access-token") String accessToken,@Field( "Rid" ) String userId,@Field( "lim" ) int limit);

    @POST("MarkAsRead_Notification.php")
    @FormUrlEncoded
    Single<DefaultResponse> markAsRead(@Header("access-token") String accessToken,@Field( "Userid" ) String userId);


    @POST("published-blogs")
    @FormUrlEncoded
    Single<Posts_List> getPublishedPosts(@Header("access-token") String accessToken,@Field( "UserID" ) String userId,@Field( "page" ) String page);

    @POST("BlogListByUserId")
    @FormUrlEncoded
    Single<Posts_List> getBlogListByUserID(@Field( "UserID" ) String userId);

    @POST("user-profile")
    @FormUrlEncoded
    Single<Blog> getUserProfile(@Header("access-token") String accessToken, @Field( "Userid" ) String userId);

    @POST("recentRead.php")
    @FormUrlEncoded
    Flowable<Posts_List> getRecentReadBlogs(@Header("access-token") String accessToken, @Field( "id" ) String id, @Field( "lim" ) String lim);

    @POST("mark-as-view")
    @FormUrlEncoded
    Single<DefaultResponse> markAsViewed(@Header("access-token") String accessToken, @Field( "BlogID" ) String blogId);

    @POST("DraftCreation.php")
    @FormUrlEncoded
    Single<DraftCreationResponse> draftCreation(
                                          @Field( "Title" ) String Title,
                                          @Field( "Cat" ) String Cat,
                                          @Field( "SubCat" ) String SubCat,
                                          @Field( "ShortDes" ) String ShortDes,
                                          @Field( "LongDes" ) String LongDes,
                                          @Field( "UserId" ) String UserId,
                                          @Field( "Lang" ) String Lang);

    @POST("submitCreation.php")
    @FormUrlEncoded
    Single<DefaultResponse> submitCreation(
            @Field( "Title" ) String Title,
            @Field( "Cat" ) String Cat,
            @Field( "SubCat" ) String SubCat,
            @Field( "ShortDes" ) String ShortDes,
            @Field( "LongDes" ) String LongDes,
            @Field( "UserId" ) String UserId,
            @Field( "Lang" ) String Lang,
            @Field( "BlogId" ) String blogId,
            @Field( "isDraft" ) String isDraft);

}