import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbC8XZLBt6MxoNBEQd1MSo60IKpYEfEkc",
  authDomain: "first-project-f1915.firebaseapp.com",
  databaseURL: "https://first-project-f1915-default-rtdb.firebaseio.com",
  projectId: "first-project-f1915",
  storageBucket: "first-project-f1915.firebasestorage.app",
  messagingSenderId: "162914947899",
  appId: "1:162914947899:web:3bcbde823757eadccd1d1e",
  measurementId: "G-XHTP9WK2TL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Set persistence
setPersistence(auth, browserLocalPersistence)
  .catch((error) => console.error("Error setting persistence:", error));


// Initialize analytics (only in production)
if (process.env.NODE_ENV === "production") {
  getAnalytics(app);
}

export default app;

