const admin = require("firebase-admin");
const serviceAccount = require("./photonest-a16aa-firebase-adminsdk-av69r-ecfcaf7c11.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://photonest-a16aa.firebaseio.com"  // Ensure this URL is correct
});

// Initialize Firestore and Authentication
const db = admin.firestore();
const auth = admin.auth();  // Add this line to initialize auth

// Export both Firestore and auth
module.exports = { db, auth };
