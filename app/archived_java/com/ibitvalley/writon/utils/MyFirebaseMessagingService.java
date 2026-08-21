package com.ibitvalley.writon.utils;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.ibitvalley.writon.ActivityBlogComments;
import com.ibitvalley.writon.Blog_Profile;
import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.PrefManager;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.model.User;

import java.util.Objects;

/**
 * Created by kushwaha on 22-Nov-16.
 */

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";
    private PrefManager prefManager;

    /**
     * Called when message is received.
     *
     * @param remoteMessage Object representing the message received from Firebase Cloud Messaging.
     */
    // [START receive_message]
    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // [START_EXCLUDE]
        // There are two types of messages data messages and notification messages. Data messages
        // are handled
        // here in onMessageReceived whether the app is in the foreground or background. Data
        // messages are the type
        // traditionally used with GCM. Notification messages are only received here in
        // onMessageReceived when the app
        // is in the foreground. When the app is in the background an automatically generated
        // notification is displayed.
        // When the user taps on the notification they are returned to the app. Messages
        // containing both notification
        // and data payloads are treated as notification messages. The Firebase console always
        // sends notification
        // messages. For more see: https://firebase.google.com/docs/cloud-messaging/concept-options
        // [END_EXCLUDE]




        // TODO(developer): Handle FCM messages here.
        // Not getting messages here? See why this may be: https://goo.gl/39bRNJ
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        prefManager = new PrefManager(this);
        prefManager.setIsNotification(true);
        // Check if message contains a data payload.
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());



            if ( remoteMessage.getData().containsKey( "action" )) //
            {
                Bundle bundle=new Bundle(  );
                String action=remoteMessage.getData().get( "action" );
             if ( remoteMessage.getData().get( "action" ).equalsIgnoreCase( "1" )  )//follow
             {
                 bundle.putString( "UserID",remoteMessage.getData().get( "user_id" ) );

             }else if ( remoteMessage.getData().get( "action" ).equalsIgnoreCase( "2" ) ) //discuss
             {
                 bundle.putString( "BlogId",remoteMessage.getData().get( "BlogId" ) );

             }else if ( remoteMessage.getData().get( "action" ).equalsIgnoreCase( "3" ) ) //bookmark,rate,post
             {
                 bundle.putString( "blogId",remoteMessage.getData().get( "BlogId" ) );
                 bundle.putString( "boxTitle","Notification" );
             }
                sendNotification(Objects.requireNonNull(remoteMessage.getNotification()).getBody(),action,bundle);
            }
            else
            {
                sendNotification(Objects.requireNonNull(remoteMessage.getNotification()).getBody(),"",null);
            }

        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        Log.d(TAG, "Refreshed token: " + token);

        // If you want to send messages to this application instance or
        // manage this apps subscriptions on the server side, send the
        // Instance ID token to your app server.
        sendRegistrationToServer(token);
    }

    private void sendRegistrationToServer(String token) {
        // TODO: Implement this method to send token to your app server.
        User userData = WritOnPreference.getInstance(getApplicationContext()).getUserDetails();

        if(userData != null) {
            AppUtils.registerFcm( this,token );
        }
    }


    private void sendNotification(String messageBody, String action, Bundle bundle) {
        Intent intent=new Intent(  );

        if ( !AppUtils.isNull( action ) && action.length()>0)
        {
            if ( action.equals( "1" ) )
            {
                intent = new Intent(this, Blog_Profile.class);
            }
            else if ( action.equals( "2" ) )
            {
                intent = new Intent(this, ActivityBlogComments.class);
            }
            else if ( action.equals( "3" ) )
            {
                intent = new Intent(this, ShowBlogDetails.class);
            }
            intent.putExtras( bundle );
        }else
            intent = new Intent(this, Home_Activity.class);

        prefManager = new PrefManager(this);

        prefManager.setIsNotification(true);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0 /* Request code */, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        String channelId = getString(R.string.default_notification_channel_id);
        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(R.drawable.appcon)
                        .setContentTitle(getString(R.string.fcm_message))
                        .setContentText(messageBody)
                        .setAutoCancel(true)
                        .setSound(defaultSoundUri)
                        .setContentIntent(pendingIntent);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Since android Oreo notification channel is needed.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId,
                    "WritOn Notification",
                    NotificationManager.IMPORTANCE_DEFAULT);
            assert notificationManager != null;
            notificationManager.createNotificationChannel(channel);
        }

        assert notificationManager != null;
        notificationManager.notify(0 /* ID of notification */, notificationBuilder.build());
    }





}