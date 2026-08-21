package com.ibitvalley.writon;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.databinding.ActivityBlogCommentsBinding;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.adapter.DiscusListAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.UserModel;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.squareup.picasso.Picasso;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;

import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

/**
 * Created by on 14-10-2016.
 */

public class ActivityBlogComments extends AppCompatActivity {
    private ActivityBlogCommentsBinding binding;
    ArrayList<BlogComment> arrComments;
    Post_List_Data currBlog;
    PersonalPost_List_Data currBlogPersonal;

    String BlogType, categoryValue, createdByValue, blogTitleValie, blogIDValue;
    UserModel trendingPost_model;
    DiscusListAdapter adapter;
    Activity curr_activity;
    Context curr_context;
    User userData;
    private OUD_Viewmodel oud_Viewmodel;


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        binding = ActivityBlogCommentsBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        super.onCreate(savedInstanceState);


        if (getIntent().hasExtra( "BlogType" ) )
            BlogType = (String) getIntent().getSerializableExtra("BlogType");

        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        curr_activity = this;
        curr_context = this;
        userData = WritOnPreference.getInstance(curr_context).getUserDetails();


        if(!AppUtils.isNull( BlogType ) && BlogType.endsWith("cuuBlog")){
            currBlog = (Post_List_Data) getIntent().getSerializableExtra("BlogObject");
            showComments(currBlog);
        }
        else if(!AppUtils.isNull( BlogType ) && BlogType.endsWith("cuuBlogPersonal")){
            currBlogPersonal = (PersonalPost_List_Data) getIntent().getSerializableExtra("BlogObject");
            showCommentsPersonalBlog(currBlogPersonal);
        }
        else if ( getIntent().hasExtra( "BlogId" ) )
        {
            blogIDValue=getIntent().getStringExtra( "BlogId" );
            getDataFromApi( blogIDValue,userData.getId() );

        }else {
            trendingPost_model = (UserModel) getIntent().getSerializableExtra("BlogObject");
            assert trendingPost_model != null;
            categoryValue = String.format("%s, %s (%s)", trendingPost_model.getCategory(), trendingPost_model.getSubCat(), trendingPost_model.getLanguage());
            createdByValue = trendingPost_model.getUser_name();
            blogTitleValie = trendingPost_model.getTitle();
            blogIDValue = trendingPost_model.getBlogId();
            if(trendingPost_model.getUser_image() != null) {
                Picasso.get().load(trendingPost_model.getUser_image()).placeholder(R.drawable.usermale).into(binding.listImage);
            }
            IntegrateWriteCommentAPI(trendingPost_model.getBlogId());

            binding.TVCategory.setText(categoryValue);
            binding.TVUserName.setText(createdByValue);
            binding.TVTitle.setText(blogTitleValie);

            Objects.requireNonNull(getSupportActionBar()).hide();
            loadDiscussionData();
        }



