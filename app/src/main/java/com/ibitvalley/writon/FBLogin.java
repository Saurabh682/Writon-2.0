package com.ibitvalley.writon;

import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.GridView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import androidx.annotation.NonNull;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.adapter.GridViewAdapter;
import com.ibitvalley.writon.classes.UserInfo;

import org.json.JSONException;
import org.json.JSONObject;

import de.hdodenhof.circleimageview.CircleImageView;

import static com.ibitvalley.writon.model.AvtarUtil.getAvtarData;
import static com.ibitvalley.writon.model.AvtarUtil.getAvtarDrawableByType;

public class FBLogin extends BaseActivity {


    EditText first_name, email, password, TVUserName, gender, Cpassword;
    TextView TVTerms;
    Button FBsignup_button;
    String Name ="", FBID ="", Email ="", Gender ="";
    CircleImageView avatarImageView;
    LinearLayout llChangeAvatar;
    int selectedAvtarType = 0;
    CheckBox CBtandc;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_fblogin);
        first_name = (EditText) findViewById(R.id.first_name);
        TVUserName = (EditText) findViewById(R.id.TVUserName);
        password = (EditText) findViewById(R.id.password);
        Cpassword= (EditText) findViewById(R.id.Cpassword);
        email = (EditText) findViewById(R.id.email);
        gender = (EditText) findViewById(R.id.gender);
        llChangeAvatar = (LinearLayout) findViewById(R.id.llChangeAvatar);
        avatarImageView = (CircleImageView) findViewById(R.id.avatarImageView);
        CBtandc = (CheckBox) findViewById(R.id.CBtandc);
        llChangeAvatar.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showAvtarSelectorPopup();
            }
        });


        TVTerms = (TextView) findViewById(R.id.TVTerms);
        String text = "<a href='#'>Terms and Conditions.</a>";
        TVTerms.setText(Html.fromHtml(text));
        TVTerms.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                shDialog();
            }
        });

        FBsignup_button = (Button) findViewById(R.id.FBsignup_button);

        if (savedInstanceState == null) {
            Bundle extras = getIntent().getExtras();
            if(extras != null) {
                Name= extras.getString("Name");
                FBID= extras.getString("FBID");
                Email = extras.getString("Email");
                Gender = extras.getString("gender");
            }
        }
        first_name.setText(Name);
        email.setText(Email);
        gender.setText(Gender);
        FBsignup_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                checkValidation(FBID);
                MyApplication.getInstance().trackEvent("Facebook Login", "Continue with facebook(Login)", "User Click on facebook login button.");
                MyApplication.getInstance().trackScreenView("Facebook Login Screen");
            }
        });
    }


    private void showAvtarSelectorPopup() {
        final AlertDialog.Builder builder = new AlertDialog.Builder(this);
        final View dialogVIew = getLayoutInflater().inflate(R.layout.dialog_avtar_view, null);
        builder.setView(dialogVIew);
        GridView gridView = (GridView) dialogVIew.findViewById(R.id.gridView);
        GridViewAdapter gridAdapter = new GridViewAdapter(this, R.layout.list_item_avtargrid, getAvtarData());
        gridView.setAdapter(gridAdapter);
        builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss();
            }
        });
        final AlertDialog dialog = builder.create();
        gridView.setOnItemClickListener(new AdapterView.OnItemClickListener() {

            @Override
            public void onItemClick(AdapterView<?> parent, View view,
                                    int position, long id) {
                // TODO Auto-generated method stub
                dialog.dismiss();
                selectedAvtarType = position;
                avatarImageView.setImageResource(getAvtarDrawableByType(selectedAvtarType));

            }
        });
        dialog.show();
    }


    private void shDialog() {
        AlertDialog.Builder alertDialog = new AlertDialog.Builder(FBLogin.this);

        // Setting Dialog Title
        alertDialog.setTitle("Terms & Conditions");

        // Setting Dialog Message
        alertDialog.setMessage("PLEASE READ THE TERMS OF USE CAREFULLY. BY ACCESSING OR USING ANY PART OF THE APPLICATION OR WEBSITE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD AND AGREED TO BE BOUND TO ALL THE TERMS OF THE (i)TERMS OF USE; (ii) PRIVACY POLICY; (iii)CONTENT GUIDELINES; and (iv) COMMENT POLICY. IF YOU DO NOT AGREE TO THESE TERMS OF USE, EXIT THIS APPLICATION AND DO NOT ACCESS OR USE THE PLATFORM. USE OF THE PLATFORM AND APPLICATION IS EXPRESSLY CONDITIONED UPON YOUR ACCEPTANCE OF THE TERMS OF USE.\n" +
                "1.\tGeneral\n" +
                "(a)\tThis document is prepared in accordance with Rule 3 of the Information Technology (Intermediaries Guidelines) Rules, 2011. \n" +
                "(b)\tThis is an electronically generated documentand does not require any express assent from the Users. \n" +
                "(c)\tYour use of the Application and/or Website is subject to the terms and conditions set forth in these Terms of Use.\n" +
                "\n" +
                "(d)\t[•]mobile application, to provide a platform for writers to try their hands on novels & novellas, short stories, poetries and others interesting writeups in textual and other possible modes such as visual and audio-visual and to readers to experience literary works (“Services”).\n" +
                "(e)\tIn this Terms of Use, unless the context requires otherwise, the following words and expressions shall have the following meaning: \n" +
                "(a)\t“Application” means the [insert specific name]application providing access to the Services of WritOn.co.\n" +
                "(b)\t“Author” means any User who writes and publishes User Submissions on the Application and/or Website. \n" +
                "(c)\t“Comment Guidelines” means the guidelines of the [•] governing the code of conduct of Users while interacting with other Users on the Application through suggestions, review comments on the User Submissions.\n" +
                "(d)\t“Content Guidelines” means the guidelines of the WritOn.co governing the content of the User Submissions on the Application.\n" +
                "(e)\t“Privacy Policy” means the privacy policy of the WritOn.co.\n" +
                "(f)\t“Services” shall have the meaningascribed to the term in sub-clause (d) above.\n" +
                "(g)\t“Terms of Use” means these terms and conditions governing the use of Application and/or the Website by the Users. \n" +
                "(h)\t“User” or “you” or “your” means any users who will use the Application and/or the Website accessing the Services. \n" +
                "(i)\t“User Submissions” mean any textual, audio, visual, audio-visual, comics content posted on the Application and/or the Website.\n" +
                "(j)\t“Website” means the domain name accessible at www.writon.co.\n");

        // Setting Icon to Dialog
        alertDialog.setIcon(R.drawable.ic_beenhere_black_24dp);

        // Setting Positive "Yes" Button
        alertDialog.setPositiveButton("ACCEPT", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int which) {
                CBtandc.setChecked(true);
                // Write your code here to invoke YES event
                //Toast.makeText(getApplicationContext(), "You clicked on YES", Toast.LENGTH_SHORT).show();
            }
        });

        // Setting Negative "NO" Button
        alertDialog.setNegativeButton("DECLINE", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int which) {
                // Write your code here to invoke NO event
                CBtandc.setChecked(false);
                //Toast.makeText(getApplicationContext(), "You clicked on NO", Toast.LENGTH_SHORT).show();
                dialog.cancel();
            }
        });

        // Showing Alert Message
        alertDialog.show();
    }


    ProgressDialog progress;

    private void checkValidation(String FBID) {
        if (first_name.getText().toString().trim().equals("")  && email.getText().toString().equals("") && password.getText().toString().trim().trim().equals("") && TVUserName.getText().toString().trim().equals("")) {
            first_name.setError("First Name cannot be empty");
            email.setError("Email cannot be empty");
            password.setError("Password cannot be empty");
            TVUserName.setError("UserName cannot be empty");
        } else if (TVUserName.getText().toString().trim().equals("")) {
            TVUserName.setError("UserName cannot be empty");
        } else if (first_name.getText().toString().trim().equals("")) {
            first_name.setError("First Name cannot be empty");
        } if(!password.getText().toString().trim().equals(Cpassword.getText().toString().trim())){
            Cpassword.setError("Passwords must match");
        }
        else if (email.getText().toString().trim().equals("")) {
            email.setError("Email cannot be empty");
        } else if (password.getText().toString().trim().equals("")) {
            password.setError("password cannot be empty");
        }  else if (!CBtandc.isChecked()) {
            Toast.makeText(FBLogin.this, "Please Accept the Terms and Conditions", Toast.LENGTH_SHORT).show();
        } else {
            FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(new OnCompleteListener<String>() {
                        @Override
                        public void onComplete(@NonNull Task<String> task) {
                            String token = "";
                            if (task.isSuccessful()) {
                                token = task.getResult();
                            }
                            String signUPUrl = String.format("http://blog.ibitvalley.com/api/SocialRegister?Name=%s&Email=%s&Gender=%s&Password=%s&UserName=%s&FacebookId=%s&AvatorCode=%s&FcmID=%s", first_name.getText().toString().trim(), email.getText().toString().trim(), gender.getText(), password.getText().toString().trim(), TVUserName.getText().toString().trim(), FBID, selectedAvtarType, token);
                            signUPUrl = signUPUrl.replace(" ", "%20");
                            sendRegistrationRequest(signUPUrl);
                        }
                    });
        }
    }

    private void sendRegistrationRequest(String signUPUrl) {
        final ProgressDialog dialog = new ProgressDialog(this);
        dialog.setMessage("Creating Account ,please wait...");
        dialog.show();
        RequestQueue requestQueue;
        requestQueue = Volley.newRequestQueue(getApplicationContext());
        JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, signUPUrl, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        dialog.dismiss();
                        Log.d("True", "");
                        try {
                            if (response.get("success").toString() == "true") {
                               // Toast.makeText(FBLogin.this, response.get("message").toString(), Toast.LENGTH_LONG).show();
                                UserInfo.UserId = response.get("UserId").toString();
                                UserInfo.Name = response.get("Name").toString();
                                UserInfo.Email = response.get("Email").toString();
                                UserInfo.DOB = response.get("DOB").toString();
                                SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
                                SharedPreferences.Editor editor = preferences.edit();
                                editor.putString(Constants.KEY_PREF_USERID, UserInfo.UserId);
                                editor.putString(Constants.KEY_PREF_U_NAME, UserInfo.Name);
                                editor.putString(Constants.KEY_PREF_U_EMAIL, UserInfo.Email);
                                editor.putString(Constants.KEY_PREF_U_DOB, UserInfo.DOB);
                                // New Changes...(01-11-2016)

                                editor.putString(Constants.KEY_PREF_WORKINGON, response.get("WorkingOn").toString());
                                editor.putString(Constants.KEY_PREF_INTRO, response.get("Introducation").toString());
                                editor.putString(Constants.KEY_PREF_QUOTEOFDAY, response.get("QuoteofDay").toString());
                                editor.putString(Constants.KEY_PREF_FOLLOWINGCOUNT, response.get("FollowingCount").toString());
                                editor.putString(Constants.KEY_PREF_FOLLOWERCOUNT, response.get("FollowersCount").toString());
                                editor.putString(Constants.KEY_PREF_BLOGPUBLISHCOUNT, response.get("BlogPublishCount").toString());
                                editor.commit();
                                Intent home = new Intent(FBLogin.this, Home_Activity.class);
                                startActivity(home);
                                finish();
                            }
                        } catch (JSONException ex) {
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dialog.dismiss();
                        // progress.dismiss();
                        Log.e("Volley", "Error");
                        Toast.makeText(FBLogin.this, "Error.", Toast.LENGTH_SHORT).show();
                    }
                }
        );
        requestQueue.add(jor);
    }
}
