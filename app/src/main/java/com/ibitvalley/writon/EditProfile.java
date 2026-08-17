package com.ibitvalley.writon;

import android.app.DatePickerDialog;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.DatePicker;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.databinding.ActivityEditProfileBinding;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.model.UserData;
import com.ibitvalley.writon.model.UserInfo;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.WritOnPreference;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class EditProfile extends BaseActivity {


    private static final String TAG = "EditProfile";
    private OUD_Viewmodel oud_Viewmodel;

    private ActivityEditProfileBinding binding;


    private User userData;
    private int mYear, mMonth, mDay, mHour, mMinute;
    private UserData onlineUserData;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityEditProfileBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        //setContentView(R.layout.activity_edit_profile);
        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        userData = WritOnPreference.getInstance(this).getUserDetails();

        getUserDetails();
        //workingOn.setText(userData.get());
        //dateOfBirth.autofill(userData.getDob());
        assert binding.signupButton != null;
        binding.signupButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                updateDetails();
            }
        });

        binding.openCalender.setOnClickListener( new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showDatePicker();
            }
        } );
    }

    private void showDatePicker()
    {
        // Get Current Date
        final Calendar c = Calendar.getInstance();
        mYear = c.get(Calendar.YEAR);
        mMonth = c.get(Calendar.MONTH);
        mDay = c.get(Calendar.DAY_OF_MONTH);

        DatePickerDialog datePickerDialog = new DatePickerDialog(this,
                new DatePickerDialog.OnDateSetListener() {

                    @Override
                    public void onDateSet(DatePicker view, int year,
                                          int monthOfYear, int dayOfMonth) {

                        binding.openCalender.setText( year+"/"+ (monthOfYear + 1)  + "/" +  dayOfMonth);
//                        binding.openCalender.setText( (monthOfYear + 1) +"/"+ dayOfMonth + "/" + year);

                    }
                }, mYear, mMonth, mDay);
        datePickerDialog.show();
    }


    private void UpdateUI(UserData data) {

        onlineUserData=data;
        //assert binding.ETUserName != null;
        Log.d(TAG, "UpdateUI: "+ data.getUserName());
        if (binding.TVUserName != null) {
            binding.TVUserName.setText(data.getUserName());
        }
        //assert binding.ETfirstName != null;
        if (binding.firstName != null) {
            binding.firstName.setText(data.getName());
        }
        //assert binding.ETlastName != null;
        if (binding.lastName != null) {
            binding.lastName.setText(data.getName());
        }
        //assert binding.TVIntroducaation != null;
        if (binding.TVIntroducaation != null) {
            binding.TVIntroducaation.setText(data.getIntroducation());
        }
        if (binding.ETQuoteOfDay != null && data.getQuoteofDay()!=null) {
            binding.ETQuoteOfDay.setText(data.getQuoteofDay());
        }

        binding.TVWorkingON.setText(data.getWorkingOn());
        if ( binding.openCalender!=null )
            binding.openCalender.setText( onlineUserData.getDob() );
    }


    private void getUserDetails() {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        Call<UserInfo> call = PostList.getUserData(String.valueOf(userData.getId()));

        call.enqueue(new Callback<UserInfo>() {
            @Override
            public void onResponse(@NonNull Call<UserInfo> call, @NonNull Response<UserInfo> response) {
                assert response.body() != null;
                Log.i(TAG, "onResponse : " + response.body());
                //Call for FCM Notification
                UpdateUI(response.body().getData());
            }

            @Override
            public void onFailure(@NonNull Call <UserInfo> call, @NonNull Throwable t) {
                String message = t.toString();
                Toast.makeText(getApplicationContext(), message, Toast.LENGTH_LONG).show();
                Log.d(TAG,"UnSuccessful Rated >>"+ message);
            }
        });
    }

    private void updateDetails() {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        Call<UserData> call = PostList.updateProfile(String.valueOf(userData.getId()), binding.TVUserName.getText().toString(),
                binding.firstName.getText() + " "+binding.lastName.getText(),binding.ETQuoteOfDay.getText().toString(),
                binding.TVWorkingON.getText().toString(),binding.TVIntroducaation.getText().toString(),
                binding.openCalender.getText().toString());

        call.enqueue(new Callback<UserData>() {
            @Override
            public void onResponse(@NonNull Call<UserData> call, @NonNull Response<UserData> response) {
                assert response.body() != null;
                Log.i(TAG, "onResponse : " + response.body());
            }

            @Override
            public void onFailure(@NonNull Call <UserData> call, @NonNull Throwable t) {
                String message = t.toString();
                Toast.makeText(getApplicationContext(), message, Toast.LENGTH_LONG).show();
                Log.d(TAG,"UnSuccessful Rated >>"+ message);
            }
        });
    }
}
