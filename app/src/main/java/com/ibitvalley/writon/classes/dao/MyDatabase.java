package com.ibitvalley.writon.classes.dao;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.room.Database;
import androidx.room.DatabaseConfiguration;
import androidx.room.InvalidationTracker;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.sqlite.db.SupportSQLiteOpenHelper;

import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.User_List_Data;
import com.ibitvalley.writon.model.MyWorldModel;

@Database(entities={BookMark_List_Data.class, Post_List_Data.class, User_List_Data.class, PersonalPost_List_Data.class, MyWorldModel.class}, version=3, exportSchema = false)
public abstract class MyDatabase extends RoomDatabase {

    private static MyDatabase INSTANCE;

    public abstract OtherUserDao OUD();
    //public abstract OUD_Viewmodel ViewModel();

    // Database name to be used
    static final String NAME = "MyDataBase";


    public static MyDatabase getDatabase(final Context context) {
        if (INSTANCE == null) {
            INSTANCE = Room.databaseBuilder(context.getApplicationContext(),
                    MyDatabase.class, MyDatabase.class.getName())

                    //if you want create db only in memory, not in file
                    //Room.inMemoryDatabaseBuilder
                    //(context.getApplicationContext(), DataRoomDbase.class)
                    .fallbackToDestructiveMigration()
                    .build();
        }
        return INSTANCE;
    }

    public static void destroyInstance() {
        INSTANCE = null;
    }

    @NonNull
    @Override
    protected SupportSQLiteOpenHelper createOpenHelper(DatabaseConfiguration config) {
        return null;
    }

    @NonNull
    @Override
    protected InvalidationTracker createInvalidationTracker() {
        return null;
    }

    @Override
    public void clearAllTables() {

    }
}
