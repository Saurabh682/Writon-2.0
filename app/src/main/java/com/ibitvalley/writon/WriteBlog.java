package com.ibitvalley.writon;

import android.app.Activity;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Html;
import android.text.InputFilter;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;

import jp.wasabeef.richeditor.RichEditor;

public class WriteBlog extends AppCompatActivity {

    private RichEditor mEditor;
    Blog blog;
    EditText tv_creatorName;

    //private TextView mPreview;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        //this.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        //this.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
        setContentView(R.layout.activity_write_blog);


        this.setTitle("Create New");
        blog = (Blog) getIntent().getSerializableExtra("BlogObject");

        tv_creatorName = (EditText) findViewById(R.id.tv_creatorName);
        mEditor = (RichEditor) findViewById(R.id.editor);
        //mEditor.setEditorHeight(250);
        mEditor.setEditorFontSize(20);
        mEditor.setEditorFontColor(Color.BLACK);
        mEditor.setVerticalScrollBarEnabled(true);
        mEditor.setScrollContainer(true);
        //mEditor.setEditorBackgroundColor(Color.BLUE);
        //mEditor.setBackgroundColor(Color.BLUE);
        //mEditor.setBackgroundResource(R.drawable.bg);
        mEditor.setPadding(10, 10, 10, 10);
        //    mEditor.setBackground("https://raw.githubusercontent.com/wasabeef/art/master/chip.jpg");
        mEditor.setPlaceholder("Start your creation here...");


