package com.ibitvalley.writon.webapi;


public class WebApiKeys {

    public static class Action_Device_Registation {
        public static final String KEY_TOKEN_FCM = "fcmtoken";
        public static final String KEY_DEVICE_ID = "device_id";
        public static final String KEY_USER_ID = "user_id";
        public static final String KEY_USERID = "userid";
        public static final String KEY_DEVICE_TYPE = "device_type";
    }

    public static class Action_Login {
        public static final String KEY_UserName = "username";
        public static final String KEY_Password = "password";
    }


    public static class Action_Register {
        public static final String KEY_module = "module";
        public static final String KEY_name = "name";
        public static final String KEY_phone = "phone";
        public static final String KEY_email = "email";
        public static final String KEY_otp = "otp";
        public static final String KEY_pass = "pass";

        public static final String KEY_new_pass = "new_pass";

        public static final String KEY_confirm_pass = "confirm_pass";

    }


    public static class Action_Token {
        public static final String KEY_Token = "SessionKey";

    }



    public static class Common_Key {
        public static final String KEY_module = "module";
        public static final String KEY_CATID = "cat_id";
        public static final String KEY_CATEGORYID = "GategoryID";
        public static final String KEY_CATFORPRODUCT = "CategoriesID";
        public static final String KEY_V_ID = "Id";
        //UserId

        public static final String KEY_USER_ID = "UserId";

        public static final String KEY_USER_NAME = "username";
        public static final String KEY_FNAME = "FirstName";
        public static final String KEY_LNAME = "LastName";
        public static final String KEY_MobileNo = "Mobile";
        public static final String KEY_Email = "Email";
        public static final String KEY_Password = "Password";
        public static final String KEY_Con_Password = "ConfirmPassword";
        public static final String KEY_Gender = "Gender";
        public static final String KEY_Status = "Status";
        public static final String KEY_Message = "Message";
        //
        public static final String KEY_ValidateRefrealCode = "ValidateRefrealCode";


        public static final String KEY_Order_ID= "OrderId";

    }

    public static class Action_DeviceType {
        public static final String KEY_DeviceType = "DeviceType";

    }

    public static class Action_IsActive {
        public static final String KEY_IsActive = "IsActive";

    }

    public static class Action_Firstverification {
        public static final String KEY_UserName = "user_name";
    }

    public static class Action_Resetcode {
        public static final String KEY_RESETCODE = "reset_code";
    }

    public static class Action_Forgotpwd {
        public static final String KEY_USERNAME = "user_name";
        public static final String KEY_PWD = "password";
        public static final String KEY_RESETCODE = "reset_code";
    }

    public static class Action_NewsEvent_Attachment {
        public static final String KEY_NEWS_ID = "news_id";
    }

    public static class Action_MessageDetail_Attachment {
        public static final String KEY_REMIDER_ID = "reminder_id";
    }

    public static class Action_NotificationRead {
        public static final String KEY_NOTIFICATION_ID = "notification_id";
    }

    public static class Action_Message {
        public static final String KEY_REMIDER_ID = "message_ids";
        public static final String KEY_REMIDER_ACTION = "msg_action";
        public static final String KEY_GUARDIAN_NOTES = "guardian_notes";
    }

    public static class Action_UpdateProfiledetail {

        public static final String KEY_PREV_REQ = "prev_req";
        public static final String KEY_STUDENT_ID = "student_id";
        public static final String KEY_NAME = "name";
        public static final String KEY_BATCH = "batch";
        public static final String KEY_STATUS = "status";
        public static final String KEY_ADMISSION_NO = "admission_no";
        public static final String KEY_NATIONAL_IQAMA_ID = "iqama";
        public static final String KEY_COURSE = "course";

        // PERSONAL //
        public static final String KEY_FN_EN = "first_name_en";
        public static final String KEY_MN_EN = "middle_name_en";
        public static final String KEY_LN_EN = "last_name_en";
        public static final String KEY_FN_AR = "first_name_ar";
        public static final String KEY_MN_AR = "middle_name_ar";
        public static final String KEY_LN_AR = "last_name_ar";
        public static final String KEY_COURSEAND_BATCH = "course_and_batch";
        public static final String KEY_YEARSEM = "year_and_semester";
        public static final String KEY_DATEOF_BIRTH = "date_of_birth";
        public static final String KEY_BIRTHCOUNTRY = "birth_country";
        public static final String KEY_NATIONALITY = "nationality";
        public static final String KEY_PD_NATIONAL_IQAMA_ID = "iqama";
        public static final String KEY_NATIONAL_ID_SOURCE = "national_id_source";
        public static final String KEY_EXPIRY_DATE = "expiry_date";
        public static final String KEY_PARENT_NATIONAL_IQAMAID = "parent_nationa_iqama_id";
        public static final String KEY_PARENT_NATIONALID_SOURCE = "parent_national_id_source";
        public static final String KEY_PARENTEXPIRY_DATE = "parent_expiry_date";
        public static final String KEY_PASSPORT_ID = "passport_id";
        public static final String KEY_PASSPORT_COUNTRY = "passport_country";
        public static final String KEY_PASSPORTEXPIRY_DATE = "passport_expiry_date";
        public static final String KEY_GENDER = "gender";
        public static final String KEY_NATIVE_LANGUAGE = "native_language";
        public static final String KEY_RELIGION = "religion";
        //public static final String KEY_STUDENT_PASSPORTEXIPRY_DATE = "student_passport_expiry_date";(not NEEDED)

