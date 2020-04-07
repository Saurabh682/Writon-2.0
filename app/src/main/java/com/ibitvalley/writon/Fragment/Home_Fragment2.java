package com.ibitvalley.writon.Fragment;

import android.Manifest;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.Html;
import android.util.Log;
import android.view.InflateException;
import android.view.LayoutInflater;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.EditText;
import android.widget.GridView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.NetworkResponse;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.Blog_Profile;
import com.ibitvalley.writon.Constants;
import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.LoginActivity;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.DiscusListAdapter;
import com.ibitvalley.writon.adapter.GridViewAdapter;
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.adapter.ShortStoryAdapter;
import com.ibitvalley.writon.constants.PrefrenceConstants;
import com.ibitvalley.writon.discus;
import com.ibitvalley.writon.model.AvtarUtil;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.Const;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebApiParams;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.multipart.VolleyMultipartRequest;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import de.hdodenhof.circleimageview.CircleImageView;

import static android.app.Activity.RESULT_CANCELED;
import static android.app.Activity.RESULT_OK;
import static android.content.Context.MODE_PRIVATE;
import static com.facebook.FacebookSdk.getApplicationContext;
import static com.ibitvalley.writon.model.AvtarUtil.getAvtarData;
import static com.ibitvalley.writon.model.AvtarUtil.getAvtarDrawableByType;
import com.ibitvalley.writon.webapi.multipart.VolleyMultipartRequest;
import com.squareup.picasso.Picasso;

/**
 * Created by Android_PC on 10-08-2016.
 */

public class Home_Fragment2 extends Fragment implements View.OnClickListener {

    private View rootView;
    private TextView  TVPubCount, TVFollowers, TVFollowing, tv_about, tv_posted, tv_discussion;
    private EditText TVname, ETQofDay, ETIntro, ETWorkiingon;
    private SharedPreferences preferences;
    private CircleImageView image;
    private ImageView IVEdit;
    private ImageView TVCi;
    int isEdit = 0;
    Context curr_context;
    private Typeface tf;

    private RecyclerView recyclerView1, recview_discussion;
    private LinearLayout ll_about, ll_posted, ll_discussion, ll_contactus;
    private DiscusListAdapter adapter;

    private User userData;
    private String [] permissions = {"android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.ACCESS_FINE_LOCATION", "android.permission.SYSTEM_ALERT_WINDOW","android.permission.CAMERA"};



    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable final ViewGroup container, @Nullable Bundle savedInstanceState) {

        if (rootView != null) {
            ViewGroup parent = (ViewGroup) rootView.getParent();
            if (parent != null)
                parent.removeView(rootView);
        }
        try {

            userData = WritOnPreference.getInstance(curr_context).getUserDetails();
            rootView = inflater.inflate(R.layout.homr_fragment2, container, false);
            assert container != null;
            curr_context = container.getContext();
            int requestCode = 200;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                requestPermissions(permissions, requestCode);
            }

            tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
            preferences = Objects.requireNonNull(getContext()).getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);

            final String UserId = preferences.getString(Constants.KEY_PREF_USERID, "0");

            TVname = (EditText) rootView.findViewById(R.id.TVname);
            TVname.setTypeface(tf);
            ETQofDay = (EditText) rootView.findViewById(R.id.ETQofDay);
            ETQofDay.setTypeface(tf);
            ETIntro = (EditText) rootView.findViewById(R.id.ETIntro);
            ETIntro.setTypeface(tf);
            ETWorkiingon = (EditText) rootView.findViewById(R.id.ETWorkiingon);
            ETWorkiingon.setTypeface(tf);
            TVname.setEnabled(false);
            ETQofDay.setEnabled(false);
            ETIntro.setEnabled(false);
            ETWorkiingon.setEnabled(false);


            tv_about = (TextView) rootView.findViewById(R.id.tv_about);
            tv_posted = (TextView) rootView.findViewById(R.id.tv_posted);
            tv_discussion = (TextView) rootView.findViewById(R.id.tv_discussion);

            ll_about = (LinearLayout) rootView.findViewById(R.id.ll_about);
            ll_posted = (LinearLayout) rootView.findViewById(R.id.ll_posted);
            ll_discussion = (LinearLayout) rootView.findViewById(R.id.ll_discussion);
            ll_contactus = (LinearLayout) rootView.findViewById(R.id.ll_contactus);

            recyclerView1 = (RecyclerView) rootView.findViewById(R.id.recyclerView1);
            recview_discussion = (RecyclerView) rootView.findViewById(R.id.recview_discussion);
            TVCi = (ImageView) rootView.findViewById(R.id.TVCi);



            tv_about.setTextColor(Color.parseColor("#2196f3"));
            tv_about.setText(Html.fromHtml("<u>About</u>"));


            tv_about.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    tv_about.setTextColor(Color.parseColor("#2196f3"));
                    tv_about.setText(Html.fromHtml("<u>About</u>"));

                    //

                    tv_posted.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_posted.setText(Html.fromHtml("Posted"));
                    tv_discussion.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_discussion.setText(Html.fromHtml("Discussion"));

                    //

                    ll_about.setVisibility(View.VISIBLE);
                    ll_posted.setVisibility(View.GONE);
                    ll_discussion.setVisibility(View.GONE);
                }
            });


            tv_posted.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    tv_posted.setTextColor(Color.parseColor("#2196f3"));
                    tv_posted.setText(Html.fromHtml("<u>Posted</u>"));

                    //
                    tv_about.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_about.setText(Html.fromHtml("About"));
                    tv_discussion.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_discussion.setText(Html.fromHtml("Discussion"));

                    //

                    ll_about.setVisibility(View.GONE);
                    ll_discussion.setVisibility(View.GONE);
                    ll_posted.setVisibility(View.VISIBLE);

                    loadTrendingPost();
                }
            });

            tv_discussion.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    tv_discussion.setTextColor(Color.parseColor("#2196f3"));
                    tv_discussion.setText(Html.fromHtml("<u>Discussion</u>"));

                    //

                    tv_about.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_about.setText(Html.fromHtml("About"));
                    tv_posted.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_posted.setText(Html.fromHtml("Posted"));


                    ll_discussion.setVisibility(View.VISIBLE);
                    ll_about.setVisibility(View.GONE);
                    ll_posted.setVisibility(View.GONE);

                    loadDiscussionData();
                }
            });


            Button btnLogout = (Button) rootView.findViewById(R.id.btnLogout);
            btnLogout.setTypeface(tf);
            TVPubCount = (TextView) rootView.findViewById(R.id.TVPubCount);
            TVFollowers = (TextView) rootView.findViewById(R.id.TVFollowers);
            TVFollowing = (TextView) rootView.findViewById(R.id.TVFollowing);
            image = (CircleImageView) rootView.findViewById(R.id.image);
            IVEdit = (ImageView) rootView.findViewById(R.id.IVEdit);
            IVEdit.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //Intent intentSearch = new Intent(container.getContext(), EditProfile.class);
                    //startActivity(intentSearch);
                    if(isEdit ==0) {
                        IVEdit.setImageResource(R.drawable.ic_check_black_24dp);
                        isEdit = 1;
                        //TVname.setEnabled(true);

                        ETQofDay.setEnabled(true);
                        ETIntro.setEnabled(true);
                        ETWorkiingon.setEnabled(true);
                        ETQofDay.setSelection(ETQofDay.getText().length());
                        ETQofDay.setFocusable(true);
                        ETQofDay.requestFocus();

                        image.setOnClickListener(new View.OnClickListener() {
                            @Override
                            public void onClick(View v) {
                                showAvtarSelectorPopup();
                            }
                        });
                    } else if(isEdit ==1)
                    {
                        IVEdit.setImageResource(R.drawable.ic_edit);
                        //TVname.setEnabled(false);
                        ETQofDay.setEnabled(false);
                        ETIntro.setEnabled(false);
                        ETWorkiingon.setEnabled(false);

                        updateInfo(UserId, ETQofDay.getText().toString().trim(), ETIntro.getText().toString().trim(), ETWorkiingon.getText().toString().trim(), selectedAvtarType);
                        isEdit = 0;
                    }

                }
            });
            ImageView IVSeeting = (ImageView) rootView.findViewById(R.id.IVSeeting);
            IVSeeting.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showPopupMenu(v);
                }
            });

            btnLogout.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    logout();
                }
            });
            //requestUserDetails(UserId);

        } catch (InflateException e) {
        }
        initilize();
        getUserProfile();





        ll_contactus.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String mailto = "mailto:help@writon.co"+
                        "?subject=" + Uri.encode("From:: "+userData.getUsername()+"");
                Intent emailIntent = new Intent(Intent.ACTION_SENDTO);
                emailIntent.setData(Uri.parse(mailto));
                startActivity(emailIntent);
            }
        });


        TVCi.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                selectImage(getContext());
            }
        });



        return rootView;
    }


    private void loadTrendingPost() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", "1");
        hmHomeParam.put("UserID", userData.getId());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.published_Post, curr_context, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<Blog>>() {}.getType();
                            ArrayList<Blog> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            displayLTrendingPost(trending_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }


    MyBlogAdapter myBlogAdapter;
    private void displayLTrendingPost(ArrayList<Blog> trendingBlog){
        myBlogAdapter = new MyBlogAdapter(getActivity(), getContext(), trendingBlog, "Latest");
        LinearLayoutManager layoutManager = new LinearLayoutManager(curr_context);
        recyclerView1.setLayoutManager(layoutManager);
        recyclerView1.setAdapter(myBlogAdapter);
        myBlogAdapter.notifyDataSetChanged();

    }




    // Fetching Trending Post

    private void loadDiscussionData() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("userid", userData.getId());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.discussions_action, curr_context, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONArray arrMainCategoryJson = jsonResponse.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<BlogComment>>() {}.getType();
                            ArrayList<BlogComment> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            setAdapterData(trending_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }


    private void setAdapterData(ArrayList<BlogComment> blogComment){
        adapter = new DiscusListAdapter(getActivity(), getContext(), blogComment);
        recview_discussion.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(curr_context);
        layoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recview_discussion.setLayoutManager(layoutManager);
        recview_discussion.setItemAnimator(new DefaultItemAnimator());
        recview_discussion.setAdapter(adapter);
        adapter.notifyDataSetChanged();

    }

    private void getUserProfile(){

        HashMap<String, String> hmUserProfileParams = WebApiParams.getyserProfileParam(userData.getId());

            SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.user_profile, curr_context, false, hmUserProfileParams, new OnResponseListener() {
                @Override
                public void onSuccess(Object result) {
                    try {
                        JSONObject jsonResponse = new JSONObject(result.toString());
                        if (jsonResponse != null) {
                            Integer status = jsonResponse.getInt("success");
                            if (status == 1) {
                                JSONObject userData = jsonResponse.getJSONObject("data");

                                setUserData(userData);

                            }else{
                                String message = jsonResponse.getString("message");
                                Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                                if(status == -1){
                                    logout();
                                }
                            }
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
                @Override
                public void onError(VolleyError error) {
                    Log.d("","");
                }
            });
            VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }



    private void setUserData(JSONObject jsonobject) throws JSONException {

        //JSONObject jsonobject= (JSONObject) userData.get(0);
        TVname.setText(jsonobject.get("name").toString());
        TVPubCount.setText(jsonobject.get("published_count").toString());
        TVFollowers.setText(jsonobject.get("followers_count").toString());
        TVFollowing.setText(jsonobject.get("following_count").toString());

        if (!jsonobject.get("QuoteofDay").toString().equals("null")) {
            ETQofDay.setText(jsonobject.get("QuoteofDay").toString());
        } else {
            ETQofDay.setText("");
        }

        if (!jsonobject.get("Introducation").toString().equals("null")) {
            ETIntro.setText(jsonobject.get("Introducation").toString());
        } else {
            ETIntro.setText("");
        }

        if (!jsonobject.get("WorkingOn").toString().equals("null")) {
            ETWorkiingon.setText(jsonobject.get("WorkingOn").toString());
        } else {
            ETWorkiingon.setText("");
        }

        int aCode = Integer.parseInt(jsonobject.get("AvatorCode").toString());
        selectedAvtarType = aCode;
        //image.setImageResource(AvtarUtil.getAvtarDrawableByType(aCode));

        if (!jsonobject.get("image_url").toString().equals("null")) {
            Picasso.get().load(jsonobject.get("image_url").toString()).placeholder(R.drawable.usermale).into(image);
        }
    }


    private void selectImage(Context context) {
        final CharSequence[] options = { "Take Photo", "Choose from Gallery","Cancel" };

        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle("Choose your profile picture");

        builder.setItems(options, new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface dialog, int item) {

                if (options[item].equals("Take Photo")) {
                    Intent takePicture = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
                    startActivityForResult(takePicture, 0);
                } else if (options[item].equals("Choose from Gallery")) {
                    Intent pickPhoto = new Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
                    startActivityForResult(pickPhoto , 1);
                } else if (options[item].equals("Cancel")) {
                    dialog.dismiss();
                }
            }
        });
        builder.show();
    }

    private void logout() {
        SharedPreferences preferences = getActivity().getSharedPreferences("mPrefs", MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(Constants.KEY_PREF_USERID, "");
        editor.putString(Constants.KEY_PREF_U_NAME, "");
        editor.putString(Constants.KEY_PREF_U_EMAIL, "");
        editor.putString(Constants.KEY_PREF_U_DOB, "");

        // New Changes...(01-11-2016)
        editor.putString(Constants.KEY_PREF_WORKINGON, "");
        editor.putString(Constants.KEY_PREF_INTRO, "");
        editor.putString(Constants.KEY_PREF_QUOTEOFDAY, "");
        editor.putString(Constants.KEY_PREF_FOLLOWINGCOUNT, "");
        editor.putString(Constants.KEY_PREF_FOLLOWERCOUNT, "");
        editor.putString(Constants.KEY_PREF_BLOGPUBLISHCOUNT, "");
        editor.commit();


        SharedPreferences.Editor editorClear = getActivity().getSharedPreferences(PrefrenceConstants.KEY_USER_JSON_DETAILS, 0).edit();
        editorClear .clear();
        editorClear.apply();

        Intent intent = new Intent(getActivity(), LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        getActivity().startActivity(intent);
        getActivity().finish();
    }


    private void initilize() {
    }

    @Override
    public void onClick(View v) {
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                getActivity().onBackPressed();
        }
        return super.onOptionsItemSelected(item);
    }



    /**
     * Showing popup menu when tapping on 3 dots
     */


    private void showPopupMenu(View view) {
        AlertDialog.Builder builderSingle = new AlertDialog.Builder(curr_context);
        builderSingle.setNegativeButton(
                "cancel",
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        dialog.dismiss();
                    }
                });

           // inflate menu
        PopupMenu popup = new PopupMenu(curr_context, view);
        MenuInflater inflater = popup.getMenuInflater();
        inflater.inflate(R.menu.menu_album, popup.getMenu());
        popup.setOnMenuItemClickListener(new MyMenuItemClickListener());
        popup.show();

    }


    /**
     * Click listener for popup menu items
     */
    class MyMenuItemClickListener implements PopupMenu.OnMenuItemClickListener {

        //Blog blog;

        public MyMenuItemClickListener() {
            //this.blog = blog;
        }

        @Override
        public boolean onMenuItemClick(MenuItem menuItem) {
            switch (menuItem.getItemId()) {
                case R.id.action_change_password:
                    showAlertDialog();
                    Toast.makeText(curr_context, "Change Password", Toast.LENGTH_SHORT).show();
                    return true;
                case R.id.action_help:
                    return true;
                case R.id.action_logout:
                    logout();
                    return true;
                default:
            }
            return false;
        }
    }


    //  ProfileUpdate//


    private void updateInfo1(final String UserID, final String QuoteofDay, final String Introducation, final String WorkingOn, final  int AvatorCode) {
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(curr_context);
        dialog.setMessage("Please wait...");
        dialog.show();
        requestQueue = Volley.newRequestQueue(curr_context);
        StringRequest jor = new StringRequest(Request.Method.POST, String.format("%s%s", Const.BASE_URL, "UpdateProfile"),
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        dialog.dismiss();
                        Log.d("True", "");
                        try {
                            JSONObject jsonObject = new JSONObject(response);
                            if (jsonObject.get("success").toString() == "true") {
                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                                SharedPreferences.Editor editor = preferences.edit();
                                editor.putString(Constants.KEY_PREF_QUOTEOFDAY, QuoteofDay);
                                editor.putString(Constants.KEY_PREF_WORKINGON, WorkingOn);
                                editor.putString(Constants.KEY_PREF_INTRO, Introducation);
                                editor.putString(Constants.KEY_PREF_U_AVATOR_CODE, String.valueOf(selectedAvtarType));
                                editor.commit();

                            } else {
                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                            }
                        } catch (JSONException ex) {
                            //progress.dismiss();
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dialog.dismiss();
                        Log.e("Volley", "Error");
                    }
                }
        ) {
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                HashMap<String, String> params = new HashMap<>();
                params.put("UserID", UserID);
                params.put("QuoteofDay", QuoteofDay);
                params.put("Introducation", Introducation);
                params.put("WorkingOn", WorkingOn);
                params.put("AvatorCode", String.valueOf(AvatorCode));
                return params;
            }
        };
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }



    private void updateInfo(final String UserID, final String QuoteofDay, final String Introducation, final String WorkingOn, final  int AvatorCode) {

        HashMap<String, String> hmUserProfileParams = WebApiParams.getyserProfileParam(userData.getId());

        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.user_update_profile, curr_context, false, hmUserProfileParams, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject userData = jsonResponse.getJSONObject("data");
                            setUserData(userData);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                            if(status == -1){
                                logout();
                            }
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }





    int selectedAvtarType = 0;

    private void showAvtarSelectorPopup() {
        final AlertDialog.Builder builder = new AlertDialog.Builder(curr_context);
        final View dialogVIew = getActivity().getLayoutInflater().inflate(R.layout.dialog_avtar_view, null);
        builder.setView(dialogVIew);
        GridView gridView = (GridView) dialogVIew.findViewById(R.id.gridView);
        GridViewAdapter gridAdapter = new GridViewAdapter(curr_context, R.layout.list_item_avtargrid, getAvtarData());
        gridView.setAdapter(gridAdapter);
        builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
            }
        });
        final AlertDialog dialog = builder.create();
//        gridView.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
//            @Override
//            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
//                dialog.dismiss();
//                selectedAvtarType = position + 1;
//                avatarImageView.setImageResource(getAvtarDrawableByType(selectedAvtarType));
//            }
//            @Override
//            public void onNothingSelected(AdapterView<?> parent) {
//
//            }
//        });


        gridView.setOnItemClickListener(new AdapterView.OnItemClickListener() {

            @Override
            public void onItemClick(AdapterView<?> parent, View view,
                                    int position, long id) {
                // TODO Auto-generated method stub
                dialog.dismiss();
                selectedAvtarType = position;
                image.setImageResource(getAvtarDrawableByType(selectedAvtarType));

            }
        });
        dialog.show();
    }

    // Change Password Dialog..........................

    private void showAlertDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(curr_context);
        View dialogView = getActivity().getLayoutInflater().inflate(R.layout.dialog_changepassword, null);
        TextView btnOk = (TextView) dialogView.findViewById(R.id.btnOk);
        TextView btnCancel = (TextView) dialogView.findViewById(R.id.btnCancel);
        final EditText et_oldpassword = (EditText) dialogView.findViewById(R.id.et_oldpassword);
        final EditText et_newpassword = (EditText) dialogView.findViewById(R.id.et_newpassword);

        builder.setView(dialogView);
        final AlertDialog dialog = builder.create();
        btnCancel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialog.dismiss();
            }
        });
        btnOk.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                et_oldpassword.setError(null);
                et_newpassword.setError(null);
                if (et_oldpassword.getText().toString().trim().length() > 4 && et_newpassword.getText().toString().trim().length() > 4) {

                    final ProgressDialog Pdialog = new ProgressDialog(curr_context);
                    Pdialog.setMessage("Logging, Please wait...");
                    Pdialog.show();

                    HashMap<String, String> hmHomeParam = new HashMap <>();
                    hmHomeParam.put("UserID", userData.getId());
                    hmHomeParam.put("OldPassword", et_oldpassword.getText().toString());
                    hmHomeParam.put("NewPassword", et_newpassword.getText().toString());
                    SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.chanhe_password, curr_context, false, hmHomeParam, new OnResponseListener() {
                        @Override
                        public void onSuccess(Object result) {
                            try {
                                JSONObject jsonResponse = new JSONObject(result.toString());
                                if (jsonResponse != null) {
                                    Integer status = jsonResponse.getInt("success");
                                    if (status == 1) {
                                        Intent home = new Intent(curr_context, LoginActivity.class);
                                        home.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
                                        startActivity(home);

                                    }else{
                                        String message = jsonResponse.getString("message");
                                        Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                                    }
                                }
                            } catch (JSONException e) {
                                e.printStackTrace();
                            }
                        }
                        @Override
                        public void onError(VolleyError error) {
                            Log.d("","");
                        }
                    });
                    VolleySingleton.getInstance().addToRequestQueue(mainCategory);




                } else {
                    et_oldpassword.setError("Please Enter a Valid Password.");
                    et_oldpassword.requestFocus();

                    //et_newpassword.setError("Please Enter a Valid Email.");
                    //et_newpassword.requestFocus();


                }
            }
        });
        dialog.show();
    }








    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if(resultCode != RESULT_CANCELED) {
            switch (requestCode) {
                case 0:
                    if (resultCode == RESULT_OK && data != null) {
                        Bitmap selectedImage = (Bitmap) data.getExtras().get("data");
                        image.setImageBitmap(selectedImage);
                        uploadBitmap(selectedImage);
                    }

                    break;
                case 1:
                    if (resultCode == RESULT_OK && data != null) {
                        Uri selectedImage =  data.getData();
                        String[] filePathColumn = {MediaStore.Images.Media.DATA};
                        if (selectedImage != null) {
                            try{
                                Cursor cursor = getActivity().getContentResolver().query(selectedImage,
                                        filePathColumn, null, null, null);
                                if (cursor != null) {
                                    cursor.moveToFirst();

                                    int columnIndex = cursor.getColumnIndex(filePathColumn[0]);
                                    String picturePath = cursor.getString(columnIndex);
                                    BitmapFactory.Options Options = new BitmapFactory.Options();
                                    Options.inSampleSize = 4;
                                    Options.inJustDecodeBounds = false;
                                    image.setImageBitmap(BitmapFactory.decodeFile(picturePath, Options));
                                    cursor.close();
                                    uploadBitmap(BitmapFactory.decodeFile(picturePath));
                                }
                            }catch (Exception ex){

                            }
                        }

                    }
                    break;
            }
        }
    }




    private void uploadBitmap(final Bitmap bitmap) {

        //getting the tag from the edittext
        //final String tags = editTextTags.getText().toString().trim();

        //our custom volley request
        VolleyMultipartRequest volleyMultipartRequest = new VolleyMultipartRequest(curr_context, Request.Method.POST, WebConstants.upload_profile_pic_url,
                new Response.Listener<NetworkResponse>() {
                    @Override
                    public void onResponse(NetworkResponse response) {
                        try {
                            JSONObject obj = new JSONObject(new String(response.data));
                            getUserProfile();
                            //Toast.makeText(getApplicationContext(), obj.getString("message"), Toast.LENGTH_SHORT).show();
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Toast.makeText(getApplicationContext(), error.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }) {

            /*
             * If you want to add more parameters with the image
             * you can do it here
             * here we have only one parameter with the image
             * which is tags
             * */
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                Map<String, String> params = new HashMap<>();
                params.put("tags", "WritOn");
                return params;
            }

            /*
             * Here we are passing image by renaming it with a unique name
             * */
            @Override
            protected Map<String, DataPart> getByteData() {
                Map<String, DataPart> params = new HashMap<>();
                long imagename = System.currentTimeMillis();
                params.put("image", new DataPart(imagename + ".png", getFileDataFromDrawable(bitmap)));
                return params;
            }
        };

        //adding the request to volley
        Volley.newRequestQueue(getContext()).add(volleyMultipartRequest);
    }


    public byte[] getFileDataFromDrawable(Bitmap bitmap) {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 80, byteArrayOutputStream);
        return byteArrayOutputStream.toByteArray();
    }















}

