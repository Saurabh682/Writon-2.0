package com.ibitvalley.writon;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.model.Blog;

import java.util.Arrays;

public class writeblogsteponeOld extends BaseActivity {

    TextView BtnStart;
    Blog blog;
    int forSubCatPos;
    ArrayAdapter adapter;
    private Spinner tv_categoryL2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
        setContentView(R.layout.activity_writeblogstepone);
        this.setTitle("What Do You Want to Write");
        blog = (Blog) getIntent().getSerializableExtra("BlogObject");
        BtnStart = (Button) findViewById(R.id.BtnStart);
        //final EditText tv_creatorName = (EditText) findViewById(R.id.tv_creatorName);
        final Spinner tv_categoryName = findViewById(R.id.tv_categoryName);
        MyApplication.getInstance().trackEvent("Blog Writing", "Start Blog", "Blog Writing.");
        MyApplication.getInstance().trackScreenView("Short Description");
        final Spinner SPLanguage = findViewById(R.id.SPLanguage);
        tv_categoryL2 = findViewById(R.id.tv_categoryL2);
        ArrayAdapter adapter2 = ArrayAdapter.createFromResource(this, R.array.array_mainCategory, R.layout.subcat);

        tv_categoryName.setAdapter(adapter2);
        if(blog!=null){
        for(int i=0; i < adapter2.getCount(); i++) {
            if(blog.getCategory().equals(adapter2.getItem(i))){
                tv_categoryName.setSelection(i);
                forSubCatPos = i;
                break;
            }
        }}
        System.out.println("++++++++  "+tv_categoryName.getSelectedItem().toString());

        if(forSubCatPos>=0){
            selectSubCatArray(forSubCatPos);

            tv_categoryL2.setAdapter(adapter);
        } else{
            adapter = ArrayAdapter.createFromResource(this, R.array.array_subCategory, R.layout.subcat);
            //tv_categoryL2.setAdapter(adapter);
        }



        if(blog!=null){
        for(int i=0; i < adapter.getCount(); i++) {
            if(blog.getSubCat().equals(adapter.getItem(i))){
                System.out.println("++++++++  "+adapter.getItem(i)+"i===="+i);
                tv_categoryL2.setSelection(i);
                break;
            }
        }}

        ArrayAdapter adapter3 = ArrayAdapter.createFromResource(this, R.array.array_language, R.layout.subcat);
        SPLanguage.setAdapter(adapter3);
        if(blog!=null){
        for(int i=0; i < adapter3.getCount(); i++) {
            if(blog.getLanguage().equals(adapter3.getItem(i))){
                SPLanguage.setSelection(i);
                break;
            }
        }}

        tv_categoryName.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                //Toast.makeText(getApplicationContext(), "Creation name can't be blank", Toast.LENGTH_LONG).show();

                if(position ==1){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory1, R.layout.subcat);
                } else if(position ==2){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory2, R.layout.subcat);
                } else if(position ==3){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory3, R.layout.subcat);
                } else if(position ==4){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory4, R.layout.subcat);
                } else if(position ==5){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory5, R.layout.subcat);
                } else if(position ==6){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory6, R.layout.subcat);
                } else if(position ==7){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory7, R.layout.subcat);
                } else if(position ==8){
                    adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory8, R.layout.subcat);
                }
                if(position>0) {
                    adapter.setDropDownViewResource(R.layout.subcat);
                    tv_categoryL2.setAdapter(adapter);
                }

                /*if(blog != null){
                    String[] subCate = getResources().getStringArray(R.array.array_subCategory);
                    tv_categoryL2.setSelection(Arrays.asList(subCate).indexOf(blog.getSubCat()));
                }*/
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {

            }



        });



        tv_categoryL2.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                // Your code here
                if(blog != null){
                    String[] subCate = getResources().getStringArray(R.array.array_subCategory);
                    tv_categoryL2.setSelection(Arrays.asList(adapter).indexOf(blog.getSubCat()));
                }
            }

            public void onNothingSelected(AdapterView<?> adapterView) {

            }
        });

        final EditText tv_shortDesc = (EditText) findViewById(R.id.tv_shortDesc);
        if (blog != null) {
            //tv_creatorName.setText(blog.getTitle());
            //tv_categoryName.setText(blog.getCategory());
            String[] mainCate = getResources().getStringArray(R.array.array_mainCategory);
            String[] languageArray  = getResources().getStringArray(R.array.array_language);

            tv_categoryName.setSelection(Arrays.asList(mainCate).indexOf(blog.getCategory()));

            tv_shortDesc.setText(blog.getShortDescription());
            SPLanguage.setSelection(Arrays.asList(languageArray).indexOf(blog.getLanguage()));
        }
        BtnStart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
