package com.ibitvalley.writon;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.FragmentActivity;
import androidx.lifecycle.ViewModelProvider;

import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.DefaultResponse;
import com.ibitvalley.writon.model.UserModel;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.squareup.picasso.Picasso;

import org.greenrobot.eventbus.EventBus;

import java.util.List;

import butterknife.BindView;
import butterknife.ButterKnife;
import de.hdodenhof.circleimageview.CircleImageView;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

public class ShowBlogDetails extends BaseActivity {

    private static final String TAG = "BlogDetailsScreen";
    TextView TVTitle, TVDescription, TVWriterName, tv_Category, tv_subCategory, tv_language,
            TVViewCount, TVCommentCount, TVRating, tv_user_followers_count;
    Post_List_Data cuuBlog,blogDetailsRoom;
    PersonalPost_List_Data cuuPersonalList;
    Blog cuuBlogList;
    UserModel trendingPost_model;
    private OUD_Viewmodel oud_Viewmodel;
    ScrollView activity_show_blog_details;
    ImageView list_image, img_bookmark, img_Option, img_rating;
    List<Post_List_Data> blogDataList;
    Activity curr_activity;
    Context curr_context;
    Button TVFollow;
    String blogID = "";
    LinearLayout ll_Discuss;
    User userData;
    //private String bTitle;
    //private String username;
    @BindView(R.id.writer) TextView TV_Writer;
    @BindView(R.id.Frame_Bookmark)
    FrameLayout FL_Bookmark;
    @BindView(R.id.Frame_Rate)
    FrameLayout FL_Rate;
    @BindView(R.id.Frame_Share)
    FrameLayout FL_Share;
    private CompositeDisposable disposable = new CompositeDisposable();

    int position=-1;

    @BindView( R.id.progress_bar )
    ProgressBar progressBar;
    @Override
    protected void onDestroy() {
        super.onDestroy();
        disposable.clear();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
         //Making notification bar transparent

        setContentView(R.layout.activity_show_blog_details);

        ButterKnife.bind(this, this);
        curr_activity = this;
        curr_context = this;
        userData = WritOnPreference.getInstance(curr_context).getUserDetails();
        oud_Viewmodel = new ViewModelProvider((FragmentActivity) curr_context).get(OUD_Viewmodel.class);
        TVTitle = findViewById(R.id.TVTitle);
        TVDescription = findViewById(R.id.TVDescription);
        TVWriterName = findViewById(R.id.TVWriterName);
        tv_user_followers_count = findViewById(R.id.tv_user_followers_count);

        tv_Category = findViewById(R.id.tv_Category);
        tv_subCategory = findViewById(R.id.tv_subCategory);
        tv_language = findViewById(R.id.tv_language);
        list_image = (CircleImageView) findViewById(R.id.list_image);
        img_bookmark = findViewById(R.id.img_bookmark);
        img_Option = findViewById(R.id.img_Option);

        TVViewCount = findViewById(R.id.TVViewCount);
        TVCommentCount = findViewById(R.id.TVCommentCount);
        TVRating = findViewById(R.id.TVRating);
        ll_Discuss = findViewById(R.id.ll_Discuss);
        TVFollow = findViewById(R.id.TVFollow);
        img_rating = findViewById(R.id.img_rating);

         String screenName = getIntent().getStringExtra("boxTitle");


         if ( getIntent().hasExtra( "position" ) )
         {
             position=getIntent().getIntExtra( "position",-1 );
         }

        assert screenName != null;
        if(screenName.equals("Latest") || screenName.equals("Bookmarked") || screenName.equals("Recent Read")||screenName.equals("Trending")) {
                cuuBlog = (Post_List_Data) getIntent().getSerializableExtra("BlogObject");
            markAsView();
            getDataFromApi(cuuBlog.getBlogId(),userData.getId());

        }
        else if (  screenName.equals( "MyWorld" ))
        {
            markAsView();
            getDataFromApi(getIntent().getStringExtra( "blogId" ),userData.getId());

        }
        else if ( screenName.equals( "Notification" ) )
        {
            markAsView();

            getDataFromApi(getIntent().getStringExtra( "blogId" ),userData.getId());
        }
        else if (  screenName.equals( "Category" ))
        {

        }else if(screenName.equals("PersonalPostList") ){
            cuuPersonalList = (PersonalPost_List_Data) getIntent().getSerializableExtra("BlogObject");
            assert cuuPersonalList != null;
            Log.d(TAG, "onCreate: "+cuuPersonalList.getBlogId());
            assert cuuPersonalList != null;
            markAsView();

            getDataFromRoomPersonal(cuuPersonalList.getBlogId());

        }else if(screenName.equals("Search") ){
            cuuBlog = (Post_List_Data) getIntent().getSerializableExtra("BlogObject");
            markAsView();

            getDataFromApi(cuuBlog.getBlogId(),userData.getId());
        }


        //markAsView();

        activity_show_blog_details = (ScrollView) findViewById(R.id.activity_show_blog_details);


        MyApplication.getInstance().trackEvent("ShowBlogDetail", "Blog Details", "Blog reading screen.");
        MyApplication.getInstance().trackScreenView("HomeScreen");
        //toggleHideyBar();


    }

