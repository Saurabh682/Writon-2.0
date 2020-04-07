package com.ibitvalley.writon;

import android.app.DatePickerDialog;
import android.app.ProgressDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.GridView;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.VolleyError;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.adapter.GridViewAdapter;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebApiParams;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;

import de.hdodenhof.circleimageview.CircleImageView;

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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        //getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_signup);
        fbEmail = getIntent().getStringExtra("fbEmail");
        fbId = getIntent().getStringExtra("fbId");
        getSupportActionBar().hide();
        spinner = (Spinner) findViewById(R.id.spinner);
        llChangeAvatar = (LinearLayout) findViewById(R.id.llChangeAvatar);
        avatarImageView = (CircleImageView) findViewById(R.id.avatarImageView);
        //first_name = (EditText) findViewById(R.id.first_name);
        TVUserName = (EditText) findViewById(R.id.TVUserName);
        //last_name = (EditText) findViewById(R.id.last_name);
        email = (EditText) findViewById(R.id.email);
        et_Mobile = findViewById(R.id.et_Mobile);
        password = (EditText) findViewById(R.id.password);
        Cpassword = (EditText) findViewById(R.id.Cpassword);
        signin = (TextView) findViewById(R.id.signin);
        //opencalender = (TextView) findViewById(R.id.open_calender);
        signup_button = (TextView) findViewById(R.id.signup_button);
        CBtandc = (CheckBox) findViewById(R.id.CBtandc);
        TVTerms = (TextView) findViewById(R.id.TVTerms);
        String text = "<a href='#'>Terms and Conditions.</a>";
        TVTerms.setText(Html.fromHtml(text));
        TVTerms.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                shDialog();
            }
        });

        String[] items = new String[]{"Gender", "Male", "Female", "Other"};
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(this, R.layout.spinner_text_layout, items);
        //spinner.setAdapter(adapter);
        signin.setOnClickListener(this);
        signup_button.setOnClickListener(this);
        //opencalender.setOnClickListener(this);
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


//        spinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
//            @Override
//            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
//                gender_selected = spinner.getItemAtPosition(position).toString().trim();
//                if (gender_selected.equals("Male")) {
//                    gender = "1";
//                }
//                if (gender_selected.equals("Female")) {
//                    gender = "2";
//                }
//            }
//
//            @Override
//            public void onNothingSelected(AdapterView<?> parent) {
//
//            }
//        });

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

//        opencalender.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                new DatePickerDialog(Signup.this, date, myCalendar.get(Calendar.YEAR), myCalendar.get(Calendar.MONTH), myCalendar.get(Calendar.DAY_OF_MONTH)).show();
//            }
//        });
    }

    public void updatedate() {
        String myFormat = "MM/dd/yy"; //In which you need put here
        SimpleDateFormat sdf = new SimpleDateFormat(myFormat, Locale.US);
        //opencalender.setText(sdf.format(myCalendar.getTime()));
        year = myCalendar.get(Calendar.YEAR);
        month = myCalendar.get(Calendar.MONTH)+1;
        day = myCalendar.get(Calendar.DAY_OF_MONTH);
    }

    ProgressDialog progress;

    private void checkValidation() {
        if (email.getText().toString().equals("") && password.getText().toString().trim().trim().equals("") && TVUserName.getText().toString().trim().equals("")) {
            //first_name.setError("First Name cannot be empty");
            //last_name.setError("Last Name cannot be empty");
            email.setError("Email cannot be empty");
            password.setError("Password cannot be empty");
            TVUserName.setError("UserName cannot be empty");
        } else if (TVUserName.getText().toString().trim().equals("")) {
            TVUserName.setError("UserName cannot be empty");
        }
        else if (email.getText().toString().trim().equals("")) {
            email.setError("Email cannot be empty");
        }if(!password.getText().toString().trim().equals(Cpassword.getText().toString().trim())){
            Cpassword.setError("Passwords must match");
        } else if (password.getText().toString().trim().equals("")) {
            password.setError("Password cannot be empty");
        }
        else if (!email.getText().toString().contains("@")) {
            email.setError("Invalid Email ID");
        }
//        else if (month == 0) {
//            //opencalender.setError("Please Select DateOfBirth");
//            Toast.makeText(getApplicationContext(), "Please Select DateOfBirth", Toast.LENGTH_LONG).show();
//
//        }
//        else if (gender_selected.equals("Gender")) {
//           Toast.makeText(getApplicationContext(), "Please Select Gender", Toast.LENGTH_LONG).show();
//        }

        else if (!CBtandc.isChecked()) {
            Toast.makeText(Signup.this, "Please Accept the Terms and Conditions", Toast.LENGTH_SHORT).show();
        } else {
            //String token = String.valueOf(FirebaseInstanceId.getInstance().getToken());
            //String signUPUrl = String.format("http://blog.ibitvalley.com/api/Registration?Email=%s&Password=%s&UserName=%s&QuoteofDay=&Introducation=&WorkingOn=&AvatorCode=%s&FcmID=%s",  email.getText().toString().trim(), password.getText().toString().trim(), TVUserName.getText().toString().trim(), selectedAvtarType, token);
            //signUPUrl = signUPUrl.replace(" ", "%20");
            //sendRegistrationRequest(signUPUrl);
            createUserAccount();
            MyApplication.getInstance().trackEvent("SignUp Screen", "SignUp Button", "User Click on SignUp.");
            MyApplication.getInstance().trackScreenView("SignUp");
        }
    }


    private void createUserAccount() {


        final String emailValue = email.getText().toString().trim();
       // final String mobileValue = et_Mobile.getText().toString().trim();
        final String passwordValue = password.getText().toString().trim();
        final String userPenNameValue = TVUserName.getText().toString().trim();


        HashMap <String, String> hmLoginParams = WebApiParams.getRegistrationParams(userPenNameValue, emailValue, passwordValue);
        SmartPostWebRequest loginRequest = new SmartPostWebRequest(WebConstants.Register_API, Signup.this, true, hmLoginParams, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            Toast.makeText(Signup.this, jsonResponse.get("message").toString(), Toast.LENGTH_LONG).show();
                            Intent home = new Intent(Signup.this, LoginActivity.class);
                            //home.putExtra("EmailID", emailValue);
                            //home.putExtra("Password", passwordValue);
                            startActivity(home);
                            finish();
                        } else {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(Signup.this, message, Toast.LENGTH_LONG).show();
                        }
                    }
                } catch (JSONException e) {
                    //e.printStackTrace();
                    Toast.makeText(Signup.this, e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onError(VolleyError error) {
                Toast.makeText(Signup.this, error.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(loginRequest);
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
        switch (v.getId()) {
            case R.id.signin:
                Intent login = new Intent(Signup.this, LoginActivity.class);
                startActivity(login);
                finish();
                break;
            case R.id.signup_button:
                checkValidation();
                break;
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
}
