import { getAuth, applyActionCode } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { db } from './firebaseConfig.js';
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Function to handle email verification
async function verifyEmail() {
    const auth = getAuth();
    const urlParams = new URLSearchParams(window.location.search);
    const actionCode = urlParams.get('oobCode'); // Get the action code from the URL

    try {
        // Apply the verification code to the user
        await applyActionCode(auth, actionCode);
        
        // After verifying the email, get the user's email
        const user = auth.currentUser;
        
        if (user) {
            // Update the user's status in Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                status: 'active' // Change status to active
            });

            alert('Email verified successfully! Your status is now active.');
            // Redirect to a specific page (e.g., login or home page)
            window.location.href = '../index.html'; // Change this to your desired route
        }
    } catch (error) {
        console.error('Error verifying email:', error);
        alert('Error verifying email: ' + error.message);
    }
}

// Call the verification function when the page loads
document.addEventListener('DOMContentLoaded', verifyEmail);