//                if(tv_creatorName.getText().toString().trim().length()<=0){
//                    Toast.makeText(getApplicationContext(), "Creation name can't be blank", Toast.LENGTH_LONG).show();
//                    return;
//                }
                //if(tv_categoryName.getSelectedItem().toString().trim().length()<=0){
                if(tv_categoryName.getSelectedItemPosition()<=0){
                    Toast.makeText(getApplicationContext(), "Category can't be blank", Toast.LENGTH_LONG).show();
                    return;
                }

                if(tv_categoryL2.getSelectedItemPosition()<=0){
                    Toast.makeText(getApplicationContext(), "Category can't be blank", Toast.LENGTH_LONG).show();
                    return;
                }
                if(SPLanguage.getSelectedItemPosition()<=0){
                    Toast.makeText(getApplicationContext(), "Language can't be blank", Toast.LENGTH_LONG).show();
                    return;
                }
//                if(tv_creatorName.getText().toString().trim().length()> 80){
//                    Toast.makeText(getApplicationContext(), "Creation name can't be more than 80 character", Toast.LENGTH_LONG).show();
//                    return;
//                }
//                if(tv_shortDesc.getText().toString().trim().length()<=0){
//                    Toast.makeText(getApplicationContext(), "Short Description can't be blank", Toast.LENGTH_LONG).show();
//                    return;
//                }
                Intent intent = new Intent(writeblogsteponeOld.this, WriteBlog.class);
                //intent.putExtra("CreatorName", tv_creatorName.getText().toString());
                intent.putExtra("Category", tv_categoryName.getSelectedItem().toString());
                intent.putExtra("SubCat", tv_categoryL2.getSelectedItem().toString());
                if(tv_shortDesc.getText().toString().length()<=0){
                    tv_shortDesc.setText(String.format("%s, %s", tv_categoryName.getSelectedItem().toString(), tv_categoryL2.getSelectedItem().toString()));
                }
                intent.putExtra("shortDesc", tv_shortDesc.getText().toString());
                intent.putExtra("language", SPLanguage.getSelectedItem().toString());
                if (blog != null) {
                    intent.putExtra("BlogObject", blog);
                    blog.setTitle(blog.getTitle());
                    blog.setCategory(tv_categoryName.getSelectedItem().toString());
                    blog.setSubCat(tv_categoryL2.getSelectedItem().toString());
                    blog.setLanguage(SPLanguage.getSelectedItem().toString());
                    blog.setShortDescription(tv_shortDesc.getText().toString());
                }
                startActivity(intent);
            }
        });

    }

    public void selectSubCatArray(int position){
        System.out.println("++++++++  "+ position);
        if(position ==1){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory1, R.layout.subcat);
        } else if(position ==2){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory2, R.layout.subcat);
        } else if(position ==3){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory3, R.layout.subcat);
        } else if(position ==4){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory4, R.layout.subcat);
        } else if(position ==5){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory5, R.layout.subcat);
        } else if(position ==6){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory6, R.layout.subcat);
        } else if(position ==7){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory7, R.layout.subcat);
        } else if(position ==8){
            adapter = ArrayAdapter.createFromResource(getApplicationContext(), R.array.array_subCategory8, R.layout.subcat);
        }

        if(blog!=null){
            for(int i=0; i < adapter.getCount(); i++) {
                if(blog.getSubCat().equals(adapter.getItem(i))){

                    tv_categoryL2.setSelection(i);
                    System.out.println("pppppppp  "+tv_categoryL2.getSelectedItemPosition());
                    break;
                }
            }}
    }


}
