package com.ibitvalley.writon.webapi;

import java.util.HashMap;



public class WebApiParams {

    public static HashMap<String, String> getdeviceRegistration(String token_fcm, String deviceId, String userId) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_DEVICE_TYPE, "android");
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_TOKEN_FCM, token_fcm);
        //hashMap.put(WebApiKeys.Action_Device_Registation.KEY_DEVICE_ID, deviceId);
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_USER_ID, userId);
        return hashMap;
    }

    public static HashMap<String, String> getLoginParams(String username, String password) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Login.KEY_UserName, username);
        hashMap.put(WebApiKeys.Action_Login.KEY_Password, password);
        return hashMap;
    }

    public static HashMap<String, String> getyserProfileParam(String userid) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_USER_ID, userid);
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_USERID, userid);
        return hashMap;
    }

    public static HashMap<String, String> sendOTP(String username) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Common_Key.KEY_module, "fpass_email");
        hashMap.put(WebApiKeys.Action_Register.KEY_email, username);
        return hashMap;
    }


    public static HashMap<String, String> validateOTP(String otp, String email) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Common_Key.KEY_module, "fpass_otp");
        hashMap.put(WebApiKeys.Action_Register.KEY_otp, otp);
        hashMap.put(WebApiKeys.Action_Register.KEY_email, email);
        return hashMap;
    }


    public static HashMap<String, String> getOrderDetails(String orderID) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Common_Key.KEY_Order_ID, orderID);
        return hashMap;
    }


    public static HashMap<String, String> getPointParams(String vendorID, String token_fcm) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Token.KEY_Token, token_fcm);
        hashMap.put("UserId", vendorID);
        hashMap.put("RoleId", "3");
        hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        return hashMap;
    }

    public static HashMap<String, String> getRegistrationParams(String PenName, String email , String password) {
        HashMap<String, String> hashMap = new HashMap<>();

        hashMap.put("PenName", PenName);
        //hashMap.put("Name", PenName);
        hashMap.put("Email", email);
        //hashMap.put("Mobile", MobileNo);
        hashMap.put("Password", password);

        return hashMap;
    }

    public static HashMap<String, String> getRegistrationParamsFB(String name, String email , String providerId, String Provider) {
        HashMap<String, String> hashMap = new HashMap<>();

        hashMap.put("Name", name);
        hashMap.put("PenName", name);
        hashMap.put("Email", email);
        hashMap.put("Provider", Provider);
        hashMap.put("ProviderId", providerId);

        return hashMap;
    }



    public static HashMap<String, String> getUpdateUserData( String Name, String MobileNo, String email) {
        HashMap<String, String> hashMap = new HashMap<>();

        hashMap.put(WebApiKeys.Action_Register.KEY_module, "profile");
        hashMap.put(WebApiKeys.Action_Register.KEY_name, Name);
        hashMap.put(WebApiKeys.Action_Register.KEY_phone, MobileNo);
        hashMap.put(WebApiKeys.Action_Register.KEY_email, email);

        return hashMap;
    }



    public static HashMap<String, String> setNewPassword( String email, String new_passc) {
        HashMap<String, String> hashMap = new HashMap<>();

        hashMap.put(WebApiKeys.Action_Register.KEY_module, "fpass_new");
        hashMap.put(WebApiKeys.Action_Register.KEY_email, email);
        hashMap.put(WebApiKeys.Action_Register.KEY_new_pass, new_passc);
        hashMap.put(WebApiKeys.Action_Register.KEY_confirm_pass, new_passc);

        return hashMap;
    }



    /*public static HashMap<String, String> getCustomerRegistrationParams(String FirstName, String LastName, String MobileNo, String email, String gender, String ValidateRefrealCode, String password) {
        HashMap<String, String> hashMap = new HashMap<>();

        hashMap.put(WebApiKeys.Common_Key.KEY_FNAME, FirstName);
        hashMap.put(WebApiKeys.Common_Key.KEY_LNAME, LastName);
        hashMap.put(WebApiKeys.Common_Key.KEY_MobileNo, MobileNo);
        hashMap.put(WebApiKeys.Common_Key.KEY_Email, email);

        hashMap.put(WebApiKeys.Common_Key.KEY_ValidateRefrealCode, ValidateRefrealCode);
        hashMap.put(WebApiKeys.Common_Key.KEY_Password, password);

        return hashMap;
    }*/



    public static HashMap<String, String> getTokenParams(String sessiontoken) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);
        return hashMap;
    }


    public static HashMap<String, String> getMainCategory(String sessiontoken) {
        HashMap<String, String> hashMap = new HashMap<>();
        //hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);
        //hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        //hashMap.put(WebApiKeys.Action_IsActive.KEY_IsActive, "true");
        return hashMap;
    }


    public static HashMap<String, String> getOrderList(String sessiontoken, String vendorID) {
        HashMap<String, String> hashMap = new HashMap<>();

        hashMap.put(WebApiKeys.Common_Key.KEY_USER_ID, vendorID);
        //hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        hashMap.put("CustomerType", "3");
        return hashMap;
    }


    public static HashMap<String, String> getSubCategory(String sessiontoken, String ParentID) {
        HashMap<String, String> hashMap = new HashMap<>();
        //hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);
        hashMap.put(WebApiKeys.Common_Key.KEY_module, "categories");
        //hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        //hashMap.put(WebApiKeys.Action_IsActive.KEY_IsActive, "true");
        return hashMap;
    }


    public static HashMap<String, String> getLatestProduct() {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Common_Key.KEY_module, "latest_products");
        return hashMap;
    }


    public static HashMap<String, String> getProduct(String sessiontoken, String CategoryID) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Common_Key.KEY_module, "products");
        hashMap.put(WebApiKeys.Common_Key.KEY_CATID, CategoryID);

        return hashMap;
    }


    public static HashMap<String, String> getCommisionSlab(String sessiontoken, String vendorID) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);
        hashMap.put("id", vendorID);
        hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");

        return hashMap;
    }



    public static HashMap<String, String> applyCoupon(String sessiontoken, String CouponCode) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);
        hashMap.put("CouponCode", CouponCode);
        hashMap.put("UserRoleId", "3");
        hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        return hashMap;
    }


    public static HashMap<String, String> getUserList(String sessiontoken, String vendorID) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);
        hashMap.put(WebApiKeys.Common_Key.KEY_V_ID, vendorID);
        hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        hashMap.put(WebApiKeys.Action_IsActive.KEY_IsActive, "true");
        return hashMap;
    }




    public static HashMap<String, String> createOrder(String sessiontoken, String userID, String vendorID
            , String couponID, String branchId, String address, String discount, String totalAmount
            , String referalCode, String purchaseItemList)
    {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);

        hashMap.put("UserId", userID);
        hashMap.put("VendorId", vendorID);
        hashMap.put("CouponId", couponID);
        hashMap.put("BranchId", branchId);
        hashMap.put("Address", address);
        hashMap.put("Discount", discount);
        hashMap.put("TotalAmount", totalAmount);
        hashMap.put("AddedBy", "1");
        hashMap.put("UserRoleId", "1");
        hashMap.put("ReferalCode", referalCode);
        hashMap.put("PurchaseItemList", purchaseItemList);


        hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        //hashMap.put(WebApiKeys.Action_IsActive.KEY_IsActive, "true");
        return hashMap;
    }


    public static HashMap<String, String>   getCancelOrder(String sessiontoken, String orderID, String vendorID) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Token.KEY_Token, sessiontoken);
        hashMap.put(WebApiKeys.Common_Key.KEY_Order_ID, orderID);

        hashMap.put("UpdatedBy", vendorID);
        hashMap.put("RoleId", "3");
        hashMap.put("Description", "CANCELED");

        hashMap.put(WebApiKeys.Action_DeviceType.KEY_DeviceType, "MOBILE");
        hashMap.put(WebApiKeys.Action_IsActive.KEY_IsActive, "true");
        return hashMap;
    }


    public static HashMap<String, String> getfirstverification(String username) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Firstverification.KEY_UserName, username);
        return hashMap;
    }

    public static HashMap<String, String> getresetcode(String resetcode) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Resetcode.KEY_RESETCODE, resetcode);
        return hashMap;
    }

    public static HashMap<String, String> getforgotpwd(String username, String Password, String resetcode) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Forgotpwd.KEY_USERNAME, username);
        hashMap.put(WebApiKeys.Action_Forgotpwd.KEY_PWD, Password);
        hashMap.put(WebApiKeys.Action_Forgotpwd.KEY_RESETCODE, resetcode);
        return hashMap;
    }


    public static HashMap<String, String> getNewsEvent() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }


    public static HashMap<String, String> getFees() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getSms() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getNewsEventAttachment(String newsId) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_NewsEvent_Attachment.KEY_NEWS_ID, newsId);
        return hashMap;
    }

    public static HashMap<String, String> getMessageDetail(String reminderId) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_MessageDetail_Attachment.KEY_REMIDER_ID, reminderId);
        return hashMap;
    }

    public static HashMap<String, String> getMessageActionParams(String reminderId, String action) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Message.KEY_REMIDER_ID, reminderId);
        hashMap.put(WebApiKeys.Action_Message.KEY_REMIDER_ACTION, action);
        return hashMap;
    }

    public static HashMap<String, String> getdeletionrequestParams(String request_id, String status) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_DeleteRequest.KEY_REQUEST_ID, request_id);
        hashMap.put(WebApiKeys.Action_DeleteRequest.KEY_STATUS, status);
        return hashMap;
    }

    public static HashMap<String, String> getReadNotificationParams(String reminderId) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_NotificationRead.KEY_NOTIFICATION_ID, reminderId);
        return hashMap;
    }

    public static HashMap<String, String> getMemos() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getNotificaionParams() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getInboxMessage() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getSendMessage() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getMemosDetail(String memos_id) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Memos_Detail.KEY_MEMOS_ID, memos_id);
        return hashMap;
    }

    public static HashMap<String, String> getSemester(String Student_id, String year, String sem) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Semester.KEY_STUDENT_ID, Student_id);
        hashMap.put(WebApiKeys.Action_Semester.KEY_YEAR, year);
        hashMap.put(WebApiKeys.Action_Semester.KEY_SEM, sem);
        return hashMap;
    }

    public static HashMap<String, String> getComment(String NewsId, String Comment) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_SendComment.KEY_News_ID, NewsId);
        hashMap.put(WebApiKeys.Action_SendComment.KEY_Comment, Comment);
        return hashMap;
    }

    public static HashMap<String, String> getStudentlist() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getSchool() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getMessageForwordData(String reminder_id) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_ForwordMsgGet.KEY_REMINDER_ID, reminder_id);
        return hashMap;
    }

    public static HashMap<String, String> getMessageReplyParams(String reminder_id, String subject, String from, String body) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_REMINDER_ID, reminder_id);
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_SUBJECT, subject);
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_TYPE, "reply");
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_FROM, from);
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_BODY, body);
        return hashMap;
    }

    public static HashMap<String, String> getMessageForewordParams(String reminder_id, String subject, String from, String body, String emails) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_REMINDER_ID, reminder_id);
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_SUBJECT, subject);
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_TYPE, "forward");
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_FROM, from);
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_BODY, body);
        hashMap.put(WebApiKeys.Action_ReplyMessage.KEY_EMAIL, emails);
        return hashMap;
    }

    public static HashMap<String, String> getUpload_Tran_Params() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getUpload_send_Tran_Params(String guardian_notes, String bank_info_id, String amount1, String destination_bank_country, String accnt_holder_name, String source_bank_country, String trans_ref_id, String dest_bank_name, String trans_date, String dest_bank_account_name, String source_bank_accnt_no) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Message.KEY_GUARDIAN_NOTES, guardian_notes);
        hashMap.put(WebApiKeys.Action_Bank.KEY_BANK_INFO_ID, bank_info_id);
        hashMap.put(WebApiKeys.Action_Bank.KEY_BANK_AMOUNT, amount1);
        hashMap.put(WebApiKeys.Action_Bank.KEY_DESTINATION_BANK_COUNTRY, destination_bank_country);
        hashMap.put(WebApiKeys.Action_Bank.KEY_ACCNT_HOLDER_NAME, accnt_holder_name);
        hashMap.put(WebApiKeys.Action_Bank.KEY_SOURCE_BANK_COUNTRY, source_bank_country);
        hashMap.put(WebApiKeys.Action_Bank.KEY_TRANS_REF_NO, trans_ref_id);
        hashMap.put(WebApiKeys.Action_Bank.KEY_DEST_BANK_NAME, dest_bank_name);
        hashMap.put(WebApiKeys.Action_Bank.KEY_TRANSACTION_DATE, trans_date);
        hashMap.put(WebApiKeys.Action_Bank.KEY_DEST_BANK_ACCNT_NO, dest_bank_account_name);
        hashMap.put(WebApiKeys.Action_Bank.KEY_SRC_BANK_ACCNT_NO, source_bank_accnt_no);
        return hashMap;
    }


    public static HashMap<String, String> getguardian_payment_deposit_Tran_Params() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> getwithrawal_request_Params() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }


    public static HashMap<String, String> getwithrawal_send_request_Params(String reason_id, String student_ids, String moe_verification, String school_name, String student_passport, String student_national_id, String final_exit_entry, String employee_letter, String key_admission_letter) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_REASONS_IDS, reason_id);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_STUDENT_IDS, student_ids);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_MOE_VERIFICATION, moe_verification);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_SCHOOL_NAME, school_name);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_STUDENT_PASSPORT, student_passport);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_STUDENT_NATIONAL_ID, student_national_id);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_FINAL_EXIT_REENTRY, final_exit_entry);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_EMPLOYEE_LETTER, employee_letter);
        hashMap.put(WebApiKeys.Action_WITHDRAWAL.KEY_ADMISSION_LETTER, key_admission_letter);
        return hashMap;
    }

    public static HashMap<String, String> get_payment_deatail_Params(String trans_id) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_PAYMENT_HISTORY.KEY_TRANSACTION_ID, trans_id);
        return hashMap;
    }

    public static HashMap<String, String> get_profile_details_Params(String studentid) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_ProfileDetails.KEY_STUDENT_ID, studentid);
        return hashMap;
    }

    public static HashMap<String, String> get_complaint_Params() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> get_complaint_comments_Params(String complaint_id) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_COMPLAINT.KEY_COMPLAINT_ID, complaint_id);
        return hashMap;
    }

    public static HashMap<String, String> acceptAgreementParams(String complaint_id, String isAgree) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_AcceptAgreement.KEY_AGREEMENT_ID, complaint_id);
        hashMap.put(WebApiKeys.Action_AcceptAgreement.KEY_IS_AGREE, isAgree);
        return hashMap;
    }


    public static HashMap<String, String> getsend_complaint_Params() {
        HashMap<String, String> hashMap = new HashMap<>();
        return hashMap;
    }

    public static HashMap<String, String> get_agreement_Params() {
        return null;
    }

    public static HashMap<String, String> get_comment_Params(String comment_text, String attachament, String complaint_id) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_COMMENT.KEY_COMMENT_TEXT, comment_text);
        hashMap.put(WebApiKeys.Action_COMMENT.KEY_ATTACHMENT, attachament);
        hashMap.put(WebApiKeys.Action_COMMENT.KEY_COMPLAINT_ID, complaint_id);
        return hashMap;
    }

    public static HashMap<String, String> get_attendancedetails_Params(String Studentid, String batch_id, String mode, String month, String year) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_ATTENDANCE_DETAILS.KEY_STUDENT_ID, Studentid);
        hashMap.put(WebApiKeys.Action_ATTENDANCE_DETAILS.KEY_BATCH_ID, batch_id);
        hashMap.put(WebApiKeys.Action_ATTENDANCE_DETAILS.KEY_MODE, mode);
        hashMap.put(WebApiKeys.Action_ATTENDANCE_DETAILS.KEY_MONTH, month);
        hashMap.put(WebApiKeys.Action_ATTENDANCE_DETAILS.KEY_YEAR, year);
        return hashMap;
    }

    public static HashMap<String, String> getChangePasswordParams(String oldPassword, String newPassword) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_CHANGE_PASSWORD.KEY_OLD_PASSWORD, oldPassword);
        hashMap.put(WebApiKeys.Action_CHANGE_PASSWORD.KEY_NEW_PASSWORD, newPassword);
        hashMap.put(WebApiKeys.Action_CHANGE_PASSWORD.KEY_CONFIRM_PASSWORD, newPassword);
        return hashMap;
    }


    // Get File Size

    public static HashMap<String, String> getFileSizeParam(String token_fcm) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_TOKEN_FCM, token_fcm);
        return hashMap;
    }

    // Get All Counter

    // Get File Size

    public static HashMap<String, String> getAllCounter(String token_fcm, String userId) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_TOKEN_FCM, token_fcm);
        hashMap.put(WebApiKeys.Action_Device_Registation.KEY_USER_ID, userId);
        return hashMap;
    }

    // Get Marks

    public static HashMap<String, String> getMarks(String token_fcm, String studentID, String report_type) {
        HashMap<String, String> hashMap = new HashMap<>();
        //hashMap.put(WebApiKeys.Action_Device_Registation.KEY_TOKEN_FCM, token_fcm);
        hashMap.put(WebApiKeys.Action_Semester.KEY_STUDENT_ID, studentID);
        hashMap.put(WebApiKeys.Action_REPORT_TYPE.KEY_REPORT_TYPE, report_type);
        return hashMap;
    }



}
