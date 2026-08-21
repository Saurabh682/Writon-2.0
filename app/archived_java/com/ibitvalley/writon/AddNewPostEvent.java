package com.ibitvalley.writon;

import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

public class AddNewPostEvent {

    Post_List_Data post_list_data;

    public AddNewPostEvent(Post_List_Data post_list_data) {
        this.post_list_data = post_list_data;
    }

    public Post_List_Data getPost_list_data() {
        return post_list_data;
    }

    public void setPost_list_data(Post_List_Data post_list_data) {
        this.post_list_data = post_list_data;
    }
}
