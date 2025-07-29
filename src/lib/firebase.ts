import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsC17TLhR47SvbBeh7ATfZKBgKW-B27s8",
  authDomain: "credentials-manager-26d0c.firebaseapp.com",
  projectId: "credentials-manager-26d0c",
  storageBucket: "credentials-manager-26d0c.firebasestorage.app",
  messagingSenderId: "342070645644",
  appId: "1:342070645644:web:cf0ac63210ad19706efca9",
  measurementId: "G-9JZ044XJMZ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
