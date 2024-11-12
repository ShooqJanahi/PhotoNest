import { auth, db } from './firebaseConfig.js'; // Adjust the path if needed
import { updateDoc, doc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function () {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileMenu = document.querySelector('.mobile-menu');
    const logoutButtons = document.querySelectorAll('#logoutButton'); // Select all logout buttons

    // Toggle mobile menu visibility on hamburger menu click
    if (hamburgerMenu && mobileMenu) {
        hamburgerMenu.addEventListener('click', function () {
            mobileMenu.classList.toggle('show');
        });
    } else {
        console.error("Hamburger menu or mobile menu element not found.");
    }

    // Attach logout function to each logout button
    logoutButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            logout();
        });
    });

    // Set up inactivity timer to log out after 15 minutes (900 seconds)
    let inactivityTime = 0;
    setInterval(() => {
        inactivityTime++;
        if (inactivityTime >= 900) { // 15 minutes
            logout();
        }
    }, 1000);

    // Reset inactivity timer on user actions
    function resetInactivityTimer() { inactivityTime = 0; }
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
});

// Logout function with Firebase Auth and Firestore session update
async function logout() {
    try {
        if (!auth.currentUser) {
            console.error("No user is currently signed in.");
            return;
        }

        const userId = auth.currentUser.uid;
        const sessionRef = doc(db, "sessions", userId);
        const logoutTimestamp = new Date().toISOString();

        // Mark user as offline in Firestore
        await updateDoc(sessionRef, {
            status: "offline",
            logoutTime: logoutTimestamp
        });

        // Sign out from Firebase Auth
        await signOut(auth);

        // Clear session data and redirect to login page
        sessionStorage.clear();
        window.location.href = '../html/index.html';
        console.log("User signed out successfully");
    } catch (error) {
        console.error("Error signing out: ", error);
    }
}
