// Import Firebase components using the modular syntax
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'; // User authentication
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'; // Database interactions
import { auth, db } from './firebaseConfig.js'; // Modularized Firebase configuration

// Select the confirm account form
const confirmForm = document.querySelector('#confirm-account-form');

//Ensures the script only runs if the form exists on the page, preventing errors on unrelated pages
if (confirmForm) {
    console.log('Confirm account form detected'); // Debugging log

    // Add an event listener to handle form submission
    confirmForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission
        console.log('Submit event triggered'); // Debugging log

        // Get user input
        const username = document.getElementById('username').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        console.log(`Attempting to confirm account with username: ${username}`); // Debugging log

        try {
            // Query Firestore for the user
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("No user found with that username."); // Notify user
                console.error("No user found for username:", username); // Debugging log
                return; // Exit
            }

            // Extract user data
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            const userEmail = userData.email;
            const userStatus = userData.status;
            const userDocRef = doc(db, "users", userDoc.id);

            console.log('User data fetched:', userData); // Debugging log

            // Check if the user is already active
            if (userStatus.toLowerCase() === "active") {
                alert("Your account is already active. Please use the login page.");
                console.log("Account already active for username:", username); // Debugging log
                window.location.href = "../html/login.html"; // Redirects the user to the login page if their account is active
                return;
            }

            // Authenticate with Firebase, using their email and password
            const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);

            // Update Firestore to mark the user as active
            const currentTimestamp = new Date().toISOString();
            await updateDoc(userDocRef, {
                status: "active",
                lastActive: currentTimestamp,
            });

            console.log('User status updated to active'); // Debugging log

            // Log Activity
            await logActivity(userCredential.user.uid, "accountConfirmed", `${username} confirmed their account.`);

            // Redirect to the User Dashboard, after successfully confirming their account
            window.location.href = "../html/UserDashboard.html";
        } catch (error) {
            console.error("Error during account confirmation:", error.message); // Log errors
            alert("An error occurred: " + error.message); // Notify user
        }
    });
}


// Function to Log User Activities
//Saves user activity logs in the ActivityLogs collection in Firestore
async function logActivity(userId, category, message) {
    const activityLogRef = collection(db, "ActivityLogs");
    const timestamp = new Date().toISOString();

    try {
        await setDoc(doc(activityLogRef), {
            userId: userId,
            category: category,
            message: message,
            timestamp: timestamp,
        });
        console.log(`Activity logged: ${category} - ${message}`); // Debugging log
    } catch (error) {
        console.error("Error logging activity:", error); // Log errors
    }
}


