//package com.ibitvalley.writon.adapter;
//
//import android.app.Activity;
//import android.app.ProgressDialog;
//import android.content.Context;
//import android.content.DialogInterface;
//import android.content.Intent;
//import android.content.SharedPreferences;
//import android.text.Html;
//import android.util.Log;
//import android.view.LayoutInflater;
//import android.view.View;
//import android.view.ViewGroup;
//import android.widget.ArrayAdapter;
//import android.widget.ImageView;
//import android.widget.TextView;
//import android.widget.Toast;
//
//import androidx.appcompat.app.AlertDialog;
//import androidx.core.content.ContextCompat;
//import androidx.recyclerview.widget.RecyclerView;
//
//import com.android.volley.AuthFailureError;
//import com.android.volley.DefaultRetryPolicy;
//import com.android.volley.Request;
//import com.android.volley.RequestQueue;
//import com.android.volley.Response;
//import com.android.volley.VolleyError;
//import com.android.volley.toolbox.StringRequest;
//import com.android.volley.toolbox.Volley;
//import com.ibitvalley.writon.Blog_Profile;
//import com.ibitvalley.writon.R;
//import com.ibitvalley.writon.Report;
//import com.ibitvalley.writon.ShowBlog;
//import com.ibitvalley.writon.model.AvtarUtil;
//import com.ibitvalley.writon.model.Blog;
//import com.ibitvalley.writon.model.User;
//import com.ibitvalley.writon.utils.Const;
//import com.ibitvalley.writon.utils.WritOnPreference;
//
//import org.json.JSONException;
//import org.json.JSONObject;
//
//import java.util.ArrayList;
//import java.util.HashMap;
//import java.util.Map;
//
//import de.hdodenhof.circleimageview.CircleImageView;
//
//import static android.content.Context.MODE_PRIVATE;
//
//
//
//public class CategoryBlogAdapter extends RecyclerView.Adapter<CategoryBlogAdapter.ImagecategoryViewHolder> {
//    private Context curr_context;
//    private Activity curr_activity;
//    ArrayList<Blog> arrappliedjob;
//    private String bTitle, notifyUser , username;
//
//    public CategoryBlogAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob) {
//        this.curr_activity = curr_activity;
//        this.curr_context = curr_context;
//        this.arrappliedjob = arrappliedjob;
//        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
//    }
//
//    @Override
//    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
//        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.list_item_category_blog, parent, false);
//        return new ImagecategoryViewHolder(itemView);
//    }
//
//    @Override
//    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {
//        System.out.println("Entering onbind");
//
//        final Blog show = arrappliedjob.get(position);
//        notifyUser = show.getCreateBy();
//        bTitle = show.getTitle();
//        username = show.getUser_name();
//        holder.category.setText(show.getCategory());
//        holder.Username.setText(show.getCreateBy());
//        holder.Title.setText(show.getTitle());
//        holder.ShortDesc.setText(Html.fromHtml(String.valueOf(show.getShortDescription())));
//
//        if (show.isBookMark()) {
//            holder.IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGreen));
//        } else {
//            holder.IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGrey));
//        }
//        holder.TVbookmarkCount.setText(show.getBookMarkedCount());
//        holder.TVCommentCount.setText(show.getCommentCount());
//        holder.TVRating.setText(show.getRating());
//        holder.IVProgileImage.setImageResource(AvtarUtil.getAvtarDrawableByType(show.getAvatorCode()));
////        if(position ==0){
////            holder.right_arrow.setVisibility(View.VISIBLE);
////        } else {
////            holder.right_arrow.setVisibility(View.INVISIBLE);
////        }
//
//    }
//
//
//    @Override
//    public int getItemCount() {
//        if (arrappliedjob != null) {
//            return arrappliedjob.size();
//        } else {
//            return 0;
//        }
//    }
//
//    private void showPopupMenu(View view, final Blog blog) {
//        AlertDialog.Builder builderSingle = new AlertDialog.Builder(curr_activity);
//        final ArrayAdapter<String> arrayAdapter = new ArrayAdapter<String>(
//                curr_context,
//                android.R.layout.select_dialog_singlechoice);
//        arrayAdapter.add("Report");
//        arrayAdapter.add("Follow");
//        String[] arr = {"Follow", "Report"};
//        builderSingle.setCancelable(true);
//        builderSingle.setItems(arr, new DialogInterface.OnClickListener() {
//            @Override
//            public void onClick(DialogInterface dialog, int which) {
//                if (which == 1) {
//                    Intent blogprofile = new Intent(curr_context, Report.class);
//                    curr_context.startActivity(blogprofile);
//                } else {
//                    SharedPreferences preferences = curr_context.getSharedPreferences("mPrefs", MODE_PRIVATE);
//                    fllowRequest(preferences.getString("UserId", ""), blog.getUserID());
//                    Toast.makeText(curr_context, "Follow", Toast.LENGTH_SHORT).show();
//                }
//            }
//        });
//        builderSingle.show();
//
//    }
//
//    private void fllowRequest(final String UserID, final String FollowingID) {
//        RequestQueue requestQueue;
//        final ProgressDialog dialog = new ProgressDialog(curr_context);
//        dialog.setMessage("Please wait...");
//        dialog.show();
//        requestQueue = Volley.newRequestQueue(curr_context);
//        StringRequest jor = new StringRequest(Request.Method.POST, String.format("%s%s", Const.BASE_URL, "/Following"),
//                new Response.Listener<String>() {
//                    @Override
//                    public void onResponse(String response) {
//                        dialog.dismiss();
//                        Log.d("True", "");
//                        try {
//                            JSONObject jsonObject = new JSONObject(response);
//                            if (jsonObject.get("success").toString() == "true") {
//                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
//                            } else {
//                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
//                            }
//                        } catch (JSONException ex) {
//                            //progress.dismiss();
//                            Log.d("JSON Exception", ex.getMessage());
//                        }
//                    }
//                },
//                new Response.ErrorListener() {
//                    @Override
//                    public void onErrorResponse(VolleyError error) {
//                        dialog.dismiss();
//                        Log.e("Volley", "Error");
//                    }
//                }
//        ) {
//            @Override
//            protected Map<String, String> getParams() throws AuthFailureError {
//                HashMap<String, String> params = new HashMap<>();
//                params.put("UserID", UserID);
//                params.put("FollowingID", FollowingID);
//                return params;
//            }
//        };
//        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
//        requestQueue.add(jor);
//    }
//
//    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
//        TextView Username, Title, ShortDesc, category, TVbookmarkCount, TVCommentCount, TVRating;
//        CircleImageView IVProgileImage;
//        ImageView IVBookmarked, drawer;
//        public ImagecategoryViewHolder(View view) {
//            super(view);
//            this.Username = (TextView) view.findViewById(R.id.name);
//            this.Title = (TextView) view.findViewById(R.id.name2);
//            this.ShortDesc = (TextView) view.findViewById(R.id.name3);
//            this.category = (TextView) view.findViewById(R.id.category);
//            this.drawer = (ImageView) view.findViewById(R.id.drawer);
//            this.IVProgileImage = (CircleImageView) view.findViewById(R.id.IVProgileImage);
//            this.IVBookmarked = (ImageView) view.findViewById(R.id.IVBookmarked);
//            this.TVbookmarkCount = (TextView) view.findViewById(R.id.TVbookmarkCount);
//            this.TVCommentCount = (TextView) view.findViewById(R.id.TVCommentCount);
//            this.TVRating = (TextView) view.findViewById(R.id.TVRating);
//
//            drawer.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Blog blog = arrappliedjob.get(getAdapterPosition());
//                    showPopupMenu(v, blog);
//                }
//            });
//            this.IVProgileImage.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Intent blogprofile = new Intent(curr_context, Blog_Profile.class);
//                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getAdapterPosition()));
//                    curr_context.startActivity(blogprofile);
//                }
//            });
//            this.Title.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Intent blogprofile = new Intent(curr_context, ShowBlog.class);
//                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getAdapterPosition()));
//                    curr_context.startActivity(blogprofile);
//                }
//            });
//            this.ShortDesc.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Intent blogprofile = new Intent(curr_context, ShowBlog.class);
//                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getAdapterPosition()));
//                    curr_context.startActivity(blogprofile);
//                }
//            });
//
//            this.IVBookmarked.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Blog blog = arrappliedjob.get(getAdapterPosition());
//                    SharedPreferences preferences = curr_context.getSharedPreferences("mPrefs", MODE_PRIVATE);
//                    bookmarkRequest(preferences.getString("UserId", ""), blog.getBlogId());
//                }
//            });
//        }
//    }
//
//    private void bookmarkRequest(final String UserID, final String BlogID) {
//        RequestQueue requestQueue;
//        final ProgressDialog dialog = new ProgressDialog(curr_context);
//        dialog.setMessage("Please wait...");
//        dialog.show();
//        requestQueue = Volley.newRequestQueue(curr_context);
//        StringRequest jor = new StringRequest(Request.Method.POST, String.format("%s%s", Const.BASE_URL, "/BookMark"),
//                new Response.Listener<String>() {
//                    @Override
//                    public void onResponse(String response) {
//                        dialog.dismiss();
//                        Log.d("True", "");
//                        try {
//                            JSONObject jsonObject = new JSONObject(response);
//                            if (jsonObject.get("success").toString() == "true") {
//                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
//                            } else {
//                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
//                            }
//                        } catch (JSONException ex) {
//                            //progress.dismiss();
//                            Log.d("JSON Exception", ex.getMessage());
//                        }
//                    }
//                },
//                new Response.ErrorListener() {
//                    @Override
//                    public void onErrorResponse(VolleyError error) {
//                        dialog.dismiss();
//                        Log.e("Volley", "Error");
//                    }
//                }
//        ) {
//            @Override
//            protected Map<String, String> getParams() throws AuthFailureError {
//                HashMap<String, String> params = new HashMap<>();
//                params.put("UserID", UserID);
//                params.put("BlogID", BlogID);
//                return params;
//            }
//        };
//        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
//        requestQueue.add(jor);
//    }
//
//
//
//
//
//}
//