        binding.backbutton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        MyApplication.getInstance().trackEvent("Comments", "Commenting", "User Comments");
        MyApplication.getInstance().trackScreenView("User Comments");

    }

    private void getDataFromApi(String blogID,String userId){

        AppUtils.ShowView( binding.indicator.progressBar,true );
        oud_Viewmodel.getBlogDetails(blogID,userId).subscribeOn( Schedulers.io()  )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<Posts_List>() {
                    @Override
                    public void accept(Posts_List posts_list) throws Exception {

                        if ( posts_list!=null )
                        {
                            AppUtils.ShowView( binding.indicator.progressBar,false );
                            if(posts_list.getData().get( 0 )!=null) {
                                currBlog=posts_list.getData().get( 0 );
                                showComments(currBlog);

                            }
                        }
                        else
                            getDataFromRoom(blogID);

                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        AppUtils.ShowView( binding.indicator.progressBar,false );
                        getDataFromRoom(blogID);
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
                                   AppUtils.ShowView( binding.indicator.progressBar,false );
                                   if(listData.getLongDescription()!=null) {
                                       currBlog=listData;
                                       showComments(listData);
                                   }
                                   else
                                       AppUtils.ShowView( binding.indicator.txtNoRecords,true );

                               }
                           }, new Consumer<Throwable>() {
                               @Override
                               public void accept(Throwable throwable) throws Exception {
                                   AppUtils.ShowView( binding.indicator.progressBar,false );
                                   AppUtils.ShowView( binding.indicator.txtNoRecords,true );
                               }
                           }
                );
    }

    private void showComments(Post_List_Data blog)
    {
        currBlog=blog;
        assert currBlog != null;
        categoryValue = String.format("%s, %s (%s)", currBlog.getCategory(), currBlog.getSubCat(), currBlog.getLanguage());
        createdByValue = currBlog.getUserName();

        blogTitleValie = currBlog.getTitle();
        blogIDValue = currBlog.getBlogId();
        if(currBlog.getUserImage() != null) {
            Picasso.get().load(currBlog.getUserImage()).placeholder(R.drawable.usermale).into(binding.listImage);
        }
        IntegrateWriteCommentAPI(currBlog.getBlogId());
        binding.TVCategory.setText(categoryValue);
        binding.TVUserName.setText(createdByValue);
        binding.TVTitle.setText(blogTitleValie);

        Objects.requireNonNull(getSupportActionBar()).hide();
        loadDiscussionData();
    }

    private void showCommentsPersonalBlog(PersonalPost_List_Data blog)
    {
        currBlogPersonal=blog;
        assert currBlogPersonal != null;
        categoryValue = String.format("%s, %s (%s)", currBlogPersonal.getCategory(), currBlogPersonal.getSubCat(), currBlogPersonal.getLanguage());
        createdByValue = currBlogPersonal.getUserImage();

        blogTitleValie = currBlogPersonal.getTitle();
        blogIDValue = currBlogPersonal.getBlogId();
        if(currBlogPersonal.getUserImage() != null) {
            Picasso.get().load(currBlogPersonal.getUserImage()).placeholder(R.drawable.usermale).into(binding.listImage);
        }
        IntegrateWriteCommentAPI(currBlogPersonal.getBlogId());
        binding.TVCategory.setText(categoryValue);
        binding.TVUserName.setText(createdByValue);
        binding.TVTitle.setText(blogTitleValie);

        Objects.requireNonNull(getSupportActionBar()).hide();
        loadDiscussionData();
    }

    private void IntegrateWriteCommentAPI(final String blogID) {
        binding.IVSend.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (binding.ETWriteComment.getText().toString().trim().length() < 2) {
                    binding.ETWriteComment.setError("Comment Text is to Short.");
                    binding.ETWriteComment.requestFocus();
                } else {
                    binding.IVSend.setVisibility(View.INVISIBLE);
                    binding.ETWriteComment.setError(null);
                    //callWriteBLogWebAPI(blogID);

                    if ( !AppUtils.isNull( currBlog ) )
                    oud_Viewmodel.updateCommentRoom(currBlog.getBlogId(),binding.ETWriteComment.getText().toString(),
                            currBlog.getUserId(),currBlog.getUserName(),currBlog.getTitle(),currBlog.getCommentsCount()+1);
                    else if ( !AppUtils.isNull( currBlogPersonal ) )
                    oud_Viewmodel.updateCommentRoom(currBlogPersonal.getBlogId(),binding.ETWriteComment.getText().toString(),
                            currBlogPersonal.getUserId(),currBlogPersonal.getUserName(),currBlogPersonal.getTitle(),currBlogPersonal.getCommentsCount()+1);

                    BlogComment comment = new BlogComment();
                    comment.setComment(binding.ETWriteComment.getText().toString());
                    comment.setUserId(userData.getId());
                    comment.setUserName(userData.getUsername()==null ? userData.getName() : userData.getUsername());
                    comment.setDateTime("Now");
                    trending_post.add(comment);
                    adapter.notifyDataSetChanged();
                    binding.ETWriteComment.setText("");
                    binding.IVSend.setVisibility(View.VISIBLE);
                }
            }
        });
    }




    ArrayList<BlogComment> trending_post;
    private void loadDiscussionData() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("BlogId", blogIDValue);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.comment_url, curr_context, false, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        JSONArray arrMainCategoryJson = jsonResponse.optJSONArray("data");
                        Type type = new TypeToken <ArrayList<BlogComment>>() {}.getType();
                        assert arrMainCategoryJson != null;
                        trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                        setAdapterData(trending_post);
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return null;
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }


    private void setAdapterData(ArrayList<BlogComment> blogComment){
        adapter = new DiscusListAdapter(curr_activity, curr_context, blogComment);
        LinearLayoutManager layoutManager = new LinearLayoutManager(curr_context);
        //layoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        binding.recyclerView1.setLayoutManager(layoutManager);
        binding.recyclerView1.setItemAnimator(new DefaultItemAnimator());
        binding.recyclerView1.setAdapter(adapter);
        binding.recyclerView1.getRootView();
        adapter.notifyDataSetChanged();

    }

    @Override
    public void onBackPressed() {
        if ( isTaskRoot() )
        {
            Intent home = new Intent(ActivityBlogComments.this, Home_Activity.class);
            startActivity(home);
            finish();
        }else
            super.onBackPressed();
    }
}
