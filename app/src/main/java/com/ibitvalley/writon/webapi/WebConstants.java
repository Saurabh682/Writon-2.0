package com.ibitvalley.writon.webapi;


import java.util.ArrayList;

public class WebConstants {

    //public static final String BASE_URL = "http://n100.online/";

    public static final String HTTPS_VERIFY_URL = "";


    public static final String BASE_URL = "https://www.writon.co/api/v1/";


    public static final String Login_Api = BASE_URL + "login";
    public static final String Register_API = BASE_URL + "register";
    public static final String SocialRegister_API = BASE_URL + "social-signup";

    public static final String Latest_Post = BASE_URL + "latest-posts";
    public static final String trending_Post = BASE_URL + "trending-posts";
    public static final String published_Post = BASE_URL + "published-blogs";
    public static final String myworld_action = BASE_URL + "myworld";
    public static final String trending_users = BASE_URL + "trending-users";
    public static final String discussions_action = BASE_URL + "discussions";
    public static final String top_followers = BASE_URL + "top-followers";
    public static final String bookmarked_api = BASE_URL + "bookmarked";
    public static final String mark_bookmark_api = BASE_URL + "bookmark";
    public static final String mark_unbookmark_api = BASE_URL + "unbookmark";
    public static final String mark_as_View = BASE_URL + "mark-as-view";
    public static final String follow_user = BASE_URL + "follow";
    public static final String un_follow_user = BASE_URL + "unfollow";
    public static final String recent_blog = BASE_URL + "recent-blogs";
    public static final String submit_report_url = BASE_URL + "report-blog";
    public static final String search_url = BASE_URL + "search";
    public static final String comment_url = BASE_URL + "comment-list";
    public static final String upload_profile_pic_url = BASE_URL + "update-profile-image";
    public static final String add_comment_url = BASE_URL + "AddComment";
    public static final String delete_post_url = BASE_URL + "delete-post";
    public static final String delete_comment_url = BASE_URL + "delete-comment";
    public static final String add_rating_url = BASE_URL +"AddRating";

    public static final String drafts_api = BASE_URL + "drafts";
    public static final String top_rated = BASE_URL + "top-rated";

    public static final String add_post = BASE_URL + "add-post";
    public static final String user_profile = BASE_URL + "user-profile";
    public static final String user_update_profile = BASE_URL + "update-profile";


    public static final String chanhe_password = BASE_URL + "change-password";


    public static final String MAIN_CATEGORY_API = BASE_URL + "api/vender/GetVendor";
    public static final String Sub_CATEGORY_API = BASE_URL + "api/vender/GetCategory";
    public static final String Sub_CATEGORY2_API = BASE_URL + "api/vender/GetSubCategory?CategoryId=%s";
    public static final String ProductList_API = BASE_URL + "api/Product/GetProduct?VendorId=%s&CategoryId=%s";

    public static final String REGISTER_API_URL = BASE_URL + "api/User/UserRegister";

    public static  String PLACE_ORDER_API_URL = BASE_URL + "api/Order/PlaceOrder";
    public static String GET_ORDER_API_URL = BASE_URL + "api/Order/OrderHistory";
    public static String GET_ORDERDETAILS_API_URL = BASE_URL + "api/Order/OrderDetails";
    public static  String GET_DELIVERY_ADDRESS_URL = BASE_URL + "api/User/GetCustomerAddress?CustomerId=%s";



    public static final String USER_REGISTER_API_URL = BASE_URL + "api/User/UserRegistration";
    public static final String BRANCH_LIST_API_URL = BASE_URL + "api/Branch/GetBranchsList";
    public static String CREATE_ORDER_API_URL = BASE_URL + "api/Order/PurchaseOrder";

    public static String GET_USER_API_URL = BASE_URL + "api/Vendor/GetUsersListByVendor";

    public static String APPLY_COUPONCODE_API_URL = BASE_URL + "api/Order/IsValidCoupon";




    public static String CANCEL_ORDER_API_URL = BASE_URL + "api/Order/CancelOrder";

    public static String  POINT_API_URL = BASE_URL + "api/Vendor/GetVendorsPointsById";

    public static String Commission_Slab_API_URL =  BASE_URL + "api/Vendor/GetVendorCommissionSlabByVendor";


    public static String SessionKey = "";
    public static String ParentID = "";
    //For Product List Only
    public static String SelectedCategoryID ="";
    public static String SelectedUserID ="";
    public static String OrderID ="";
    public static int ordertype = 1;
    public static String totalAmount ="";


}
