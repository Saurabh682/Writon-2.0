package com.ibitvalley.writon.utils;

import android.app.Activity;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;

import com.ibitvalley.writon.BuildConfig;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.TinyDB;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;


import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public  class  AppUtils {

    private static final String TAG = "WriteOn";

    public static HashMap<String, ArrayList<String>> getCategoriesMap()
    {
        ArrayList<String> listDataHeader = new ArrayList<String>();
        LinkedHashMap<String,ArrayList<String>> listDataChild = new LinkedHashMap<String, ArrayList<String>>();

        // Adding child data
        listDataHeader.add("Short Stories");
        listDataHeader.add("Poetry");
        listDataHeader.add("Shayari");
        listDataHeader.add("Songs/ Jingles");
        listDataHeader.add("Jokes");
        listDataHeader.add("Reviews");
        listDataHeader.add("Blog");
        listDataHeader.add("Journalism");

        // Adding child data
        ArrayList<String> Stories = new ArrayList<String>();
        Stories.add("Crime");
        Stories.add("Children");
        Stories.add("Dark Fantasy");
        Stories.add("Fan Fiction");
        Stories.add("Fantasy");
        Stories.add("General Literary");
        Stories.add("Ghost Stories");
        Stories.add("Historical Fiction");
        Stories.add("Horror");
        Stories.add("Humour and Comedy");
        Stories.add("Macabre");
        Stories.add("Mystery");
        Stories.add("Romance");
        Stories.add("Scifi");
        Stories.add("Spy stories");
        Stories.add("Supernatural");
        Stories.add("Thriller");
        Stories.add("Travel");
        Stories.add("True Stories");
        Stories.add("War Stories");
        Stories.add("Young Adults");
        Stories.add("Other");


        ArrayList<String> Poetry = new ArrayList<String>();
        Poetry.add("Dramatic");
        Poetry.add("Children Rhymes");
        Poetry.add("Elegy");
        Poetry.add("Epic");
        Poetry.add("Light");
        Poetry.add("Lyric");
        Poetry.add("Narrative");
        Poetry.add("Prose");
        Poetry.add("Satirical");
        Poetry.add("Speculative");
        Poetry.add("Verse fable");
        Poetry.add("Other");





        ArrayList<String> Shayari = new ArrayList<String>();
        Shayari.add("2 Line Shayari");
        Shayari.add("Attitude");
        Shayari.add("Birthday");
        Shayari.add("Festival");
        Shayari.add("Friendship");
        Shayari.add("Funny");
        Shayari.add("Greetings");
        Shayari.add("Heart Ache");
        Shayari.add("Life");
        Shayari.add("Miss You");
        Shayari.add("Rain");
        Shayari.add("Romantic");
        Shayari.add("Sad");
        Shayari.add("Valentines Day");
        Shayari.add("Other");

        ArrayList<String> SongsJingles = new ArrayList<String>();
        SongsJingles.add("Avant-Garde");
        SongsJingles.add("Blues");
        SongsJingles.add("Celebration");
        SongsJingles.add("Children");
        SongsJingles.add("Classical");
        SongsJingles.add("Comedy/ Spoken");
        SongsJingles.add("Country");
        SongsJingles.add("Folk");
        SongsJingles.add("Festival");
        SongsJingles.add("Holiday");
        SongsJingles.add("New Age");
        SongsJingles.add("Pop/ Rock");
        SongsJingles.add("R and B");
        SongsJingles.add("Rap");
        SongsJingles.add("Reggae");
        SongsJingles.add("Religious ");
        SongsJingles.add("Other");





        ArrayList<String> Jokes = new ArrayList<String>();
        Jokes.add("Blond");
        Jokes.add("Family");
        Jokes.add("Marriage");
        Jokes.add("One line");
        Jokes.add("Profession");
        Jokes.add("Religion");
        Jokes.add("School/ College");
        Jokes.add("Sarcastic");
        Jokes.add("Other");


        ArrayList<String> Review = new ArrayList<String>();
        Review.add("Movies");
        Review.add("Travel");
        Review.add("Cars");
        Review.add("Food");
        Review.add("Games");
        Review.add("Other");



        ArrayList<String> PersonalBlog = new ArrayList<String>();
        PersonalBlog.add("Personal");
        PersonalBlog.add("Other");


        ArrayList<String> GeneralLet = new ArrayList<String>();
        GeneralLet.add("Business");
        GeneralLet.add("Environmental");
        GeneralLet.add("Fashion");
        GeneralLet.add("News");
        GeneralLet.add("Science");
        GeneralLet.add("Sports");
        GeneralLet.add("Supernatural");
        GeneralLet.add("Technology");
        GeneralLet.add("Other");


        listDataChild.put(listDataHeader.get(0), Stories); // Header, Child data
        //listDataChild.put(listDataHeader.get(1), Novel);
        listDataChild.put(listDataHeader.get(1), Poetry);
        listDataChild.put(listDataHeader.get(2), Shayari);
        listDataChild.put(listDataHeader.get(3), SongsJingles);
        listDataChild.put(listDataHeader.get(4), Jokes);
        listDataChild.put(listDataHeader.get(5), Review);
        listDataChild.put(listDataHeader.get(6), PersonalBlog);
        listDataChild.put(listDataHeader.get(7), GeneralLet);


        return listDataChild;

    }

    public static ArrayList<String> getCategoryList(HashMap<String,ArrayList<String>> hashMap)
    {
        ArrayList<String> listDataHeader=new ArrayList<>(  );
        for (Map.Entry<String,ArrayList<String>> map:hashMap.entrySet())
        {
            listDataHeader.add( map.getKey() );
        }

        return listDataHeader;
    }

//    public static Target createTarget(Activity activity, ViewGroup spotView, Spotlight spotlight, TinyDB tinydb)
//    {
//        //first target
//        int [] firstTargetLocation=new int[2];
//        spotView.getLocationInWindow( firstTargetLocation );
//        Float firstTargetX=firstTargetLocation[0]+spotView.getWidth()/2f;
//        Float firstTargetY=(firstTargetLocation[1]+spotView.getHeight()/2f)-50;
//        FrameLayout firstRoot=new FrameLayout( activity );
//
//        View first=activity.getLayoutInflater().inflate( R.layout.layout_target, firstRoot );
//        TextView txtSkip=first.findViewById( R.id.txt_skip );
//        txtSkip.setOnClickListener( new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                tinydb.putBoolean( "finished_tutorial",true );
//                spotlight.finish();
//            }
//        } );
//        ImageView firstarrow1=first.findViewById( R.id.arrow1 );
//        firstarrow1.setVisibility( View.VISIBLE );
//        TextView customText=first.findViewById( R.id.custom_text );
//        customText.setText( activity.getResources().getString( R.string.tutorial_list ) );
//
//        Target firstTarget= new Target.Builder()
//                .setAnchor(firstTargetX,firstTargetY)
//                .setShape(new Circle(100f, TimeUnit.MILLISECONDS.toMillis(500),new DecelerateInterpolator(2f)))
//                .setOverlay(first).build();
//        Button btnOk=first.findViewById( R.id.btn_ok );
//
//        btnOk.setOnClickListener( new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                spotlight.next();
//
//            }
//        } );
//    }

    public static void avoidMultipleClicks(final View v) {
        if (v == null) {
            return;
        }
        v.setEnabled(false);
        v.postDelayed(new Runnable() {
            @Override
            public void run() {
                v.setEnabled(true);

            }
        },1500);

    }

    public static void hideKeyboard(Activity activity) {
        View view = activity.findViewById(android.R.id.content);
        if (view != null) {
            InputMethodManager imm =
                    (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
        }
    }

    public static boolean isInternetAvailable(Context context) {
        ConnectivityManager connectivityManager
                = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }


    public static void fcm_noti_single(String OtherUserID,String functionType, String userName, String postTitle) {
        String tp="";
        String sp="";
        String action="";
        switch (functionType) {
            case "bookmark":
                //urlExt = userData2.getId()+"&sp="+userData2.getUsername()+" has bookmarked a post. &tp="+bTitle+" has been bookmarked by "+userData2.getUsername();
                tp = postTitle+" has been bookmarked by "+userName;
                sp = userName+" has bookmarked a post.";
                action="3";
                break;
            case "follow":
                //urlExt = userData.getId() + "&sp=You are getting noticed&tp=" + userData2.getUsername() + " has started following you. Keep up your writing";
                tp = userName + " has started following you. Keep up your writing" ;
                sp = "You are getting noticed";
                action="1";
                break;
            case "rate":
                //urlExt = userData.getId() + "&sp=People are liking your post&tp=" + bTitle + " has been rated by " + userData2.getUsername();
                tp = postTitle + " has been rated by " + userName;
                sp = "People are liking your post";
                action="3";
                break;
            case "comment":
                //urlExt = userData.getId() + "&sp=People are liking your post&tp=" + bTitle + " has been rated by " + userData2.getUsername();
                tp = "Respond to "+userName.trim()+"'s comment";
                sp = userName + " has commented on " + postTitle;
                action="2";
                break;


        }

        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        Call<String> call = PostList.fcm_noti_single(OtherUserID,tp,sp,action);

        call.enqueue(new Callback<String>() {
            @Override
            public void onResponse(@NonNull Call<String> call, @NonNull Response<String> response) {
                assert response.body() != null;
                Log.i(TAG, "onResponse FCM Single: " + response.body());
            }

            @Override
            public void onFailure(@NonNull Call <String> call, @NonNull Throwable t) {
                String message = t.toString();
                Log.d(TAG,"UnSuccessful >>"+ message);
            }
        });
//        }

    }

    public static void fcm_noti_Multi(String userId,String functionType,String userName,  String writerName, String postTitle,String blogId,String otherUserId) {
        String tp="";
        String sp="";
        String action="";
        switch (functionType) {
            case "bookmark":
                //urlExt = userData.getId() + "&sp=Your post is getting popular&tp=" + bTitle + " has been bookmarked by " + userData2.getUsername();
                tp = postTitle + " has been bookmarked by " + userName;
                sp = "Always bookmark your favourite post.";
                action="3";
                break;
            case "follow":
                //urlExt = userData.getId() + "&sp=You are getting noticed&tp=" + userData2.getUsername() + " has started following you. Keep up your writing";
                tp = userName+ " has started following " + writerName ;
                sp = "Follow your favourite Writer/Creator to stay updated";
                action="1";
                break;
            case "rate":
                //urlExt = userData.getId() + "&sp=People are liking your post&tp=" + bTitle + " has been rated by " + userData2.getUsername();
                tp = writerName + "'s Post \"" + postTitle + "\" has been rated by " + userName;
                sp = "Show your support by rating the post that you liked. It helps the writer.";
                action="3";
                break;
            case "comment":
                //urlExt = userData.getId() + "&sp=People are liking your post&tp=" + bTitle + " has been rated by " + userData2.getUsername();
                tp = "Discuss/Comment to express your thoughts.";
                sp = userName + " has commented on " + postTitle;
                action="2";
                break;
        }

//        if ( !BuildConfig.DEBUG ) {
            RetroFitClient PostList = ServiceGenerator.getRetrofit().create( RetroFitClient.class );

            Call<String> call = PostList.fcm_noti_multiuser( userId , tp , sp,functionType,blogId,otherUserId,action );

            call.enqueue( new Callback<String>() {
                @Override
                public void onResponse(@NonNull Call<String> call , @NonNull Response<String> response) {
                    assert response.body() != null;
                    //Log.d("Success1", response.body().getData().get(0).getUserName());
                    Log.i( TAG , "onResponse FCM Multi: " + response.body() );
                }

                @Override
                public void onFailure(@NonNull Call<String> call , @NonNull Throwable t) {
                    String message = t.toString();
                    Log.d( TAG , "UnSuccessful >>" + message );
                }
            } );
//        }
    }

    public static void registerFcm(Context context,String token){
        // ...
        User userData = WritOnPreference.getInstance(context).getUserDetails();

        RetroFitClient fcmService = ServiceGenerator.getRetrofit().create( RetroFitClient.class );
        fcmService.registerFcm( userData.getId()==null? userData.getuId() : userData.getId() ,token ).subscribeOn(
                Schedulers.io() ).observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<String>() {
                    @Override
                    public void accept(String s) throws Exception {
                        Log.d( "Register Fcm","Success" );
                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        Log.d( "Register Fcm","failed" );
                    }
                } );

    }

    public static void ShowView(View view,boolean showView)
    {
        view.setVisibility( showView? View.VISIBLE: View.GONE );
    }

    public static boolean isNull(Object object) {
        return object == null;
    }

    public static String ifItsEmpty(String s, String the) {
        return (s == null) ? the : (s.isEmpty()) ? the : s;
    }
}