        // contact //
        public static final String KEY_OFFICEADDRESS = "office_address_line1";
        public static final String KEY_MOBILE = "mobile";
        public static final String KEY_DISTRICT = "district";
        //  public static final String KEY_COUNTRY = "country";(not needed)

        public static final String KEY_EMAIL = "email";
        public static final String KEY_CITY = "city";
        public static final String KEY_PHONE = "phone";

        // LAST ATTENDED //
        public static final String KEY_INSTITUTION = "institution";
        public static final String KEY_INSTITUTION_AR = "institution_ar";
        public static final String KEY_PREVLIST_COUNTRY = "prev_inst_country";
        public static final String KEY_LASTGRADE = "last_grade";
        public static final String KEY_SCORE = "score";
        public static final String KEY_EVAULATION = "evaluation";
        public static final String KEY_ACADEMICALLY_CLEAR = "academically_clear";
        // public static final String KEY_LASTATTENDEDINSTITUTE = "last_attended_institute";(already included with other name)

        // Guardian //
        public static final String KEY_G_FN_EN = "g_first_name_en";
        public static final String KEY_G_MN_EN = "g_middle_name_en";
        public static final String KEY_G_LN_EN = "g_last_name_en";
        public static final String KEY_G_FN_AR = "g_first_name_ar";
        public static final String KEY_G_MN_AR = "g_middle_name_ar";
        public static final String KEY_G_LN_AR = "g_last_name_ar";
        public static final String KEY_G_PARENT_IQAMA = "g_parent_iqama";
        public static final String KEY_G_IQAMA_SOURCE = "g_iqama_source";
        public static final String KEY_G_EXPIRYDATE = "g_id_expiry_date";
        public static final String KEY_G_RELATION = "relation";
        public static final String KEY_G_DOB = "g_date_of_birth";
        public static final String KEY_G_EDUCATION = "education";
        public static final String KEY_G_JOB = "job";
        public static final String KEY_G_COMPANY = "company";
        public static final String KEY_G_EMAIL = "g_email";
        public static final String KEY_G_ADDRESS = "g_office_address_line1";
        public static final String KEY_G_CITY = "g_city";
        public static final String KEY_G_DISTRICT = "g_district";
        public static final String KEY_G_MOBILE = "g_mobile";
        public static final String KEY_G_MOTHER_PHONE = "mother_phone";
        public static final String KEY_G_EMERGENCY_MOBILE = "emergency_mobile";
        // public static final String KEY_G_COUNTRY = "g_country";(not mentioned in site)

        // UPLOAD //
        public static final String KEY_STUDENTIQAMA = "student_iqama";
        public static final String KEY_PARENTIQAMA = "parent_iqama";
        public static final String KEY_STUDENTPASSPORT = "student_passport";
        public static final String KEY_PARENTPASSPORT = "parent_passport";
        public static final String KEY_OTHER = "other";


    }

    public static class Action_UplaodStudentPhoto {
        public static final String KEY_STUDENT_ID = "student_id";
        //  public static final String KEY_STATUS = "status";
        public static final String KEY_ATTACHMENT = "attachment";
    }


    public static class Action_DeleteRequest {
        public static final String KEY_REQUEST_ID = "request_id";
        public static final String KEY_STATUS = "status";
    }

    public static class Action_Memos_Detail {
        public static final String KEY_MEMOS_ID = "memo_id";
    }

    public static class Action_Semester {
        public static final String KEY_STUDENT_ID = "student_id";
        public static final String KEY_YEAR = "year";
        public static final String KEY_SEM = "sem";
    }

    public static class Action_SendComment {
        public static final String KEY_News_ID = "news_id";
        public static final String KEY_Comment = "content";
    }

    public static class Action_ForwordMsgGet {
        public static final String KEY_REMINDER_ID = "reminder_id";
    }

    public static class Action_ReplyMessage {
        public static final String KEY_REMINDER_ID = "reminder_id";
        public static final String KEY_FROM = "from";
        public static final String KEY_SUBJECT = "subject";
        public static final String KEY_BODY = "body";
        public static final String KEY_TYPE = "type";
        public static final String KEY_EMAIL = "recipient_emails";
    }

    public static class Action_submitAnswer {
        public static final String KEY_STUDENT_ID = "student_id";
        public static final String KEY_ASSIGNMENT_ID = "assignment_id";
        public static final String KEY_TYPE = "type";
        public static final String KEY_TITLE = "title";
        public static final String KEY_CONTENT = "content";
        public static final String KEY_ATTACHMENT = "attachment";
    }

