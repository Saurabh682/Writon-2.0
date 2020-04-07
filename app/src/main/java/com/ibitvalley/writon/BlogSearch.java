package com.ibitvalley.writon;

import android.app.Activity;
import android.app.Dialog;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Point;
import android.os.Bundle;

import android.util.Log;
import android.view.Display;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.PopupWindow;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SearchView;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.google.gson.Gson;
import com.ibitvalley.writon.adapter.BlogSearchAdapter;
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.model.Blog;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class BlogSearch extends AppCompatActivity implements
        SearchView.OnQueryTextListener {


    ArrayList<Blog> myblogArrayList;
    ArrayList<Blog> searchList;
    BlogSearchAdapter adapter;
    RecyclerView recyclerView1;

    EditText tv_Writer, tv_Title;
    Spinner SP_categoryName, tv_categoryL2, SPLanguage;
    ArrayAdapter subadapter;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_blog_search);
        this.setTitle("Search");

        recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        recyclerView1.setLayoutManager(layoutManager);


//        BTNSearch.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                myblogArrayList = new ArrayList<>();
//                searchList = new ArrayList<>();
//                adapter = new BlogSearchAdapter(BlogSearch.this, getApplicationContext(), myblogArrayList);
//                recyclerView1.setAdapter(adapter);
//
//                String[] catParam = String.valueOf(SP_categoryName.getSelectedItem()).split("\\(");
//                String catData = "";
//                if(catParam.length>1){
//                    catData = catParam[0];
//                }
//                String subcat = tv_categoryL2.getSelectedItem().toString();
//                String language = SPLanguage.getSelectedItem().toString();
//                //getBlogsListCallApi(catData, String.valueOf(tv_Writer.getText()), String.valueOf(tv_Title.getText()), subcat, language);
//            }
//        });
        showDialog();

    }




    //    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.searchmenu, menu);
        return true;