    private void getDataFromApi(String blogID,String userId){

        showProgressDialog(true);
        oud_Viewmodel.getBlogDetails(blogID,userId).subscribeOn(Schedulers.io()  )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<Posts_List>() {
                    @Override
                    public void accept(Posts_List posts_list) throws Exception {
                        showProgressDialog(false);
                        if ( posts_list!=null )
                        {
                            if(posts_list.getData().get( 0 )!=null) {
                                UpdateUI(posts_list.getData().get( 0 ));
                                oud_Viewmodel.insertPost(posts_list.getData().get( 0 ).getBlogId());
                            }
                        }
                        else
                            getDataFromRoom(blogID);

                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                           showProgressDialog( false );
                           getDataFromRoom(blogID);
                                    Log.e(TAG, "accept: ",throwable );
                    }
                } );
    }

    private void getDataFromRoom(String blogID)
    {
                oud_Viewmodel.getBlogDetails(blogID)
                .subscribeOn(Schedulers.io() )
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<Post_List_Data>() {
                               @Override
                               public void accept(Post_List_Data listData) throws Exception {
                                    if(listData.getLongDescription()!=null) {
                                        UpdateUI(listData);
                                    }else{
                                        oud_Viewmodel.insertPost(listData.getBlogId());
                                        UpdateUI(listData);
                                    }

                               }
                           }, new Consumer<Throwable>() {
                            @Override
                            public void accept(Throwable throwable) throws Exception {
                                Toast.makeText(curr_context,
                                        "Error: " + throwable,
                                        Toast.LENGTH_SHORT)
                                        .show();
                                Log.e(TAG, "accept: ",throwable );

                            }
                        }
                );
    }
    private void getDataFromRoomPersonal(String blogID){
        disposable.add(oud_Viewmodel.getBlogDetailsPersonal(blogID)
                .subscribeOn(Schedulers.computation())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<PersonalPost_List_Data>() {
                               @Override
                               public void accept(PersonalPost_List_Data listData) throws Exception {
                                   if(listData.getLongDescription()!=null) {
                                       UpdateUIpersonal(listData);
                                   }
                               }
                           }, new Consumer<Throwable>() {
                               @Override
                               public void accept(Throwable throwable) throws Exception {
                                   Toast.makeText(curr_context,
                                           "Error: " + throwable,
                                           Toast.LENGTH_SHORT)
                                           .show();
                                   Log.e(TAG, "accept: ",throwable );

                               }
                           }
                ));
    }

    private void UpdateUI(Post_List_Data postListData){
        TVTitle.setText(postListData.getTitle());
        TVTitle.setTextSize(26);
        TV_Writer.setText(String.format("%s", "by "+postListData.getUserName()));
        //username = cuuBlog.getUserName();
        TVWriterName.setText(String.format("%s", postListData.getUserName()));
        //this.setTitle(cuuBlog.getTitle());
        if(postListData.getLongDescription() != null){
            TVDescription.setText(Html.fromHtml(postListData.getLongDescription()));
        }else if(postListData.getShortDescription() != null){
            TVDescription.setText(Html.fromHtml(postListData.getShortDescription()));
        }
        tv_Category.setText(String.format("%s, %s (%s)", postListData.getCategory(), postListData.getSubCat(), postListData.getLanguage()));

        tv_user_followers_count.setText(String.format("%s FOLLOWERS",
                postListData.getUserFollowersCount() ));

        if(postListData.getUserImage() != null){
            Picasso.get().load(postListData.getUserImage()).placeholder(R.drawable.generic_male).into(list_image);
        }

        blogID = postListData.getBlogId();

        if (postListData.getIsBookmarked()) {
            img_bookmark.setImageResource(R.drawable.bookmarkyellow);
        } else {
            img_bookmark.setImageResource(R.drawable.bookmarkblue);
        }

        if (postListData.getIsRated()) {
            img_rating.setImageResource(R.drawable.staryellow);
        } else {
            img_rating.setImageResource(R.drawable.starblue);
        }

        FL_Bookmark.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                BookMark_List_Data bookMark_list_data=new BookMark_List_Data(postListData);

                if(postListData.getIsBookmarked()){
                    //unbookmarkRequest(userData.getId(), blogID, cuuBlog.getIsBookmarked());
                    //int i = cuuBlog.getBookMarkedCount()-1;
                    //cuuBlog.setBookMarkedCount(i);
                    postListData.setIsBookmarked(false);
                    oud_Viewmodel.updateBookmark(bookMark_list_data,false);
                    EventBus.getDefault().post(new AddNewEvent( position,ActionType.BOOKMARK ,false));

                    img_bookmark.setImageResource(R.drawable.bookmarkblue);
                }else {
                    //bookmarkRequest(userData.getId(), blogID, cuuBlog.getIsBookmarked());
                    //int i = cuuBlog.getBookMarkedCount()-1;
                    //cuuBlog.setBookMarkedCount(i);
                    EventBus.getDefault().post(new AddNewEvent( position,ActionType.BOOKMARK ,true));

                    postListData.setIsBookmarked(true);
                    img_bookmark.setImageResource(R.drawable.bookmarkyellow);
                    oud_Viewmodel.updateBookmark(bookMark_list_data,true);
                    //fcmNotify("bookmark", cuuBlog.getTitle());
                    //fcmNotifyAll("bookmark", cuuBlog.getTitle());
                }
            }
        });


        FL_Share.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Post_List_Data blog = postListData;
                String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getUserName(),  Html.fromHtml(blog.getLongDescription()), blog.getCategory(), "https://bit.ly/2Y1TX3r");
                //if (!blog.getUserID().equals(UserId)) {
                share(shareContent);
            }
        });

        this.img_Option.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Post_List_Data blog = postListData;
                String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getUserName(),  Html.fromHtml(blog.getLongDescription()), blog.getCategory(), "https://bit.ly/2Y1TX3r");
                //if (!blog.getUserID().equals(UserId)) {
                String[] arrString = {"Report", "Share"};
                showPopupMenu(arrString, shareContent);
            }
        });

        TVViewCount.setText(String.valueOf(postListData.getViewCount()));
        TVCommentCount.setText(String.valueOf(postListData.getCommentsCount()));
        TVRating.setText(String.valueOf(postListData.getRatingCount()));
        ll_Discuss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intentShowBlogDetails = new Intent(ShowBlogDetails.this, ActivityBlogComments.class);
                Bundle bundle = new Bundle();

                bundle.putSerializable("BlogObject", postListData);
                intentShowBlogDetails.putExtras(bundle);
                intentShowBlogDetails.putExtra("BlogType", "cuuBlog");
                startActivity(intentShowBlogDetails);
            }
        });

        TVFollow.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                //final String followUserID, final String userID
                if(postListData.getIsFollowed()) {
                    TVFollow.setText("FOLLOW");
                    postListData.setIsFollowed(false);
                    EventBus.getDefault().post(new AddNewEvent( position,ActionType.FOLLOW ,false));
                    int i = postListData.getUserFollowersCount()-1;
                    postListData.setUserFollowersCount(i);
                    oud_Viewmodel.updateFollowRoom(postListData.getBlogId(),false,i, postListData.getUserId(),
                            postListData.getUserName(),postListData.getTitle());
                    //unFollowUser(cuuBlog.getUserId(), userData.getId());
                } else {
                    TVFollow.setText("UN FOLLOW");
                    //fcmNotify("follow", cuuBlog.getTitle());
                    //fcmNotifyAll("follow", cuuBlog.getTitle());
                    postListData.setIsFollowed(true);
                    int i = postListData.getUserFollowersCount()+1;
                    EventBus.getDefault().post(new AddNewEvent( position,ActionType.FOLLOW ,true));

                    postListData.setUserFollowersCount(i);
                    oud_Viewmodel.updateFollowRoom(postListData.getBlogId(), true,i,postListData.getUserId(),
                            postListData.getUserName(),postListData.getTitle());
                    //followUser(cuuBlog.getUserId(), userData.getId());
                }
            }
        });


        if(postListData.getIsFollowed()) {
            TVFollow.setText("UN FOLLOW");
        } else {
            TVFollow.setText("FOLLOW");
        }

        FL_Rate.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (postListData.getIsRated()) {
                    //addRating(blogID, userData.getId(), "0");
                    int i = postListData.getRatingCount()-1;
                    postListData.setRatingCount(i);
                    postListData.setIsRated(false);
                    img_rating.setImageResource(R.drawable.starblue);
                    EventBus.getDefault().post(new AddNewEvent( position,ActionType.RATE ,false));

                    //TVRating.setText(Integer.parseInt(TVRating.getText().toString())+1);
                    oud_Viewmodel.updateRateRoom(postListData.getBlogId(), false,i,postListData.getUserId(),postListData.getUserName(),postListData.getTitle());
                } else {
                    //addRating(blogID, userData.getId(), "1");
                    //fcmNotify("rate", cuuBlog.getTitle());
                    //fcmNotifyAll("rate", cuuBlog.getTitle());
                    int i = postListData.getRatingCount()+1;
                    postListData.setRatingCount(i);
                    postListData.setIsRated(true);
                    EventBus.getDefault().post(new AddNewEvent( position,ActionType.RATE ,true));

                    img_rating.setImageResource(R.drawable.staryellow);
                    oud_Viewmodel.updateRateRoom(postListData.getBlogId(), true,i,postListData.getUserId(),postListData.getUserName(),postListData.getTitle());

                }
            }
        });
    }

    private void UpdateUIpersonal(PersonalPost_List_Data postListData){
        TVTitle.setText(postListData.getTitle());
        TVTitle.setTextSize(26);
        TV_Writer.setText(String.format("%s", "by "+postListData.getUserName()));
        //username = cuuBlog.getUserName();
        TVWriterName.setText(String.format("%s", postListData.getUserName()));
        //this.setTitle(cuuBlog.getTitle());
        if(postListData.getLongDescription() != null){
            TVDescription.setText(Html.fromHtml(postListData.getLongDescription()));
        }else if(postListData.getShortDescription() != null){
            TVDescription.setText(Html.fromHtml(postListData.getShortDescription()));
        }
        tv_Category.setText(String.format("%s, %s (%s)", postListData.getCategory(), postListData.getSubCat(), postListData.getLanguage()));

        tv_user_followers_count.setText(String.format("%s FOLLOWERS",
                postListData.getUserFollowersCount() ));

        if(postListData.getUserImage() != null){
            Picasso.get().load(postListData.getUserImage()).placeholder(R.drawable.generic_male).into(list_image);
        }

        blogID = postListData.getBlogId();

        if (postListData.getIsBookmarked()) {
            img_bookmark.setImageResource(R.drawable.bookmarkyellow);
        } else {
            img_bookmark.setImageResource(R.drawable.bookmarkblue);
        }

        if (postListData.getIsRated()) {
            img_rating.setImageResource(R.drawable.staryellow);
        } else {
            img_rating.setImageResource(R.drawable.starblue);
        }

        FL_Bookmark.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                BookMark_List_Data bookMark_list_data=new BookMark_List_Data(postListData);

                if(postListData.getIsBookmarked()){
                    //unbookmarkRequest(userData.getId(), blogID, cuuBlog.getIsBookmarked());
                    //int i = cuuBlog.getBookMarkedCount()-1;
                    //cuuBlog.setBookMarkedCount(i);
                    postListData.setIsBookmarked(false);
                    oud_Viewmodel.updateBookmark(bookMark_list_data,false);
                    img_bookmark.setImageResource(R.drawable.bookmarkblue);
                }else {
                    //bookmarkRequest(userData.getId(), blogID, cuuBlog.getIsBookmarked());
                    //int i = cuuBlog.getBookMarkedCount()-1;
                    //cuuBlog.setBookMarkedCount(i);
                    postListData.setIsBookmarked(true);
                    img_bookmark.setImageResource(R.drawable.bookmarkyellow);
                    oud_Viewmodel.updateBookmark(bookMark_list_data,false);
                    //fcmNotify("bookmark", cuuBlog.getTitle());
                    //fcmNotifyAll("bookmark", cuuBlog.getTitle());
                }
            }
        });


        FL_Share.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                PersonalPost_List_Data blog = postListData;
                String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getUserName(),  Html.fromHtml(blog.getLongDescription()), blog.getCategory(), "https://bit.ly/2Y1TX3r");
                //if (!blog.getUserID().equals(UserId)) {
                share(shareContent);
            }
        });

        this.img_Option.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                PersonalPost_List_Data blog = postListData;
                String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getUserName(),  Html.fromHtml(blog.getLongDescription()), blog.getCategory(), "https://bit.ly/2Y1TX3r");
                //if (!blog.getUserID().equals(UserId)) {
                String[] arrString = {"Report", "Share"};
                showPopupMenu(arrString, shareContent);
            }
        });

        TVViewCount.setText(String.valueOf(postListData.getViewCount()));
        TVCommentCount.setText(String.valueOf(postListData.getCommentsCount()));
        TVRating.setText(String.valueOf(postListData.getRatingCount()));
        ll_Discuss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intentShowBlogDetails = new Intent(ShowBlogDetails.this, ActivityBlogComments.class);
                Bundle bundle = new Bundle();
                bundle.putSerializable("BlogObject", postListData);
                intentShowBlogDetails.putExtras(bundle);
                intentShowBlogDetails.putExtra("BlogType", "cuuBlogPersonal");
                startActivity(intentShowBlogDetails);
            }
        });

        TVFollow.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                //final String followUserID, final String userID
                if(postListData.getIsFollowed()) {
                    TVFollow.setText("FOLLOW");
                    postListData.setIsFollowed(false);

                    int i = postListData.getUserFollowersCount()-1;
                    postListData.setUserFollowersCount(i);
                    oud_Viewmodel.updateFollowRoom(postListData.getBlogId(),false,i, postListData.getUserId(),
                            postListData.getUserName(),postListData.getTitle());
                    //unFollowUser(cuuBlog.getUserId(), userData.getId());
                } else {
                    TVFollow.setText("UN FOLLOW");
                    //fcmNotify("follow", cuuBlog.getTitle());
                    //fcmNotifyAll("follow", cuuBlog.getTitle());
                    postListData.setIsFollowed(true);
                    int i = postListData.getUserFollowersCount()+1;
                    postListData.setUserFollowersCount(i);
                    oud_Viewmodel.updateFollowRoom(postListData.getBlogId(), true,i,postListData.getUserId(),
                            postListData.getUserName(),postListData.getTitle());
                    //followUser(cuuBlog.getUserId(), userData.getId());
                }
            }
        });


        if(postListData.getIsFollowed()) {
            TVFollow.setText("UN FOLLOW");
        } else {
            TVFollow.setText("FOLLOW");
        }

        FL_Rate.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (postListData.getIsRated()) {
                    //addRating(blogID, userData.getId(), "0");
                    int i = postListData.getRatingCount()-1;
                    postListData.setRatingCount(i);
                    postListData.setIsRated(false);
                    img_rating.setImageResource(R.drawable.starblue);
                    //TVRating.setText(Integer.parseInt(TVRating.getText().toString())+1);
                    oud_Viewmodel.updateRateRoom(postListData.getBlogId(), false,i,postListData.getUserId(),postListData.getUserName(),postListData.getTitle());
                } else {
                    //addRating(blogID, userData.getId(), "1");
                    //fcmNotify("rate", cuuBlog.getTitle());
                    //fcmNotifyAll("rate", cuuBlog.getTitle());
                    int i = postListData.getRatingCount()+1;
                    postListData.setRatingCount(i);
                    postListData.setIsRated(true);
                    img_rating.setImageResource(R.drawable.staryellow);
                    oud_Viewmodel.updateRateRoom(postListData.getBlogId(), true,i,postListData.getUserId(),postListData.getUserName(),postListData.getTitle());

                }
            }
        });
    }

    private void markAsView() {
        if ( !AppUtils.isNull( cuuBlog ) && !AppUtils.isNull( cuuBlog.getViewCount() )  )
        {
            oud_Viewmodel.updateViewCount( cuuBlog.getViewCount() +1,cuuBlog.getBlogId());
            RetroFitClient mark_as_View = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);

            mark_as_View.markAsViewed( userData.getAccess_token(),cuuBlog.getBlogId() )
                    .subscribeOn( Schedulers.io() )
                    .observeOn( AndroidSchedulers.mainThread() )
                    .subscribe( new Consumer<DefaultResponse>() {
                        @Override
                        public void accept(DefaultResponse defaultResponse) throws Exception {
                            //do nothing
                        }
                    } , new Consumer<Throwable>() {
                        @Override
                        public void accept(Throwable throwable) throws Exception {
                            //do nothing
                        }
                    } );
        }
        else if (!AppUtils.isNull( cuuPersonalList )  && !AppUtils.isNull( cuuBlog.getViewCount() ) )
        {
            oud_Viewmodel.updateViewCount( cuuBlog.getViewCount() +1,cuuBlog.getBlogId());
            RetroFitClient mark_as_View = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

            mark_as_View.markAsViewed( userData.getAccess_token(),cuuBlog.getBlogId() )
                    .subscribeOn( Schedulers.io() )
                    .observeOn( AndroidSchedulers.mainThread() )
                    .subscribe( new Consumer<DefaultResponse>() {
                        @Override
                        public void accept(DefaultResponse defaultResponse) throws Exception {

                        }
                    } );
        }


    }




    private void showPopupMenu(final String[] arrString, final String shareContent) {
        AlertDialog.Builder builderSingle = new AlertDialog.Builder(curr_activity);
        //String[] arr = {"Report"};
        builderSingle.setCancelable(true);
        builderSingle.setItems(arrString, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                if(arrString[which].equals("Report")){
                    Intent blogprofile = new Intent(curr_context, Report.class);
                    blogprofile.putExtra("blogID", blogID);
                    curr_context.startActivity(blogprofile);
                } else if(arrString[which].equals("Share")){
                    share(shareContent);
                }
            }
        });
        builderSingle.show();
    }

    private void share(String shareContent){
        Intent sendIntent = new Intent();
        // Set the action to be performed i.e 'Send Data'
        sendIntent.setAction(Intent.ACTION_SEND);
        // Add the text to the intent
        sendIntent.putExtra(Intent.EXTRA_TEXT, shareContent);
        // Set the type of data i.e 'text/plain'
        sendIntent.setType("text/plain");
        //intent.setData(Uri.parse("market://details?id=com.ibitvalley.writon"));
        // Launches the activity; Open 'Text editor' if you set it as default app to handle Text
        curr_activity.startActivity(sendIntent);
    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.menu_rtool, menu);
        return true;
    }

    private PopupWindow pwindo;

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_settings) {
            initiatePopupWindow();
        } else if (id == android.R.id.home) {
            finish();
            return true;
        }
        return true;
    }

    ImageView fontSizeSmall, fontSizeMedium, fontSizeLarge;
    TextView TVClose;
    View View2, View3, View4, View5;
    Button BTNReset;

    private void initiatePopupWindow() {
        try {
            // We need to get the instance of the LayoutInflater
            LayoutInflater inflater = (LayoutInflater) ShowBlogDetails.this.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            assert inflater != null;
            View layout = inflater.inflate(R.layout.popup_layout, (ViewGroup) findViewById(R.id.popup_element));
            pwindo = new PopupWindow(layout, ViewGroup.LayoutParams.MATCH_PARENT, ActionBar.LayoutParams.WRAP_CONTENT, true);
            pwindo.showAtLocation(layout, Gravity.CENTER, 0, 0);
            fontSizeSmall = (ImageView) layout.findViewById(R.id.fontSizeSmall);
            TVClose = (TextView) layout.findViewById(R.id.TVClose);
            TVClose.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    pwindo.dismiss();
                }
            });
            fontSizeSmall.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TVDescription.setTextSize(16);
                }
            });
            fontSizeMedium = (ImageView) layout.findViewById(R.id.fontSizeMedium);
            fontSizeMedium.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TVDescription.setTextSize(22);
                }
            });
            fontSizeLarge = (ImageView) layout.findViewById(R.id.fontSizeLarge);
            fontSizeLarge.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TVDescription.setTextSize(26);
                }
            });
            //
            View2 = (View) layout.findViewById(R.id.View2);
            View2.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.parseColor("#ffffff"));
                    TVTitle.setTextColor(Color.parseColor("#000000"));
                    TVDescription.setTextColor(Color.parseColor("#000000"));
                }
            });
            View3 = (View) layout.findViewById(R.id.View3);
            View3.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.parseColor("#e7dec7"));
                    TVTitle.setTextColor(Color.parseColor("#5d4232"));
                    TVDescription.setTextColor(Color.parseColor("#5d4232"));
                }
            });
            View4 = layout.findViewById(R.id.View4);
            View4.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.parseColor("#000000"));
                    TVTitle.setTextColor(Color.parseColor("#ffffff"));
                    TVDescription.setTextColor(Color.parseColor("#ffffff"));
                }
            });


            BTNReset = layout.findViewById(R.id.BTNReset);
            BTNReset.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.WHITE);
                    TVTitle.setTextColor(Color.BLACK);
                    TVDescription.setTextColor(Color.BLACK);
                    TVDescription.setTextSize(16);
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    /**
     * Detects and toggles immersive mode (also known as "hidey bar" mode).
     */
    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    public void toggleHideyBar() {


        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
        // BEGIN_INCLUDE (get_current_ui_flags)
        // The UI options currently enabled are represented by a bitfield.
        // getSystemUiVisibility() gives us that bitfield.
        int uiOptions = getWindow().getDecorView().getSystemUiVisibility();
        int newUiOptions = uiOptions;
        // END_INCLUDE (get_current_ui_flags)
        // BEGIN_INCLUDE (toggle_ui_flags)
        boolean isImmersiveModeEnabled =
                ((uiOptions | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY) == uiOptions);
        if (isImmersiveModeEnabled) {
            Log.i("", "Turning immersive mode mode off. ");
        } else {
            Log.i("", "Turning immersive mode mode on.");
        }

        // Navigation bar hiding:  Backwards compatible to ICS.
        newUiOptions ^= View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;

        // Status bar hiding: Backwards compatible to Jellybean
        if (Build.VERSION.SDK_INT >= 16) {
            newUiOptions ^= View.SYSTEM_UI_FLAG_FULLSCREEN;
        }

        // Immersive mode: Backward compatible to KitKat.
        // Note that this flag doesn't do anything by itself, it only augments the behavior
        // of HIDE_NAVIGATION and FLAG_FULLSCREEN.  For the purposes of this sample
        // all three flags are being toggled together.
        // Note that there are two immersive mode UI flags, one of which is referred to as "sticky".
        // Sticky immersive mode differs in that it makes the navigation and status bars
        // semi-transparent, and the UI flag does not get cleared when the user interacts with
        // the screen.
        if (Build.VERSION.SDK_INT >= 18) {
            newUiOptions ^= View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        }

        getWindow().getDecorView().setSystemUiVisibility(newUiOptions);
        //END_INCLUDE (set_ui_flags)
    }


    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            finish();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    void showProgressDialog(boolean isVisible)
    {
        progressBar.setVisibility( isVisible? View.VISIBLE:View.GONE );
    }

    @Override
    public void onBackPressed() {
        if ( isTaskRoot() )
        {
            Intent home = new Intent(ShowBlogDetails.this, Home_Activity.class);
            startActivity(home);
            finish();
        }else
            super.onBackPressed();
    }
}

