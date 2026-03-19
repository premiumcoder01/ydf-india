// API Configuration
export const API_CONFIG = {
  // BASE_URL: "https://testing.ydfindia.org/",
  BASE_URL: "https://apply.ydfindia.org/",

  // Authentication APIs (All Roles)
  AUTH: {
    REGISTRATION: "local/mobileapi/registration.php",
    LOGIN: "local/mobileapi/login.php",
    FORGOT_PASSWORD: "local/mobileapi/forgot_password.php",
    RESET_PASSWORD: "local/mobileapi/reset_password.php",
    SEND_OTP: "local/mobileapi/send_otp.php",
    VERIFY_OTP: "local/mobileapi/verify_otp.php",
    AUTH_ME: "webservice/rest/server.php",
    SOCIAL_LOGIN: "local/mobileapi/social_login.php",
  },

  // Student Role APIs
  STUDENT: {
    PROFILE: "local/mobileapi/student/profile.php",
    UPDATE_PROFILE: "local/mobileapi/student/update_profile.php",
    UPDATE_PASSWORD: "local/mobileapi/student/update_password.php",
    SCHOLARSHIPS: "local/mobileapi/student/scholarships.php",
    SCHOLARSHIP_DETAILS: "local/mobileapi/student/scholarship_details.php",
    BOOKMARK_SCHOLARSHIP: "local/mobileapi/student/bookmark_scholarship.php",
    BOOKMARKED_SCHOLARSHIPS: "local/mobileapi/student/bookmarked_scholarships.php",
    SUBMIT_APPLICATION: "local/mobileapi/student/submit_application.php",
    MY_APPLICATIONS: "local/mobileapi/student/my_applications.php",
    APPLICATION_STATUS: "local/mobileapi/student/application_status.php",
    APPLICATION_TIMELINE: "local/mobileapi/student/application_timeline.php",
    UPLOAD_DOCUMENT: "local/mobileapi/student/upload_document.php",
    MY_DOCUMENTS: "local/mobileapi/student/my_documents.php",
    DELETE_DOCUMENT: "local/mobileapi/student/delete_document.php",
    DIGILOCKER_DOCUMENTS: "local/mobileapi/student/digilocker_documents.php",
    NOTIFICATIONS: "local/mobileapi/student/notifications.php",
    MARK_NOTIFICATION_READ: "local/mobileapi/student/mark_notification_read.php",
    CALENDAR_EVENTS: "local/mobileapi/student/calendar_events.php",
  },

  // Application Reviewer Role APIs
  REVIEWER: {
    APPLICATIONS: "local/mobileapi/reviewer/applications.php",
    APPLICATION_DETAILS: "local/mobileapi/reviewer/application_details.php",
    REVIEW_APPLICATION: "local/mobileapi/reviewer/review_application.php",
    SET_PRIORITY: "local/mobileapi/reviewer/set_priority.php",
    BOOKMARK_APPLICATION: "local/mobileapi/reviewer/bookmark_application.php",
    APPLICATION_DOCUMENTS: "local/mobileapi/reviewer/application_documents.php",
    VERIFY_DOCUMENT: "local/mobileapi/reviewer/verify_document.php",
    DOCUMENTS: "local/mobileapi/reviewer/documents.php",
    STATISTICS: "local/mobileapi/reviewer/statistics.php",
    GENERATE_REPORT: "local/mobileapi/reviewer/generate_report.php",
    PROFILE: "local/mobileapi/reviewer/profile.php",
    UPDATE_PROFILE: "local/mobileapi/reviewer/update_profile.php",
    NOTIFICATIONS: "local/mobileapi/reviewer/notifications.php",
  },

  // Scholarship Provider Role APIs
  PROVIDER: {
    CREATE_SCHOLARSHIP: "local/mobileapi/provider/create_scholarship.php",
    UPDATE_SCHOLARSHIP: "local/mobileapi/provider/update_scholarship.php",
    MY_SCHOLARSHIPS: "local/mobileapi/provider/my_scholarships.php",
    SCHOLARSHIP_DETAILS: "local/mobileapi/provider/scholarship_details.php",
    DELETE_SCHOLARSHIP: "local/mobileapi/provider/delete_scholarship.php",
    PUBLISH_SCHOLARSHIP: "local/mobileapi/provider/publish_scholarship.php",
    APPLICANTS: "local/mobileapi/provider/applicants.php",
    APPLICANT_DETAILS: "local/mobileapi/provider/applicant_details.php",
    REVIEW_APPLICANT: "local/mobileapi/provider/review_applicant.php",
    SCHOLARSHIP_STATISTICS: "local/mobileapi/provider/scholarship_statistics.php",
    GENERATE_REPORT: "local/mobileapi/provider/generate_report.php",
    PROFILE: "local/mobileapi/provider/profile.php",
    UPDATE_PROFILE: "local/mobileapi/provider/update_profile.php",
    SUBMIT_KYC: "local/mobileapi/provider/submit_kyc.php",
    KYC_STATUS: "local/mobileapi/provider/kyc_status.php",
    NOTIFICATIONS: "local/mobileapi/provider/notifications.php",
  },

  // Legacy endpoints (for backward compatibility)
  ENDPOINTS: {
    REGISTRATION: "local/mobileapi/registration.php",
    LOGIN: "local/mobileapi/login.php",
    FORGOT_PASSWORD: "local/mobileapi/forgot_password.php",
    RESET_PASSWORD: "local/mobileapi/reset_password.php",
    SEND_OTP: "local/mobileapi/send_otp.php",
    VERIFY_OTP: "local/mobileapi/verify_otp.php",
    AUTH_ME: "webservice/rest/server.php",
    SOCIAL_LOGIN: "local/mobileapi/social_login.php",
  },
};

// Helper function to build full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

