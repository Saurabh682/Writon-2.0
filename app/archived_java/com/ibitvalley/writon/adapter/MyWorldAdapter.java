package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.media.Image;
import android.os.Bundle;
import android.text.Html;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.TextPaint;
import android.text.method.LinkMovementMethod;
import android.text.style.ClickableSpan;
import android.text.style.ForegroundColorSpan;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.Blog_Profile;
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.Report;
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.model.UserModel;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.squareup.picasso.Picasso;

import org.json.JSONException;
import org.json.JSONObject;
import org.w3c.dom.Text;

import java.util.ArrayList;
import java.util.HashMap;

import butterknife.BindView;
import butterknife.ButterKnife;
import de.hdodenhof.circleimageview.CircleImageView;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by  on 30-09-2016.
 */

public class MyWorldAdapter extends RecyclerView.Adapter<MyWorldAdapter.MyWorldViewHolder> {

    ArrayList<MyWorldModel> myWorldModels;
    SharedPreferences preferences;
    Typeface tf;
    Activity activity;
    Context context;
    MyWorldActionListener myWorldActionListener;
    public MyWorldAdapter(Activity activity , Context context , ArrayList<MyWorldModel> myWorldModels, MyWorldActionListener myWorldActionListener) {
        this.myWorldModels = myWorldModels;
        this.context = context;
        this.activity = activity;
        this.myWorldActionListener=myWorldActionListener;
    }

    @Override
    public MyWorldViewHolder onCreateViewHolder(ViewGroup parent , int viewType) {
        View itemView = LayoutInflater.from( parent.getContext() ).inflate(
                R.layout.myworld_list_item_view , parent , false );
        return new MyWorldViewHolder( itemView );
    }

