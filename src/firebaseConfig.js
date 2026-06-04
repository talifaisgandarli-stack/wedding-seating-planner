// ─────────────────────────────────────────────────────────────────
// Firebase konfiqurasiyası
//
// Quraşdırma:
//  1. https://console.firebase.google.com — yeni layihə yarat
//  2. "Realtime Database" → "Create database" → test mode
//  3. Layihə Ayarları → "Your apps" → Web (</>)
//  4. Aşağıdakı sahələri öz məlumatlarınla doldur
//  5. firebase deploy etmək üçün: npm run build && push to main
// ─────────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey:            "REPLACE_API_KEY",
  authDomain:        "REPLACE_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://REPLACE_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "REPLACE_PROJECT_ID",
  storageBucket:     "REPLACE_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_SENDER_ID",
  appId:             "REPLACE_APP_ID",
};
