// Firebase configuration for RAKSHAK Emergency Response System
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyCWOTP38vQBZ-pPcaKfJXI9Mo15RLrd_DI",
    authDomain: "emergency-ambulance-2b2ec.firebaseapp.com",
    projectId: "emergency-ambulance-2b2ec",
    storageBucket: "emergency-ambulance-2b2ec.firebasestorage.app",
    messagingSenderId: "152544529264",
    appId: "1:152544529264:web:d52f09090361f23462ddb5",
    measurementId: "G-9G188B5R3G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut };
