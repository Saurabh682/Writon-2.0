package com.ibitvalley.writon.custom_ui;

import android.app.AlertDialog;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;

import com.ibitvalley.writon.R;


public class WritOnProgressDialog {

    public static WritOnProgressDialog arrowedProgressDialog;

    private AlertDialog m_Dialog;


    public static WritOnProgressDialog getInstance() {
        if (arrowedProgressDialog == null) {
            arrowedProgressDialog = new WritOnProgressDialog();
        }
        return arrowedProgressDialog;
    }

    public void showProgress(Context m_Context, String message) {
        AlertDialog.Builder builder = new AlertDialog.Builder(m_Context);
        View view = LayoutInflater.from(m_Context).inflate(R.layout.dialog_progress, null);
        TextView textViewMessage = view.findViewById(R.id.textViewMessage);
        textViewMessage.setText(message);
        builder.setView(view);
        builder.setCancelable(false);
        m_Dialog = builder.create();
        m_Dialog.show();
    }
    public void showProgress_show_loading(Context m_Context, boolean show_loading, String message) {
        AlertDialog.Builder builder = new AlertDialog.Builder(m_Context);
        View view = LayoutInflater.from(m_Context).inflate(R.layout.dialog_progress, null);
        TextView textViewMessage = view.findViewById(R.id.textViewMessage);
        textViewMessage.setText(message);
        builder.setView(view);
        builder.setCancelable(show_loading);
        m_Dialog = builder.create();
        m_Dialog.show();
    }

    public void hideProgress() {
        if (m_Dialog != null && m_Dialog.isShowing()) {
            m_Dialog.dismiss();
        }
    }

    public boolean isShowing() {
        if (m_Dialog != null) {
            return m_Dialog.isShowing();
        } else {
            return false;
        }
    }
}