        findViewById(R.id.action_undo).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.undo();
            }
        });
        findViewById(R.id.action_redo).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.redo();
            }
        });
        findViewById(R.id.action_bold).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.setBold();
            }
        });
        findViewById(R.id.action_italic).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.setItalic();
            }
        });

        findViewById(R.id.action_underline).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.setUnderline();
            }
        });

        findViewById(R.id.action_align_left).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.setAlignLeft();
            }
        });

        findViewById(R.id.action_align_center).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.setAlignCenter();
            }
        });

        findViewById(R.id.action_align_right).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mEditor.setAlignRight();
            }
        });

        if (blog != null) {
            tv_creatorName.setText(blog.getTitle());
            mEditor.setHtml(blog.getLongDescripton());
        }

        MyApplication.getInstance().trackEvent("Blog Writing", "Write Blog", "Blog Writing.");
        MyApplication.getInstance().trackScreenView("WriteBlog");
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.writeblog, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            // action with ID action_refresh was selected
            case R.id.action_settings:
                if(tv_creatorName.getText().toString().trim().length()<=0){
                    Toast.makeText(getApplicationContext(), "Creation name can't be blank", Toast.LENGTH_LONG).show();
                } else if(tv_creatorName.getText().toString().trim().length()> 80){
                    Toast.makeText(getApplicationContext(), "Creation name can't be more than 80 character", Toast.LENGTH_LONG).show();
                }else  if (String.valueOf(mEditor.getHtml()).trim().length() <= 5) {
                    Toast.makeText(this, "Post content is too Short. Please Write More.", Toast.LENGTH_SHORT).show();
                } else {

                    hideSoftKeyboard();
                    AlertDialog.Builder builder = new AlertDialog.Builder(this);
                    View dialogView = getLayoutInflater().inflate(R.layout.blogpostconfirmdialog, null);
                    TextView btnOk = dialogView.findViewById(R.id.btnOk);
                    TextView btnCancel = dialogView.findViewById(R.id.btnCancel);
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
                            dialog.dismiss();
                            publishBlog("0");
                        }
                    });
                    dialog.show();
                    item.setEnabled(false);


                }
                break;
            case R.id.action_saveDraft:
                publishBlog("1");
                break;
            case R.id.home:
                onBackPressed();
                break;
            default:
                break;
        }
        return true;
    }

    /**
     * Hides the soft keyboard
     */
    public void hideSoftKeyboard() {
        if (getCurrentFocus() != null) {
            InputMethodManager inputMethodManager = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            assert inputMethodManager != null;
            inputMethodManager.hideSoftInputFromWindow(getCurrentFocus().getWindowToken(), 0);
        }
    }

    /*private void publishBlog(final String IsDraft) {
        final String creatorName = tv_creatorName.getText().toString();   //getIntent().getStringExtra("CreatorName");
        tv_creatorName.setFilters(new InputFilter[] {new InputFilter.LengthFilter(80)});
        final String Category = getIntent().getStringExtra("Category");
        final String SubCat = getIntent().getStringExtra("SubCat");
        final String shortDesc = getIntent().getStringExtra("shortDesc");
        final String language = getIntent().getStringExtra("language");
        final String content = mEditor.getHtml();
        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String UserId = preferences.getString("UserId", "0");
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(WriteBlog.this);
        dialog.setMessage("Please wait...");
        dialog.show();
        requestQueue = Volley.newRequestQueue(getApplicationContext());
        String loginURL = Const.BASE_URL + "Blog";

        Log.d("URL", loginURL);
        System.out.println("PARAMS ARE Tilte," + creatorName + " : Category," + Category + " : ShortDesc :" + shortDesc + " : CreatedBy " + UserId + " : LongDesc : " + content);

        StringRequest jor = new StringRequest(Request.Method.POST, loginURL,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        dialog.dismiss();
                        Log.d("True", "");
                        try {
                            JSONObject jsonObject = new JSONObject(response);
                            if (jsonObject.get("success").toString() == "true") {
                                if (IsDraft.equals("1")) {
                                    Toast.makeText(WriteBlog.this, "Draft saved Successfully", Toast.LENGTH_LONG).show();
                                    callIntent();
                                } else {
                                    //Toast.makeText(WriteBlog.this, "Blog Published SuccessFully.", Toast.LENGTH_LONG).show();
                                    askforShare();
                                }

                            } else {
                                Toast.makeText(WriteBlog.this, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
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
                System.out.println("PARAMS SEND  Tilte," + creatorName + " : Category," + Category + " : ShortDesc :" + shortDesc + " : CreatedBy " + UserId + " : LongDesc : " + content);
                params.put("Title", creatorName);
                params.put("Category", Category);
                params.put("SubCat", SubCat);
                params.put("LongDescription", content);
                params.put("ShortDescription", shortDesc);
                params.put("CreateBy", UserId);
                params.put("Language", language);
                //if (blog != null)
                    //params.put("BlogId", blog.getBlogId());
                params.put("IsDraft", IsDraft);
                Log.d("URL PARAMS ", params.toString());
                return params;
            }
        };
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }*/



    private void publishBlog(final String IsDraft) {

        final String creatorName = tv_creatorName.getText().toString();   //getIntent().getStringExtra("CreatorName");
        tv_creatorName.setFilters(new InputFilter[] {new InputFilter.LengthFilter(80)});
        final String Category = getIntent().getStringExtra("Category");
        final String SubCat = getIntent().getStringExtra("SubCat");
        final String shortDesc = getIntent().getStringExtra("shortDesc");
        final String language = getIntent().getStringExtra("language");
        final String content = mEditor.getHtml();
        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String UserId = preferences.getString("UserId", "0");

        HashMap<String, String> params = new HashMap<>();
        System.out.println("PARAMS SEND  Tilte," + creatorName + " : Category," + Category + " : ShortDesc :" + shortDesc + " : CreatedBy " + UserId + " : LongDesc : " + content);
        params.put("title", creatorName);
        params.put("category", Category);
        params.put("subcategory", SubCat);
        params.put("fulldescription", content);
        params.put("shortdescription", shortDesc);
        //params.put("CreateBy", UserId);
        params.put("language", language);
        params.put("blogid", "");
        //if (blog != null)
        //params.put("BlogId", blog.getBlogId());
        params.put("is_draft", IsDraft);
        Log.d("URL PARAMS ", params.toString());

        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.add_post, WriteBlog.this, false, params, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        if (IsDraft.equals("1")) {
                            Toast.makeText(WriteBlog.this, "Draft saved Successfully", Toast.LENGTH_LONG).show();
                            callIntent();
                        } else {
                            //Toast.makeText(WriteBlog.this, "Blog Published SuccessFully.", Toast.LENGTH_LONG).show();

                            askforShare();
                        }
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(WriteBlog.this, message, Toast.LENGTH_LONG).show();
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

    private void fcmNotifyAll() {
        User userData = WritOnPreference.getInstance(getApplicationContext()).getUserDetails();
        final String Category = getIntent().getStringExtra("Category");
        final String SubCat = getIntent().getStringExtra("SubCat");
        // Instantiate the RequestQueue.
        RequestQueue queue = Volley.newRequestQueue(this);
        String url ="https://www.writon.co/Mine/fcm_noti_multiuser.php?id="+userData.getId()+"&sp="+SubCat+" in "+Category+"&tp= has posted - "+tv_creatorName.getText().toString();
        System.out.println(url);
        // Request a string response from the provided URL.
        StringRequest stringRequest = new StringRequest(Request.Method.GET, url,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        // Display the first 500 characters of the response string.
                        System.out.println("Response is: "+ response);
                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                System.out.println("That didn't work!");
            }
        });

        // Add the request to the RequestQueue.
        queue.add(stringRequest);

    }


    @Override
    public void onBackPressed() {

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Save Draft");
        builder.setMessage("Do you want to save this post as draft?.");
        builder.setPositiveButton("Save Draft", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                publishBlog("1");
            }
        });

        builder.setNegativeButton("Discard this post?", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
                WriteBlog.super.onBackPressed();
                callIntent();
            }
        });
        AlertDialog dialog = builder.create();
        dialog.show();
        Log.d("CDA", "onBackPressed Called");
    }

    private void askforShare(){
        fcmNotifyAll();
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View dialogView = getLayoutInflater().inflate(R.layout.afterblogpostdialog, null);
        TextView btnOk = (TextView) dialogView.findViewById(R.id.btnOk);
        TextView btnCancel = (TextView) dialogView.findViewById(R.id.btnCancel);
        builder.setView(dialogView);
        final AlertDialog dialog = builder.create();
        btnCancel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialog.dismiss();
                Intent sendIntent = new Intent();
                // Set the action to be performed i.e 'Send Data'
                sendIntent.setAction(Intent.ACTION_SEND);
                // Add the text to the intent
                SharedPreferences preferences = getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);
                String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", getIntent().getStringExtra("CreatorName"), preferences.getString(Constants.KEY_PREF_DISPLAY_NAME, ""),  Html.fromHtml(mEditor.getHtml()), getIntent().getStringExtra("Category"), "https://goo.gl/Cx4oPk");
                sendIntent.putExtra(Intent.EXTRA_TEXT, shareContent);
                // Set the type of data i.e 'text/plain'
                sendIntent.setType("text/plain");
                //intent.setData(Uri.parse("market://details?id=com.ibitvalley.writon"));
                // Launches the activity; Open 'Text editor' if you set it as default app to handle Text
                startActivity(sendIntent);


            }
        });
        btnOk.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialog.dismiss();

                Intent home = new Intent(WriteBlog.this, Home_Activity.class);
                home.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(home);
                finish();
            }
        });

        dialog.show();
    }



    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {

        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1) {
            if (resultCode == Activity.RESULT_OK) {
                String result = data.getStringExtra("result");
                callIntent();
            }
            if (resultCode == Activity.RESULT_CANCELED) {
                //Write your code if there's no result
                callIntent();
            }
        }
    }

    private void callIntent(){
         Intent home = new Intent(WriteBlog.this, Home_Activity.class);
         home.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK);
         startActivity(home);
         finish();
    }


}
