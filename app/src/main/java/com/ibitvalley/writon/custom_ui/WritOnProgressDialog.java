package com.ibitvalley.writon.custom_ui;

import android.app.ProgressDialog;
import android.content.Context;

import com.ibitvalley.writon.R;


public class WritOnProgressDialog {

    public static WritOnProgressDialog arrowedProgressDialog;

    private ProgressDialog m_Dialog;


    public static WritOnProgressDialog getInstance() {
        if (arrowedProgressDialog == null) {
            arrowedProgressDialog = new WritOnProgressDialog();
        }
        return arrowedProgressDialog;
    }

    public void showProgress(Context m_Context, String message) {
        m_Dialog = new ProgressDialog(m_Context, R.style.AppThemeDialog);
        m_Dialog.setMessage("" + message);
        m_Dialog.show();
    }
    public void showProgress_show_loading(Context m_Context, boolean show_loading, String message) {
        m_Dialog = new ProgressDialog(m_Context, R.style.AppThemeDialog);
        m_Dialog.setMessage("" + message);
        m_Dialog.setCancelable(show_loading);
        m_Dialog.setCancelable(false);
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
