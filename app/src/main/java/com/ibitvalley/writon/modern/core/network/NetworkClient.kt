package com.ibitvalley.writon.modern.core.network

import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkClient {

    private val baseUrl = BuildConfig.API_BASE_URL.trim().let {
        if (it.endsWith('/')) it else "$it/"
    }
    private var userAuthToken: String? = null

    fun setAuthToken(token: String?) {
        userAuthToken = token
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val builder = original.newBuilder()

        userAuthToken?.let { token ->
            builder.header("Authorization", "Bearer $token")
        }

        builder.header("Accept", "application/json")
        chain.proceed(builder.build())
    }

    private val tokenAuthenticator = Authenticator { _: Route?, response: Response ->
        // Prevent infinite retry loops
        if (responseCount(response) >= 3) return@Authenticator null

        val freshToken = FirebaseAuthManager.getFreshTokenBlocking()
        if (!freshToken.isNullOrBlank()) {
            userAuthToken = freshToken
            response.request.newBuilder()
                .header("Authorization", "Bearer $freshToken")
                .build()
        } else {
            null
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
        redactHeader("Authorization")
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .authenticator(tokenAuthenticator)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val apiService: WritOnApiService by lazy {
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(WritOnApiService::class.java)
    }
}
