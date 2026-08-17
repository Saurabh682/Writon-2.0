package com.ibitvalley.writon;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
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

public class Report extends BaseActivity {


    TextView tv_creatorName, tv_shortDesc, tv_elase;
    Spinner tv_categoryName;
    Button btnSubmit;
    User userData;
    String blogID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_report);
        userData = WritOnPreference.getInstance(this).getUserDetails();
        blogID = getIntent().getStringExtra("blogID");

        initControls();

    }



    private void initControls(){
        tv_creatorName = findViewById(R.id.tv_creatorName);
        tv_categoryName = findViewById(R.id.tv_categoryName);
        tv_shortDesc = findViewById(R.id.tv_shortDesc);
        tv_elase = findViewById(R.id.tv_elase);

        btnSubmit = findViewById(R.id.btnSubmit);

//        tv_categoryName.setOnItemClickListener(new AdapterView.OnItemClickListener() {
//            @Override
//            public void onItemClick(AdapterView <?> parent, View view, int position, long id) {
//                Toast.makeText(Report.this, tv_categoryName.getSelectedItem().toString(), Toast.LENGTH_SHORT).show();
//            }
//        });

        btnSubmit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if(fieldValidation()){
                    // Call API........
                    MyApplication.getInstance().trackEvent("Reporting Screen", "User Click on report button.", "Report Button");
                    MyApplication.getInstance().trackScreenView("Report Screen");
                    submitReport();
                }
            }
        });

    }

    private boolean fieldValidation(){
        boolean isValid = true;

        if(tv_creatorName.getText().toString().length() == 0 || tv_categoryName.getSelectedItem().toString().length() == 0
        || tv_shortDesc.getText().toString().length() == 0 || tv_elase.getText().toString().length() == 0){
            Toast.makeText(this, "Please enter mandatory fields", Toast.LENGTH_SHORT).show();
            return isValid = false;
        }
        return  isValid;
    }


    private void submitReport() {

        HashMap <String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("BlogId", blogID);
        hmHomeParam.put("Report", tv_categoryName.getSelectedItem().toString());

        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.submit_report_url, this, true, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(Report.this, message, Toast.LENGTH_LONG).show();
                            finish();
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(Report.this, message, Toast.LENGTH_LONG).show();
                        }
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


}
