package com.ibitvalley.writon.retroFit;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.ibitvalley.writon.webapi.WebConstants;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory;
import retrofit2.converter.gson.GsonConverterFactory;
import retrofit2.converter.scalars.ScalarsConverterFactory;

public class ServiceGenerator {
    private static Retrofit retrofit;
    private static Retrofit retrofitOld;

    public static Retrofit getRetrofit() {
        Gson gson = new GsonBuilder()
                .setLenient()
                .create();

        OkHttpClient.Builder client = new OkHttpClient.Builder()

                ;

        client.connectTimeout(2, TimeUnit.MINUTES);
        client.readTimeout(2, TimeUnit.MINUTES);
        client.writeTimeout(2, TimeUnit.MINUTES);
        HttpLoggingInterceptor interceptor = new HttpLoggingInterceptor();
        interceptor.setLevel(HttpLoggingInterceptor.Level.BODY);
        client.interceptors().add(interceptor);



        if (retrofit == null){
            retrofit = new Retrofit.Builder()
                    .baseUrl(WebConstants.NEW_BASE_URL)
                    //.addCallAdapterFactory(RxJavaCallAdapterFactory.create())
                    .addConverterFactory( ScalarsConverterFactory.create())
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
                    .client(client.build())
                    .build();
        }
        return retrofit;
    }

    public static Retrofit getRetrofitOld() {
        Gson gson = new GsonBuilder()
                .setLenient()
                .create();

        OkHttpClient.Builder client = new OkHttpClient.Builder()

                ;

        client.connectTimeout(2, TimeUnit.MINUTES);
        client.readTimeout(2, TimeUnit.MINUTES);
        client.writeTimeout(2, TimeUnit.MINUTES);
        HttpLoggingInterceptor interceptor = new HttpLoggingInterceptor();
        interceptor.setLevel(HttpLoggingInterceptor.Level.BODY);
        client.interceptors().add(interceptor);

        if (retrofitOld == null){
            retrofitOld = new Retrofit.Builder()
                    .baseUrl(WebConstants.BASE_URL)
                    //.addCallAdapterFactory(RxJavaCallAdapterFactory.create())
                    .addConverterFactory( ScalarsConverterFactory.create())
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
                    .client(client.build())
                    .build();
        }
        return retrofitOld;
    }
}