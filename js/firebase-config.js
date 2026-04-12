/* ================================================
   FIREBASE-CONFIG.JS – Firebase initialization

   ⚠️  SETUP REQUIRED — follow these steps once:
   ─────────────────────────────────────────────────
   1. Go to  https://console.firebase.google.com
   2. Create a new project (or use an existing one)
   3. Register a Web App:
        Project Settings → General → Your apps → Add app → Web
   4. Copy the firebaseConfig values into the object below
   5. Enable Google sign-in:
        Authentication → Sign-in method → Google → Enable
   6. Create a Firestore database:
        Firestore Database → Create database → Start in test mode
   ================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBLR1FrmK1ckaa4iBdOSxFgG5LycHINHJw",
  authDomain: "fit-discipline.firebaseapp.com",
  projectId: "fit-discipline",
  storageBucket: "fit-discipline.firebasestorage.app",
  messagingSenderId: "370931470373",
  appId: "1:370931470373:web:122abf149750d5b6e82fcc",
  measurementId: "G-YWQL5F0CH5"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();
