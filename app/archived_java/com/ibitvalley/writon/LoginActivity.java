package com.ibitvalley.writon;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import com.facebook.FacebookException;
import com.facebook.FacebookSdk;
import com.facebook.GraphRequest;
import com.facebook.GraphResponse;
import com.facebook.login.LoginManager;
import com.facebook.login.LoginResult;
import com.facebook.login.widget.LoginButton;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.ibitvalley.writon.databinding.ActivityLoginBinding;
import com.ibitvalley.writon.classes.model.LoginBody;
import com.ibitvalley.writon.custom_ui.WritOnProgressDialog;
import com.ibitvalley.writon.classes.model.SignupBody;
import com.ibitvalley.writon.classes.model.SignupResponse;
import com.ibitvalley.writon.classes.model.SocialLoginBody;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.classes.UserInfo;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.DefaultResponse;
import com.ibitvalley.writon.model.LoginUserDetails;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.Const;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebApiParams;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.takusemba.spotlight.OnSpotlightListener;
import com.takusemba.spotlight.Spotlight;
import com.takusemba.spotlight.Target;
import com.takusemba.spotlight.shape.Circle;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.concurrent.TimeUnit;

import io.reactivex.Single;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;
import retrofit2.Call;
import retrofit2.Callback;
import smartdevelop.ir.eram.showcaseviewlib.GuideView;
import smartdevelop.ir.eram.showcaseviewlib.config.DismissType;
import smartdevelop.ir.eram.showcaseviewlib.config.Gravity;

public class LoginActivity extends BaseActivity {

    private ActivityLoginBinding binding;
    CallbackManager callbackManager;
    Typeface tf;

    private FirebaseAuth mAuth;
    //private CallbackManager mCallbackManager;

