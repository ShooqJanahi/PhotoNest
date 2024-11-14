import { getAuth, applyActionCode, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { db } from './firebaseConfig.js';
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Function to handle email verification and update status
async function verifyEmail() {
    const auth = getAuth();
    const urlParams = new URLSearchParams(window.location.search);
    const actionCode = urlParams.get('oobCode'); // Get the action code from the URL

    if (!actionCode) {
        alert("Invalid verification link. No action code found.");
        return;
    }

    try {
        // Apply the verification code to the user
        await applyActionCode(auth, actionCode);

        // Ensure user is signed in
        let user = auth.currentUser;

        if (!user) {
            // User is not signed in, force re-authentication
            const email = prompt("Please enter your email to reauthenticate:");
            const password = prompt("Please enter your password:");

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
        }

        // Check if the email is verified
        if (user.emailVerified) {
            // Reference the Firestore document for the user
            const userRef = doc(db, 'users', user.uid);

            // Update the user's status to 'active'
            await updateDoc(userRef, {
                status: 'active'  // Change status to active
            });

            alert('Email verified successfully! Your status is now active.');
            // Redirect to a specific page (e.g., login or home page)
            window.location.href = '../html/index.html';  // Change this to your desired route
        } else {
            alert('Email verification failed. Please try again.');
        }
    } catch (error) {
        console.error('Error verifying email:', error);
        alert('Error verifying email: ' + error.message);
    }
}

// Call the verification function when the page loads
document.addEventListener('DOMContentLoaded', verifyEmail);
