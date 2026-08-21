package com.ibitvalley.writon.classes.dao;

import android.app.Application;

import androidx.room.Room;

public class MyDatabaseApplication extends Application {
    MyDatabase myDatabase;

    @Override
    public void onCreate() {
        super.onCreate();

        // when upgrading versions, kill the original tables by using fallbackToDestructiveMigration()
        myDatabase = Room.databaseBuilder(this, MyDatabase.class, MyDatabase.NAME).fallbackToDestructiveMigration().build();
    }

    public MyDatabase getMyDatabase() {
        return myDatabase;
    }
}