//        MenuItem searchItem = menu.findItem(R.id.search);
//        switch (searchItem.getItemId()) {
//            case R.id.search:
//                // do whatever
//                return true;
//            defaulta:
//                return super.onOptionsItemSelected(searchItem);
//        }

        //SearchView searchView = (SearchView) MenuItemCompat.getActionView(searchItem);
        //searchView.setOnQueryTextListener(this);
    }


    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.search:
                // do whatever
                showDialog();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    @Override
    public boolean onQueryTextSubmit(String query) {
        // User pressed the search button

        return false;
    }

    @Override
    public boolean onQueryTextChange(String newText) {
        //showDialog();
        //initiatePopupWindow();
        // User changed the text
//        for(int i=0; i< myblogArrayList.size(); i++)
//        {
//            if(myblogArrayList.get(i).getTitle().indexOf(newText)>0 || myblogArrayList.get(i).getCategory().indexOf(newText)>0 || myblogArrayList.get(i).getShortDescription().indexOf(newText)>0 || myblogArrayList.get(i).getLongDescripton().indexOf(newText)>0){
//                searchList.add(myblogArrayList.get(i));
//            }
//        }
//        if(searchList.size()>0) {
//            myblogArrayList.clear();
//        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
//        recyclerView1.setLayoutManager(layoutManager);
//            adapter = new BlogSearchAdapter(this, this, searchList);
//            recyclerView1.setAdapter(adapter);
//            adapter.notifyDataSetChanged();
//        }
        return false;
    }





    WindowManager.LayoutParams lp;
    WindowManager wm;
    Button BTNSearch1;
    Display display;
    LayoutInflater inflater;
    View layout;
    Dialog d;

    private void showDialog(){
        d = new Dialog(this);
        //  d.getWindow().setBackgroundDrawable(R.color.action_bar_bg);
         d.requestWindowFeature(Window.FEATURE_NO_TITLE);
         d.setContentView(R.layout.searchpopup_layout);

        wm = (WindowManager) this.getSystemService(Context.WINDOW_SERVICE); // for activity use context instead of getActivity()
        display = wm.getDefaultDisplay(); // getting the screen size of device
        Point size = new Point();
        display.getSize(size);
        int width = size.x;  // Set your heights
        int height = size.y - 250; // set your widths

        lp = new WindowManager.LayoutParams();
        lp.copyFrom(d.getWindow().getAttributes());

        lp.width = width;
        lp.height = height;
        d.getWindow().setAttributes(lp);

        inflater = (LayoutInflater) BlogSearch.this.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        layout = inflater.inflate(R.layout.searchpopup_layout, (ViewGroup) findViewById(R.id.searchpopup_element));
        SP_categoryName = (Spinner) d.findViewById(R.id.SP_categoryName);
        SPLanguage = (Spinner) d.findViewById(R.id.SPLanguage);
        tv_categoryL2 = (Spinner) d.findViewById(R.id.tv_categoryL2);
        tv_Writer = (EditText) d.findViewById(R.id.tv_Writer);
        tv_Title = (EditText) d.findViewById(R.id.tv_Title);
        BTNSearch1 = (Button) d.findViewById(R.id.BTNSearch1);
        BTNSearch1.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                d.dismiss();
                myblogArrayList = new ArrayList<>();
                searchList = new ArrayList<>();
                adapter = new BlogSearchAdapter(BlogSearch.this, getApplicationContext(), myblogArrayList);
                recyclerView1.setAdapter(adapter);

                String catData = SP_categoryName.getSelectedItem().toString().trim();
                if(catData.contains("All"))
                {
                    catData = "";
                }
                String subcat = tv_categoryL2.getSelectedItem().toString();
                if(subcat.contains("All"))
                {
                    subcat = "";
                }
                String language = SPLanguage.getSelectedItem().toString();
                if(language.contains("All"))
                {
                    language = "";
                }
                getBlogsListCallApi(catData, String.valueOf(tv_Writer.getText()), String.valueOf(tv_Title.getText()), subcat, language);
            }
        });

        SP_categoryName.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                //Toast.makeText(getApplicationContext(), "Creation name can't be blank", Toast.LENGTH_LONG).show();

                if(position ==1){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory1, R.layout.subcat);
                } else if(position ==2){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory2, R.layout.subcat);
                } else if(position ==3){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory3, R.layout.subcat);
                } else if(position ==4){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory4, R.layout.subcat);
                } else if(position ==5){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory5, R.layout.subcat);
                } else if(position ==6){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory6, R.layout.subcat);
                } else if(position ==7){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory7, R.layout.subcat);
                } else if(position ==8){
                    subadapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory8, R.layout.subcat);
                }
                if(position>0) {
                    subadapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
                    tv_categoryL2.setAdapter(subadapter);
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {

            }
        });

        d.show();
    }





    ProgressDialog progress;
    private void getBlogsListCallApi(String category, String writer, String title, String SubCat, String Language) {
        d.dismiss();
        RequestQueue requestQueue;
        progress = new ProgressDialog(this);
        progress.show();
        progress.setTitle("Please Wait");
        requestQueue = Volley.newRequestQueue(this);
        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String UserId = preferences.getString("UserId", "0");
        String loginURL = String.format("http://blog.ibitvalley.com/api/BlogList?category=%s&writer=%s&title=%s&SubCat=%s&Language=%s", category.replace(" ", "%20"), writer.replace(" ", "%20"), title.replace(" ", "%20"), SubCat.replace(" ", "%20"), Language.replace(" ", "%20"));
        JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, loginURL, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        Log.d("True", "");
                        try {
                            if (progress != null && progress.isShowing())
                                progress.dismiss();
                            if (response.get("success").toString() == "true") {
                                System.out.println("Json == > " + response.toString());
                                JSONObject obj = new JSONObject(response.toString());
                                JSONArray arr = obj.getJSONArray("Result");
                                for (int i = 0; i < arr.length(); i++) {
                                    String blogString = arr.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    myblogArrayList.add(blog);
                                }
                                adapter.notifyDataSetChanged();
                            }
                        } catch (JSONException ex) {
                            if (progress != null && progress.isShowing())
                                progress.dismiss();
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        if (progress != null && progress.isShowing())
                            progress.dismiss();
                        error.printStackTrace();
                        Log.e("Volley", "Error" + error.getMessage());
                    }
                }
        );
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }
}
