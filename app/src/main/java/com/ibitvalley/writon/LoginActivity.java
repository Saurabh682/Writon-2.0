package com.ibitvalley.writon;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.bumptech.glide.Glide;
import com.facebook.AccessToken;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import com.facebook.FacebookException;
import com.facebook.FacebookSdk;
import com.facebook.GraphRequest;
import com.facebook.GraphResponse;
import com.facebook.Profile;
import com.facebook.appevents.AppEventsLogger;
import com.facebook.login.LoginManager;
import com.facebook.login.LoginResult;
import com.facebook.login.widget.LoginButton;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FacebookAuthProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.iid.FirebaseInstanceId;
import com.google.gson.Gson;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.classes.UserInfo;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.Const;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebApiParams;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashMap;

public class LoginActivity extends AppCompatActivity {


    Button login_button;
    TextView LVSignUP, TVEmailText, TVPasswordText;
    EditText ETEmail, ETPassword;
    TextView forgotBtn;
    CallbackManager callbackManager;
    LinearLayout btnFblogin, btnGoogleLogin;
    LoginButton loginButton;
    Typeface tf;

    private FirebaseAuth mAuth;
    //private CallbackManager mCallbackManager;

    // Google Sign-UP

    private static final String TAG = "AndroidClarified";
    private GoogleSignInClient googleSignInClient;


    @Override
    protected void onCreate(Bundle savedInstanceState) {

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        FacebookSdk.sdkInitialize(getApplicationContext());
        setContentView(R.layout.activity_login);
        //getSupportActionBar().hide();


        tf = Typeface.createFromAsset(getAssets(),"Lato-Regular.ttf");
        callbackManager = CallbackManager.Factory.create();
        login_button = (Button) findViewById(R.id.login_button);
        login_button.setTypeface(tf);

        TVEmailText = (TextView) findViewById(R.id.TVEmailText);
        TVEmailText.setTypeface(tf);
        TVPasswordText = (TextView) findViewById(R.id.TVPasswordText);
        TVPasswordText.setTypeface(tf);
        btnFblogin = (LinearLayout) findViewById(R.id.btnFblogin);

        btnGoogleLogin = (LinearLayout) findViewById(R.id.btnGoogleLogin);

        ETEmail = (EditText) findViewById(R.id.ETEmail);
        ETEmail.setTypeface(tf);
        ETPassword = (EditText) findViewById(R.id.ETPassword);
        ETPassword.setTypeface(tf);
        LVSignUP = (TextView) findViewById(R.id.LVSignUP);
        LVSignUP.setTypeface(tf);
        forgotBtn = (TextView) findViewById(R.id.forgotBtn);
        forgotBtn.setTypeface(tf);


        FirebaseAnalytics mFirebaseAnalytics = FirebaseAnalytics.getInstance(this);
        Bundle bundle = new Bundle();
        bundle.putString(FirebaseAnalytics.Param.METHOD, "LoginScreen");
        mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.LOGIN, bundle);


        String token = String.valueOf(FirebaseInstanceId.getInstance().getToken());


        // Google Sign-UP

        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .build();

        googleSignInClient = GoogleSignIn.getClient(this, gso);

        String email = String.valueOf(getIntent().getStringExtra("EmailID"));
        String password = String.valueOf(getIntent().getStringExtra("Password"));
        if(email.length() > 10 && password.length() > 2){
            ETEmail.setText(email);
            ETPassword.setText(password);
            validateUser();
        }

        forgotBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showAlertDialog();
            }
        });
        btnFblogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                /*callFacebook();
                MyApplication.getInstance().trackEvent("Facebook Login", "Facebook Login Button", "User Click on facebook login button.");
                MyApplication.getInstance().trackScreenView("Facebook Login Screen");*/
                // Initialize Firebase Auth
                //mAuth = FirebaseAuth.getInstance();

                // Check if user is signed in (non-null) and update UI accordingly.
                //FirebaseUser currentUser = mAuth.getCurrentUser();
                //updateUI(currentUser);

                // Initialize Facebook Login button

                callFacebook();


                /*LoginButton loginButton = findViewById(R.id.buttonFacebookLogin);
                loginButton.setReadPermissions("email", "public_profile");
                loginButton.registerCallback(mCallbackManager, new FacebookCallback<LoginResult>() {
                    @Override
                    public void onSuccess(LoginResult loginResult) {
                        Log.d("FB Login", "facebook:onSuccess:" + loginResult);
                        handleFacebookAccessToken(loginResult.getAccessToken());
                    }

                    @Override
                    public void onCancel() {
                        Log.d("FB Login", "facebook:onCancel");
                        // ...
                    }

                    @Override
                    public void onError(FacebookException error) {
                        Log.d("FB Login", "facebook:onError", error);
                        // ...
                    }
                });*/
            }
        });

        btnGoogleLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent signInIntent = googleSignInClient.getSignInIntent();
                startActivityForResult(signInIntent, 101);
            }
        });



        login_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                validateUser();
            }
        });

        LVSignUP.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent home = new Intent(LoginActivity.this, Signup.class);
                startActivity(home);
                finish();
            }
        });
    }


    private void validateUser() {
        //ETEmail.setText("saurabh.682@gmail.com");
        //ETPassword.setText("Tarzan#4321");
//      ETEmail.setText("admin");
//      ETPassword.setText("1234567");
        final String email = ETEmail.getText().toString().trim();
        final String password = ETPassword.getText().toString().trim();

        HashMap<String, String> hmLoginParams = WebApiParams.getLoginParams(email, password);
        SmartPostWebRequest loginRequest = new SmartPostWebRequest(WebConstants.Login_Api, LoginActivity.this, true, hmLoginParams, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            User user = new Gson().fromJson(jsonResponse.getJSONObject("data").toString(), User.class);
                            WritOnPreference.getInstance(LoginActivity.this).saveUserDetails(user);
                            Intent home = new Intent(LoginActivity.this, Home_Activity.class);
                            home.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(home);
                        } else {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(LoginActivity.this, message, Toast.LENGTH_LONG).show();
                        }

                    }
                } catch (JSONException e) {
                    //e.printStackTrace();
                    Toast.makeText(LoginActivity.this, e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onError(VolleyError error) {
                Toast.makeText(LoginActivity.this, error.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(loginRequest);
    }



    private void login()
    {
        MyApplication.getInstance().trackEvent("Login Screen", "Login Button", "User Click on login button.");
        MyApplication.getInstance().trackScreenView("Login Screen");
        if (!ETEmail.getText().toString().trim().equals("") && !ETPassword.getText().toString().trim().equals("")) {
            RequestQueue requestQueue;
            final ProgressDialog dialog = new ProgressDialog(LoginActivity.this);
            dialog.setMessage("Logging, Please wait...");
            dialog.show();
            requestQueue = Volley.newRequestQueue(getApplicationContext());
            String loginURL = String.format(Const.BASE_URL + "Login?Email=%s&Password=%s", ETEmail.getText().toString().trim(), ETPassword.getText().toString().trim());
            Log.d("URL", loginURL);
            loginURL = loginURL.replace(" ", "%20");
            JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, loginURL, null,
                    new Response.Listener<JSONObject>() {
                        @Override
                        public void onResponse(JSONObject response) {
                            dialog.dismiss();
                            Log.d("True", "");
                            try {
                                if (response.get("success").toString() == "true") {
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
                                    editor.putString(Constants.KEY_PREF_DISPLAY_NAME, response.get("UserName").toString());
                                    // New Changes...(01-11-2016)

                                    editor.putString(Constants.KEY_PREF_WORKINGON, response.get("WorkingOn").toString());
                                    editor.putString(Constants.KEY_PREF_INTRO, response.get("Introducation").toString());
                                    editor.putString(Constants.KEY_PREF_QUOTEOFDAY, response.get("QuoteofDay").toString());
                                    editor.putString(Constants.KEY_PREF_FOLLOWINGCOUNT, response.get("FollowingCount").toString());
                                    editor.putString(Constants.KEY_PREF_FOLLOWERCOUNT, response.get("FollowersCount").toString());
                                    editor.putString(Constants.KEY_PREF_BLOGPUBLISHCOUNT, response.get("BlogPublishCount").toString());
                                    editor.putString(Constants.KEY_PREF_U_AVATOR_CODE, response.get("AvatorCode").toString());
//
                                    editor.apply();
                                    Intent home = new Intent(LoginActivity.this, Home_Activity.class);
                                    startActivity(home);
                                    finish();
                                    //progress.dismiss();
                                } else {
                                    Toast.makeText(LoginActivity.this, response.get("message").toString(), Toast.LENGTH_LONG).show();
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
                            error.printStackTrace();
                            Log.e("Volley", "Error");
                        }
                    }
            );
            jor.setRetryPolicy(new DefaultRetryPolicy(20000, 3, 0.0f));
            requestQueue.add(jor);
        } else {
            Log.e("Blank Field", "Why it's blank?");
            Toast.makeText(getApplicationContext(), "User name and Password Can't be blank.", Toast.LENGTH_LONG).show();
        }
    }

    /*@Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        callbackManager.onActivityResult(requestCode, resultCode, data);
    }*/


    private void callFacebook() {
        LoginManager.getInstance().logInWithReadPermissions(this, Arrays.asList("public_profile", "email", "user_birthday"));
        LoginManager.getInstance().registerCallback(callbackManager,
                new FacebookCallback<LoginResult>() {
                    @Override
                    public void onSuccess(final LoginResult loginResult) {
                        // App code
                        System.out.println("Result : " + loginResult.getAccessToken());
                        GraphRequest request = GraphRequest.newMeRequest(loginResult.getAccessToken(),
                                new GraphRequest.GraphJSONObjectCallback() {
                                    @Override
                                    public void onCompleted(
                                            JSONObject object,
                                            GraphResponse response) {
                                        Log.v("LoginActivity Response ", response.toString());
                                        try {
                                            String Name = object.getString("name");
                                            String FEmail = "";
                                            if(object.has("email")) {
                                                FEmail   =object.getString("email");
                                            }
                                            // String gender = object.getString("gender");
                                            String ID = object.getString("id");
                                            Log.v("Email = ", " " + FEmail);
                                            Log.v("ID = ", " " + ID);
                                            //Toast.makeText(getApplicationContext(), "Name " + Name + " : Email " + FEmail, Toast.LENGTH_LONG).show();
                                            callSocialLoginAPI(ID, FEmail, Name, "facebook");

                                        } catch (JSONException e) {
                                            e.printStackTrace();
                                        }
                                    }
                                });
                        Bundle parameters = new Bundle();
                        parameters.putString("fields", "id,name,email,gender, birthday");
                        request.setParameters(parameters);
                        request.executeAsync();

                    }

                    @Override
                    public void onCancel() {
                        // App code
                        System.out.println("Result : " );
                    }

                    @Override
                    public void onError(FacebookException exception) {
                        // App code
                        System.out.println("Result : " + exception.getMessage());
                    }
                });

    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data){
        super.onActivityResult(requestCode, resultCode, data);
        callbackManager.onActivityResult(requestCode, resultCode, data);





        if (resultCode == Activity.RESULT_OK)
            switch (requestCode) {
                case 101:
                    try {
                        // The Task returned from this call is always completed, no need to attach
                        // a listener.
                        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                        GoogleSignInAccount account = task.getResult(ApiException.class);
                        onLoggedIn(account);
                    } catch (ApiException e) {
                        // The ApiException status code indicates the detailed failure reason.
                        Log.w(TAG, "signInResult:failed code=" + e.getStatusCode());
                    }
                    break;
            }
    }


    private void handleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);

            // Signed in successfully, show authenticated UI.
            //updateUI(account);
        } catch (ApiException e) {
            // The ApiException status code indicates the detailed failure reason.
            // Please refer to the GoogleSignInStatusCodes class reference for more information.
            Log.w(TAG, "signInResult:failed code=" + e.getStatusCode());
            // updateUI(null);
        }
    }



    private void onLoggedIn(GoogleSignInAccount googleSignInAccount) {

        //Intent intent = new Intent(this, LoginActivity.class);


        String googleEmailID = googleSignInAccount.getEmail();
        String googleDisplayName = googleSignInAccount.getDisplayName();
        String googleSocialID = googleSignInAccount.getId();

        callSocialLoginAPI(googleSocialID, googleEmailID, googleDisplayName, "google");

    }


    private void callSocialLoginAPI(final String userId, final String fEmail, final String Name, String provider) {

        HashMap <String, String> hmLoginParams = WebApiParams.getRegistrationParamsFB(Name, fEmail, userId, provider);
        SmartPostWebRequest loginRequest = new SmartPostWebRequest(WebConstants.SocialRegister_API, LoginActivity.this, true, hmLoginParams, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            User user = new Gson().fromJson(jsonResponse.getJSONObject("data").toString(), User.class);
                            WritOnPreference.getInstance(LoginActivity.this).saveUserDetails(user);
                            Intent home = new Intent(LoginActivity.this, Home_Activity.class);
                            home.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(home);
                        } else {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(LoginActivity.this, message, Toast.LENGTH_LONG).show();
                        }

                    }
                } catch (JSONException e) {
                    //e.printStackTrace();
                    Toast.makeText(LoginActivity.this, e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onError(VolleyError error) {
                Toast.makeText(LoginActivity.this, error.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(loginRequest);
    }


    private void showAlertDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_forgetpwd, null);
        TextView btnOk = (TextView) dialogView.findViewById(R.id.btnOk);
        TextView btnCancel = (TextView) dialogView.findViewById(R.id.btnCancel);
        final EditText ETEmail = (EditText) dialogView.findViewById(R.id.ETEmail);
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
                ETEmail.setError(null);
                if (ETEmail.getText().toString().trim().length() > 4 && ETEmail.getText().toString().contains("@")) {
                    RequestQueue requestQueue;
                    final ProgressDialog Pdialog = new ProgressDialog(LoginActivity.this);
                    Pdialog.setMessage("Logging, Please wait...");
                    Pdialog.show();
                    requestQueue = Volley.newRequestQueue(getApplicationContext());
                    String loginURL = String.format(Const.BASE_URL + "ForgotPassword?Email=%s", ETEmail.getText().toString().trim());
                    Log.d("URL", loginURL);
                    loginURL = loginURL.replace(" ", "%20");
                    JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, loginURL, null,
                            new Response.Listener<JSONObject>() {
                                @Override
                                public void onResponse(JSONObject response) {
                                    Pdialog.dismiss();
                                    Log.d("True", "");
                                    try {
                                        if (response.get("success").toString() == "true") {
                                            dialog.dismiss();
                                            Toast.makeText(LoginActivity.this, response.get("message").toString(), Toast.LENGTH_LONG).show();
                                        } else {
                                            Toast.makeText(LoginActivity.this, response.get("message").toString(), Toast.LENGTH_LONG).show();
                                        }
                                    } catch (JSONException ex) {
                                        Pdialog.dismiss();
                                        Log.d("JSON Exception", ex.getMessage());
                                    }
                                }
                            },
                            new Response.ErrorListener() {
                                @Override
                                public void onErrorResponse(VolleyError error) {
                                    Pdialog.dismiss();
                                    error.printStackTrace();
                                    Log.e("Volley", "Error");
                                }
                            }
                    );
                    jor.setRetryPolicy(new DefaultRetryPolicy(20000, 3, 0.0f));
                    requestQueue.add(jor);
                } else {
                    ETEmail.setError("Please Enter a Valid Email.");
                    ETEmail.requestFocus();
                }
            }
        });
        dialog.show();
    }
}
