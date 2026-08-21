package com.ibitvalley.writon.model;

import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

import io.reactivex.Observer;
import io.reactivex.disposables.Disposable;

public class DeamoObserver implements Observer<Post_List_Data> {




        public DeamoObserver() {
        }

        public void onSubscribe(Disposable disposable) {
            System.out.println("onSubscribe");
        }

        public void onNext(Post_List_Data o) {
            System.out.println("onNext -> {}"+o.getUserName());
        }

        public void onError(Throwable throwable) {
            System.out.println("onError {}"+ throwable.getMessage());
        }

        public void onComplete() {
            System.out.println("onComplete");
        }

}