    public static class Action_ResubmitAnswer {
        public static final String KEY_STUDENT_ID = "student_id";
        public static final String KEY_ASSIGNMENT_ID = "assignment_id";
        public static final String KEY_TYPE = "type";
        public static final String KEY_TITLE = "title";
        public static final String KEY_ANSWER_ID = "answer_id";
        public static final String KEY_CONTENT = "content";
        public static final String KEY_ATTACHMENT = "attachment";
    }

    public static class Action_NewMessage {
        public static final String KEY_EMPLOYEE_ID = "recipient_ids";
        public static final String KEY_FROM = "from";
        public static final String KEY_SUBJECT = "subject";
        public static final String KEY_BODY = "body";
        public static final String KEY_EMAIL = "recipient_emails";
    }

    public static class Action_Bank {
        public static final String KEY_BANK_INFO_ID = "bank_info_id";
        public static final String KEY_BANK_AMOUNT = "amount";
        public static final String KEY_DESTINATION_BANK_COUNTRY = "destination_bank_country";
        public static final String KEY_FULL_NAME = "acc_holder_name";
        public static final String KEY_SOURCE_BANK_COUNTRY = "source_bank_country";
        public static final String KEY_EMAIL = "recipient_emails";
        public static final String KEY_TRANS_REF_NO = "transaction_ref_no";
        public static final String KEY_DEST_BANK_NAME = "destination_bank_name";
        public static final String KEY_TRANS_DATE = "transaction_date";
        public static final String KEY_DEST_BANK_ACOOUNT_NO = "destination_bank_acc_no";
        public static final String KEY_SRC_BANK_ACOOUNT_NO = "source_bank_acc_no";
        public static final String KEY_ACCNT_HOLDER_NAME = "acc_holder_name";
        public static final String KEY_TRANSACTION_DATE = "transaction_date";
        public static final String KEY_DEST_BANK_ACCNT_NO = "destination_bank_acc_no";
        public static final String KEY_SRC_BANK_ACCNT_NO = "source_bank_acc_no";
    }

    public static class Action_WITHDRAWAL {
        public static final String KEY_REASONS_IDS = "reasons_ids";
        public static final String KEY_STUDENT_IDS = "student_ids";
        public static final String KEY_MOE_VERIFICATION = "moe_verification";
        public static final String KEY_SCHOOL_NAME = "school_name";
        public static final String KEY_STUDENT_PASSPORT = "student_passport";
        public static final String KEY_STUDENT_NATIONAL_ID = "student_national_id";
        public static final String KEY_FINAL_EXIT_REENTRY = "final_exit_reentry";
        public static final String KEY_EMPLOYEE_LETTER = "employee_letter";
        public static final String KEY_ADMISSION_LETTER = "admission_letter";
    }


    public static class Action_PAYMENT_HISTORY {
        public static final String KEY_TRANSACTION_ID = "transaction_id";
    }

    public static class Action_ProfileDetails {
        public static final String KEY_STUDENT_ID = "student_id";
    }

    public class Action_COMPLAINT {
        public static final String KEY_COMPLAINT_ID = "complaint_id";
    }

    public class Action_AcceptAgreement {
        public static final String KEY_AGREEMENT_ID = "agreement_id";
        public static final String KEY_IS_AGREE = "agree";
    }

    public class Action_COMPOSE_COMPLAINT {

        public static final String KEY_COMPLAINT_NO = "complaint_no";
        public static final String KEY_SUBJECT = "subject";
        public static final String KEY_BODY = "body";
        public static final String KEY_TYPE_ID = "type_id";
        public static final String KEY_STUDENT_ID = "student_id";
    }

    public class Action_COMMENT {
        public static final String KEY_COMMENT_TEXT = "comment_text";
        public static final String KEY_ATTACHMENT = "attachment";
        public static final String KEY_COMPLAINT_ID = "complaint_id";
    }

    public class Action_TASKSEND_COMMENT {
        public static final String KEY_STUDENTID = "student_id";
        public static final String KEY_TASK_ID = "task_id";
        public static final String KEY_DESCRIPTION = "description";
        public static final String KEY_ATTACHMENT = "attachment";
    }

    public class Action_ATTENDANCE_DETAILS {
        public static final String KEY_STUDENT_ID = "student_id";
        public static final String KEY_BATCH_ID = "batch_id";
        public static final String KEY_MODE = "mode";
        public static final String KEY_MONTH = "month";
        public static final String KEY_YEAR = "year";
    }

    public class Action_CHANGE_PASSWORD {
        public static final String KEY_OLD_PASSWORD = "old_password";
        public static final String KEY_NEW_PASSWORD = "new_password";
        public static final String KEY_CONFIRM_PASSWORD = "confirm_password";
    }


    public class Action_REPORT_TYPE{
        public static final String KEY_REPORT_TYPE = "report_type";
    }
}
