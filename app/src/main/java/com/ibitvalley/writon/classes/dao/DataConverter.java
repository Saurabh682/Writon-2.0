package com.ibitvalley.writon.classes.dao;

import androidx.paging.PagedList;
import androidx.room.TypeConverter;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.classes.roomdataclasses.Other_Users_Room;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.MyWorldModel;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class DataConverter {
    private static Gson gson = new Gson();
    @TypeConverter
    public static List<Other_Users_Room> userList(String data) {
        if (data == null) {
            return Collections.emptyList();
        }
        Type listType = new TypeToken<List<Other_Users_Room>>() {}.getType();

        return gson.fromJson(data, listType);
    }

    @TypeConverter
    public static String to_usersList(List<Other_Users_Room> userList) {

        return gson.toJson(userList);
    }


    @TypeConverter
    public static List<MyWorldModel> myWorldModels(String data) {
        if (data == null) {
            return Collections.emptyList();
        }
        Type listType = new TypeToken<List<MyWorldModel>>() {}.getType();

        return gson.fromJson(data, listType);
    }

    @TypeConverter
    public static String to_myWorldModels(List<MyWorldModel> userList) {

        return gson.toJson(userList);
    }


    @TypeConverter
    public static List<Post_List_Data> toPost_List_data_List(String data) {
        if (data == null) {
            return Collections.emptyList();
        }
        Type listType = new TypeToken<List<Post_List_Data>>() {}.getType();

        return gson.fromJson(data, listType);
    }

    @TypeConverter
    public static String toPost_List_data(List<Post_List_Data> userList) {

        return gson.toJson(userList);
    }



}