    // Google Sign-UP removed for email-only login
    private static final String TAG = "LoginActivity";
    // private GoogleSignInClient googleSignInClient;
    private boolean isCallingFacebook=false;
    private TinyDB tinydb;
    @Override
    protected void onCreate(Bundle savedInstanceState) {

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        
        tinydb = new TinyDB(getApplicationContext());

        tf = Typeface.createFromAsset(getAssets(),"Lato-Regular.ttf");
        
        binding.loginButton.setTypeface(tf);
        binding.TVEmailText.setTypeface(tf);
        binding.TVPasswordText.setTypeface(tf);
        binding.ETEmail.setTypeface(tf);
        binding.ETPassword.setTypeface(tf);
        binding.LVSignUP.setTypeface(tf);
        binding.forgotBtn.setTypeface(tf);

        binding.helpTxt.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String mailto = "mailto:help@writon.co";
                Intent emailIntent = new Intent(Intent.ACTION_SENDTO);
                emailIntent.setData(Uri.parse(mailto));
                startActivity(emailIntent);
            }
        });


        FirebaseAnalytics mFirebaseAnalytics = FirebaseAnalytics.getInstance(this);
        Bundle bundle = new Bundle();
        bundle.putString(FirebaseAnalytics.Param.METHOD, "LoginScreen");
        mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.LOGIN, bundle);


        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new com.google.android.gms.tasks.OnCompleteListener<String>() {
                    @Override
                    public void onComplete(@NonNull Task<String> task) {
                        if (task.isSuccessful()) {
                            String token = task.getResult();
                            Log.d(TAG, "FCM Token: " + token);
                        }
                    }
                });


        // Google Sign-UP removed for email-only login
        /*
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .build();

        googleSignInClient = GoogleSignIn.getClient(this, gso);
        */

        String email = getIntent().getStringExtra("EmailID");
        String password = getIntent().getStringExtra("Password");
        if (email != null && !email.isEmpty() && password != null && !password.isEmpty()) {
            binding.ETEmail.setText(email);
            binding.ETPassword.setText(password);
            tinydb.putBoolean("rememberMe", true);
            validateUser();
        }

        binding.forgotBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                AppUtils.avoidMultipleClicks( binding.forgotBtn );
                showAlertDialog();
            }
        });
        binding.btnFblogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // AppUtils.avoidMultipleClicks( binding.btnFblogin );
                // callFacebook();
            }
        });

        binding.btnGoogleLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                /*
                disableEnableControls( false,binding.container );
                showProgressDialog(true);
                AppUtils.avoidMultipleClicks( binding.btnGoogleLogin );

                isCallingFacebook=false;
                Intent signInIntent = googleSignInClient.getSignInIntent();
                startActivityForResult(signInIntent, 101);
                MyApplication.getInstance().trackEvent("Login Screen", "User Click on login button.", "Google Login Button");
                MyApplication.getInstance().trackScreenView("Login Screen");
                */
            }
        });



        binding.loginButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                AppUtils.avoidMultipleClicks( binding.loginButton );
                validateUser();
            }
        });

        binding.LVSignUP.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                AppUtils.avoidMultipleClicks( binding.LVSignUP );
                Intent home = new Intent(LoginActivity.this, Signup.class);
                MyApplication.getInstance().trackEvent("Login Screen", "User clicked SignUp button", "Signup Button");
                MyApplication.getInstance().trackScreenView("Login Screen");
                startActivity(home);
                finish();
            }
        });

        binding.checkboxRememeberMe.setOnCheckedChangeListener( new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView , boolean isChecked) {
                tinydb.putBoolean( "rememberMe",isChecked );
            }
        } );

    }


    private void disableEnableControls(boolean enable, ViewGroup vg){
        for (int i = 0; i < vg.getChildCount(); i++){
            View child = vg.getChildAt(i);
            child.setEnabled(enable);
            if (child instanceof ViewGroup){
                disableEnableControls(enable, (ViewGroup)child);
            }
        }
    }


    private void validateUser() {
        MyApplication.getInstance().trackEvent("Login Screen", "User Click on login button.", "Login Button");
        MyApplication.getInstance().trackScreenView("Login Screen");

        final String emailOrPenName = binding.ETEmail.getText().toString().trim();
        final String password = binding.ETPassword.getText().toString().trim();

        if (emailOrPenName.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please enter all details", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(Constants.KEY_PREF_PASS, password);
        editor.apply();

        disableEnableControls(false, binding.container);
        showProgressDialog(true);

        RetroFitClient apiService = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        LoginBody loginBody = new LoginBody(emailOrPenName, password);

        Single<LoginUserDetails> call = apiService.login(loginBody);

        call.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<LoginUserDetails>() {
                    @Override
                    public void accept(LoginUserDetails loginUserDetails) throws Exception {
                        disableEnableControls(true, binding.container);
                        showProgressDialog(false);

                        if (loginUserDetails.getUser() != null) {
                            tinydb.putString("userEmail", loginUserDetails.getUser().getEmail());
                            WritOnPreference.getInstance(LoginActivity.this).saveUserDetails(loginUserDetails.getUser());
                            tinydb.putString("userId", loginUserDetails.getUser().getId());

                            Intent home = new Intent(LoginActivity.this, Home_Activity.class);
                            home.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(home);
                            finish();
                        } else {
                            String message = loginUserDetails.getMessage();
                            Toast.makeText(getApplicationContext(), message != null ? message : "Login failed", Toast.LENGTH_LONG).show();
                        }
                    }
                }, new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        disableEnableControls(true, binding.container);
                        showProgressDialog(false);
                        String errorMsg = throwable.getMessage();
                        if (throwable instanceof retrofit2.HttpException) {
                            retrofit2.HttpException httpException = (retrofit2.HttpException) throwable;
                            if (httpException.code() == 401) {
                                errorMsg = "Invalid email/pen name or password";
                            }
                        }
                        Toast.makeText(getApplicationContext(), errorMsg, Toast.LENGTH_LONG).show();
                        Log.d(TAG, "UnSuccessful >>" + throwable.getMessage());
                    }
                });
    }



    /*
    private void login()
    {
        // Dead code removed
    }
    */

    /*@Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        callbackManager.onActivityResult(requestCode, resultCode, data);
    }*/


    private void callFacebook() {
        disableEnableControls( false,binding.container );
        showProgressDialog(true);
        isCallingFacebook=true;
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
        /*
        if ( isCallingFacebook )
        {

            callbackManager.onActivityResult(requestCode, resultCode, data);
            super.onActivityResult(requestCode, resultCode, data);

        }
        else
        {
        */
            super.onActivityResult(requestCode, resultCode, data);
            if (resultCode == Activity.RESULT_OK)
                switch (requestCode) {
                    case 101:
                        disableEnableControls( true,binding.container );
                        showProgressDialog(false);
                        /*
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
                        */
                        break;
                }
            else
            {
                disableEnableControls( true,binding.container );
                showProgressDialog(false);
            }

        // }


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

        RetroFitClient registerClient = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        registerClient.socialSignup( Name,Name,fEmail,"","",provider,userId).enqueue( new Callback<SignupResponse>() {
            @Override
            public void onResponse(Call<SignupResponse> call , retrofit2.Response<SignupResponse> response) {
                disableEnableControls( true,binding.container );
                showProgressDialog(false);
                     if (response.body().getSuccess() == 2  || response.body().getSuccess()==1) {
                         tinydb.putString("userEmail", fEmail);
                         tinydb.putString("userEmail", fEmail);
                        WritOnPreference.getInstance(LoginActivity.this).saveUserDetails(response.body().getData());
                        Intent home = new Intent(LoginActivity.this, Home_Activity.class);
                        home.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(home);
                    } else {
                         String message = response.body().getMessage();
                         Toast.makeText( LoginActivity.this , message , Toast.LENGTH_LONG ).show();
                     }

            }

            @Override
            public void onFailure(Call<SignupResponse> call , Throwable t) {
                disableEnableControls( true,binding.container );
                showProgressDialog(false);
                Toast.makeText( LoginActivity.this , t.getMessage() , Toast.LENGTH_LONG ).show();

            }
        } );


    }

    private void showUserNameDialog()
    {

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
                    WritOnProgressDialog.getInstance().showProgress(LoginActivity.this, "Logging, Please wait...");
                    RetroFitClient forgetPassword = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
                    forgetPassword.forgetPassword( ETEmail.getText().toString().trim() ).subscribeOn( Schedulers.io() )
                            .observeOn( AndroidSchedulers.mainThread() ).subscribe(
                            new Consumer<DefaultResponse>() {
                                @Override
                                public void accept(DefaultResponse defaultResponse) throws Exception {
                                    WritOnProgressDialog.getInstance().hideProgress();
//                                    if ( defaultResponse.getSuccess() )
                                    Toast.makeText(LoginActivity.this, defaultResponse.getMessage(), Toast.LENGTH_LONG).show();

                                }
                            } , new Consumer<Throwable>() {
                                @Override
                                public void accept(Throwable throwable) throws Exception {
                                    WritOnProgressDialog.getInstance().hideProgress();
                                    Toast.makeText(LoginActivity.this, throwable.getMessage(), Toast.LENGTH_LONG).show();

                                }
                            } );

                } else {
                    ETEmail.setError("Please Enter a Valid Email.");
                    ETEmail.requestFocus();
                }
            }
        });
        dialog.show();
    }

    void showProgressDialog(boolean isVisible)
    {

        binding.progressBar.setVisibility( isVisible? View.VISIBLE:View.GONE );

    }
}
