//firebaseConfig.js

// Import the required Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, increment} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";


// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCagkrzs936bjXlmxktJrAUYsWB1E8-1MM",
  authDomain: "photonest-a16aa.firebaseapp.com",
  projectId: "photonest-a16aa",
  storageBucket: "photonest-a16aa.firebasestorage.app",
  messagingSenderId: "414965701376",
  appId: "1:414965701376:web:8a3058f33b1654a79931e5",
  measurementId: "G-GJL0MXRV0T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// Export Firebase services for use in other JavaScript files
export { auth, db, storage };