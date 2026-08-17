package com.ibitvalley.writon;

import android.app.DatePickerDialog;
import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.text.Html;
import android.view.View;
import android.view.Window;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.GridView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.analytics.FirebaseAnalytics;
import com.ibitvalley.writon.adapter.GridViewAdapter;
import com.ibitvalley.writon.classes.model.SignupBody;
import com.ibitvalley.writon.classes.model.SignupResponse;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.webapi.WebApiParams;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;

import de.hdodenhof.circleimageview.CircleImageView;
import io.reactivex.Single;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

import static com.ibitvalley.writon.model.AvtarUtil.getAvtarData;
import static com.ibitvalley.writon.model.AvtarUtil.getAvtarDrawableByType;

public class Signup extends AppCompatActivity implements View.OnClickListener {


    Spinner spinner;
    TextView opencalender, signin, TVTerms;
    TextView signup_button;
    Calendar myCalendar = Calendar.getInstance();
    EditText first_name, last_name, email, password, TVUserName, Cpassword, et_Mobile;
    String gender_selected;
    String gender;
    int month, day, year;
    String fbId = "", fbEmail = "";
    LinearLayout llChangeAvatar;
    CircleImageView avatarImageView;
    int selectedAvtarType = 0;
    CheckBox CBtandc;
    private TinyDB tinydb;
    ProgressBar progressBar;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_signup);
        fbEmail = getIntent().getStringExtra("fbEmail");
        fbId = getIntent().getStringExtra("fbId");
        getSupportActionBar().hide();
        llChangeAvatar = (LinearLayout) findViewById(R.id.llChangeAvatar);
        avatarImageView = (CircleImageView) findViewById(R.id.avatarImageView);
        TVUserName = (EditText) findViewById(R.id.TVUserName);
        email = (EditText) findViewById(R.id.email);
        et_Mobile = findViewById(R.id.et_Mobile);
        password = (EditText) findViewById(R.id.password);
        Cpassword = (EditText) findViewById(R.id.Cpassword);
        signin = (TextView) findViewById(R.id.signin);
        signup_button = (TextView) findViewById(R.id.signup_button);
        CBtandc = (CheckBox) findViewById(R.id.CBtandc);
        TVTerms = (TextView) findViewById(R.id.TVTerms);
        String text = "<a href='#'>Terms and Conditions.</a>";
        TVTerms.setText(Html.fromHtml(text));
        tinydb = new TinyDB(getApplicationContext());
        progressBar=findViewById( R.id.progress_bar );
        TVTerms.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                shDialog();
            }
        });

        String[] items = new String[]{"Gender", "Male", "Female", "Other"};
        signin.setOnClickListener(this);
        signup_button.setOnClickListener(this);
        llChangeAvatar.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showAvtarSelectorPopup();
            }
        });


        Bundle bundle = new Bundle();
        bundle.putString(FirebaseAnalytics.Param.METHOD, "SignUp");
        FirebaseAnalytics mFirebaseAnalytics = FirebaseAnalytics.getInstance(this);
        mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.SIGN_UP, bundle);


        final DatePickerDialog.OnDateSetListener date = new DatePickerDialog.OnDateSetListener() {
            @Override
            public void onDateSet(DatePicker view, int year, int monthOfYear,
                                  int dayOfMonth) {
                // TODO Auto-generated method stub
                myCalendar.set(Calendar.YEAR, year);
                myCalendar.set(Calendar.MONTH, monthOfYear);
                myCalendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                updatedate();
            }
        };

    }

    public void updatedate() {
        String myFormat = "MM/dd/yy"; //In which you need put here
        SimpleDateFormat sdf = new SimpleDateFormat(myFormat, Locale.US);
        year = myCalendar.get(Calendar.YEAR);
        month = myCalendar.get(Calendar.MONTH)+1;
        day = myCalendar.get(Calendar.DAY_OF_MONTH);
    }

    ProgressDialog progress;

    private void checkValidation() {
        String emailStr = email.getText().toString().trim();
        String passStr = password.getText().toString().trim();
        String cPassStr = Cpassword.getText().toString().trim();
        String userNameStr = TVUserName.getText().toString().trim();

        if (userNameStr.isEmpty()) {
            TVUserName.setError("Pen Name cannot be empty");
            TVUserName.requestFocus();
        } else if (emailStr.isEmpty()) {
            email.setError("Email cannot be empty");
            email.requestFocus();
        } else if (!emailStr.contains("@")) {
            email.setError("Invalid Email ID");
            email.requestFocus();
        } else if (passStr.isEmpty()) {
            password.setError("Password cannot be empty");
            password.requestFocus();
        } else if (passStr.length() < 6) {
            password.setError("Password must be at least 6 characters");
            password.requestFocus();
        } else if (!passStr.equals(cPassStr)) {
            Cpassword.setError("Passwords must match");
            Cpassword.requestFocus();
        } else if (!CBtandc.isChecked()) {
            Toast.makeText(Signup.this, "Please Accept the Terms and Conditions", Toast.LENGTH_SHORT).show();
        } else {
            createUserAccount();
            MyApplication.getInstance().trackEvent("SignUp Screen", "SignUp Button", "User Click on SignUp.");
            MyApplication.getInstance().trackScreenView("SignUp");
        }
    }


    private void createUserAccount() {
        final String emailValue = email.getText().toString().trim();
        final String passwordValue = password.getText().toString().trim();
        final String userPenNameValue = TVUserName.getText().toString().trim();

        showProgressDialog(true);
        signup_button.setEnabled(false);

        RetroFitClient registerClient = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        SignupBody signupBody = new SignupBody();
        signupBody.setPenName(userPenNameValue);
        signupBody.setFullName(userPenNameValue);
        signupBody.setEmail(emailValue);
        signupBody.setPassword(passwordValue);

        Single<SignupResponse> registerCall = registerClient.register(signupBody);

        registerCall.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<SignupResponse>() {
                    @Override
                    public void accept(SignupResponse signupResponse) throws Exception {
                        showProgressDialog(false);
                        signup_button.setEnabled(true);

                        if (signupResponse.getUser() != null) {
                            Toast.makeText(Signup.this, "Signup Successful! Please Login.", Toast.LENGTH_LONG).show();
                            Intent home = new Intent(Signup.this, LoginActivity.class);
                            home.putExtra("EmailID", emailValue);
                            home.putExtra("Password", passwordValue);
                            startActivity(home);
                            finish();
                        } else {
                            String message = signupResponse.getMessage();
                            Toast.makeText(Signup.this, message != null ? message : "Signup failed", Toast.LENGTH_LONG).show();
                        }
                    }
                }, new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        signup_button.setEnabled(true);
                        showProgressDialog(false);
                        String errorMsg = throwable.getMessage();
                        if (throwable instanceof retrofit2.HttpException) {
                            retrofit2.HttpException httpException = (retrofit2.HttpException) throwable;
                            if (httpException.code() == 409) {
                                errorMsg = "Email or Pen Name already registered";
                            }
                        }
                        Toast.makeText(Signup.this, errorMsg, Toast.LENGTH_LONG).show();
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

    @Override
    public void onClick(View v) {
        int id = v.getId();
        if (id == R.id.signin) {
            Intent login = new Intent(Signup.this, LoginActivity.class);
            startActivity(login);
            finish();
        } else if (id == R.id.signup_button) {
            checkValidation();
        }
    }

    @Override
    public void onBackPressed() {
        // TODO Auto-generated method stub
        Intent login = new Intent(Signup.this, LoginActivity.class);
        startActivity(login);
        finish();
    }


    private void shDialog() {
        AlertDialog.Builder alertDialog = new AlertDialog.Builder(Signup.this);

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

    void showProgressDialog(boolean isVisible)
    {
        progressBar.setVisibility( isVisible? View.VISIBLE:View.GONE );
    }
}