    @Override
    public void onBindViewHolder(final MyWorldViewHolder holder , final int position) {
        MyWorldModel myWorldModel = myWorldModels.get( position );

        Picasso.get().load( myWorldModel.getUserImage() ).placeholder( R.drawable.usermale ).into(
                holder.thumbnail );
        String titleStr = myWorldModel.getUserName() + " " + getActionString( myWorldModel.getAction() );
        String descStr=getDescriptionString( myWorldModel.getAction(),myWorldModel);
        holder.txt_title.setText( titleStr );
        holder.txt_description.setText( descStr );

        if ( myWorldModel.getAction().equalsIgnoreCase( "followed" ) )
        {
            holder.txt_follow.setVisibility(  View.VISIBLE  );
            holder.img_action.setVisibility(  View.GONE  );
        }

        else
        {
            setActionImage(holder.img_action,myWorldModel.getAction());
            holder.img_action.setVisibility(  View.VISIBLE  );
            holder.txt_follow.setVisibility(  View.GONE  );
        }

        holder.txt_follow.setText( myWorldModel.isFollowed() ? "UN FOLLOW" : "FOLLOW" );

        holder.img_action.setImageDrawable( myWorldModel.getAction().equalsIgnoreCase( "rated" ) ?
                (myWorldModel.isRated() ? context.getResources().getDrawable( R.drawable.starnewselected ) : context.getResources().getDrawable( R.drawable.starblue )) :
                (myWorldModel.isBookmarked() ? context.getResources().getDrawable( R.drawable.bookmarknew ) : context.getResources().getDrawable( R.drawable.bookmarkblue )) );
        holder.txt_follow.setOnClickListener( new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                doAction(position,myWorldModel.getAction(),myWorldModel.getBlogId(),!myWorldModel.isFollowed(),myWorldModel.getOtherUserId(),myWorldModel.getOtherUserName(),myWorldModel.getTitle());
            }
        } );

        holder.img_action.setOnClickListener( new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                if (myWorldModel.getAction().equalsIgnoreCase( "rated" )  )
                    doAction(position,myWorldModel.getAction(),myWorldModel.getBlogId(),!myWorldModel.isRated(),myWorldModel.getOtherUserId(),myWorldModel.getOtherUserName(),myWorldModel.getTitle());
                else
                    myWorldActionListener.onClickBookmark( position,myWorldModel,!myWorldModel.isBookmarked() );

            }
        } );


        addClickableLink( titleStr , holder.txt_title , myWorldModel );
        addClickableLink( descStr , holder.txt_description , myWorldModel );

    }


    private void setActionImage(ImageView actionImage,String action)
    {
        if ( action.equalsIgnoreCase( "rated" ) )
            actionImage.setImageDrawable( context.getResources().getDrawable( R.drawable.starblue ) );
        else if (  action.equalsIgnoreCase( "bookmark" ) )
            actionImage.setImageDrawable( context.getResources().getDrawable( R.drawable.bookmarkblue ) );
        else if (  action.equalsIgnoreCase( "posted" ) )
            actionImage.setImageDrawable( context.getResources().getDrawable( R.drawable.bookmarkblue ) );
    }

    private String getActionString(String action) {
        if ( action.equalsIgnoreCase( "Followed" ) )
            return "has started following";
        else if ( action.equalsIgnoreCase( "posted" ) )
            return "has posted";
        else if ( action.equalsIgnoreCase( "bookmark" ) )
            return "has bookmarked";
        else if ( action.equalsIgnoreCase( "rated" ) )
            return "has rated";
        else
            return "-";
    }

    private String getDescriptionString(String action,MyWorldModel myWorldModel)
    {
        if ( action.equalsIgnoreCase( "Followed" ) )
            return myWorldModel.getOtherUserName();
        else
            return AppUtils.ifItsEmpty( myWorldModel.getTitle(),"-" )+" by " + myWorldModel.getOtherUserName();
    }

    private void addClickableLink(String str, TextView textView,MyWorldModel myWorldModel)
    {
        SpannableString ss = new SpannableString(str);

        if ( str.contains( myWorldModel.getUserName() ) )
        {
            int indx1=str.indexOf( myWorldModel.getUserName() );
            int indx2=str.indexOf(myWorldModel.getUserName(), indx1) + String.valueOf(myWorldModel.getUserName()).length();



            ss.setSpan(new ClickableSpan() {
                @Override
                public void onClick(View textView) {
                    goToProfile(myWorldModel.getUserId());
                }
                @Override
                public void updateDrawState(TextPaint ds) {
                    super.updateDrawState(ds);
                    ds.setUnderlineText(false);
                }
            }, indx1, indx2, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            ss.setSpan(new ForegroundColorSpan( ContextCompat.getColor(context, R.color.newBlue)), str.indexOf( myWorldModel.getUserName()), str.indexOf( myWorldModel.getUserName())+String.valueOf( myWorldModel.getUserName()).length(), 0);

        }

        if ( str.contains( myWorldModel.getOtherUserName() ) )
        {
            int indx3=str.indexOf( myWorldModel.getOtherUserName() );
            int indx4=str.indexOf(myWorldModel.getOtherUserName(), indx3) + String.valueOf(myWorldModel.getOtherUserName()).length();

            ss.setSpan(new ClickableSpan() {
                @Override
                public void onClick(View textView) {
                    goToProfile(myWorldModel.getOtherUserId());
                }
                @Override
                public void updateDrawState(TextPaint ds) {
                    super.updateDrawState(ds);
                    ds.setUnderlineText(false);
                }
            }, indx3, indx4, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            ss.setSpan(new ForegroundColorSpan( ContextCompat.getColor(context, R.color.newBlue)), str.indexOf( myWorldModel.getOtherUserName()), str.indexOf( myWorldModel.getOtherUserName())+String.valueOf( myWorldModel.getOtherUserName()).length(), 0);

        }


        if ( !AppUtils.isNull( myWorldModel.getTitle() ) &&  str.contains( myWorldModel.getTitle() ) )
        {
            int indx3=str.indexOf( myWorldModel.getTitle() );
            int indx4=str.indexOf(myWorldModel.getTitle(), indx3) + String.valueOf(myWorldModel.getTitle()).length();

            ss.setSpan(new ClickableSpan() {
                @Override
                public void onClick(View textView) {
                    goToBlog(myWorldModel.getBlogId(),myWorldModel.getOtherUserId());
                }
                @Override
                public void updateDrawState(TextPaint ds) {
                    super.updateDrawState(ds);
                    ds.setUnderlineText(false);
                }
            }, indx3, indx4, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            ss.setSpan(new ForegroundColorSpan( ContextCompat.getColor(context, R.color.newBlue)), str.indexOf( myWorldModel.getTitle()), str.indexOf( myWorldModel.getTitle())+String.valueOf( myWorldModel.getTitle()).length(), 0);

        }


        textView.setMovementMethod( LinkMovementMethod.getInstance());
        textView.setText( ss,TextView.BufferType.SPANNABLE );



    }

    private void doAction(int position,String action,String blogId,boolean follow,String userId,String username,String title)
    {
        myWorldActionListener.onClick(position, action, blogId, follow,userId, username,title);
    }

    private void goToProfile(String userId)
    {
        Intent blogprofile = new Intent(activity, Blog_Profile.class);
        blogprofile.putExtra("UserID", userId);
        activity.startActivity(blogprofile);
    }

    private void goToBlog(String blogId,String userId)
    {
        Intent blogprofile = new Intent(context, ShowBlogDetails.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("blogId", blogId);
        bundle.putSerializable("userId", userId);
        blogprofile.putExtras(bundle);
        blogprofile.putExtra("boxTitle", "MyWorld");
        activity.startActivity(blogprofile);
    }

    @Override
    public int getItemCount() {
        if (myWorldModels != null) {
            return myWorldModels.size();
        } else {
            return 0;
        }
    }


    public class MyWorldViewHolder extends RecyclerView.ViewHolder {

        @BindView( R.id.thumbnail )
        CircleImageView thumbnail;
        @BindView( R.id.txt_title )
        TextView txt_title;
        @BindView( R.id.txt_description )
        TextView txt_description;
        @BindView( R.id.txt_follow )
        TextView txt_follow;
        @BindView( R.id.img_action )
        ImageView img_action;

        public MyWorldViewHolder(View view) {
            super(view);
            ButterKnife.bind( this,view);

        }
    }

}

