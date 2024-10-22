import { auth, db } from './firebaseConfig.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

document.querySelector('.login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // Query Firestore to find the user by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Get the user document from Firestore
            const userDoc = querySnapshot.docs[0]; // Assuming username is unique
            const userData = userDoc.data();
            const email = userData.email; // Assuming each user document has an email field

            // Proceed with email login using Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('User logged in:', user.uid);

            // Check user status before proceeding
            const userRole = userData.role;
            const userStatus = userData.status;  // Assume status can be 'active', 'unverified', 'deactivated', or 'banned'

            if (userStatus === 'unverified') {
                alert('Your account is unverified. Please verify your email.');
            } else if (userStatus === 'deactivated') {
                alert('Your account has been deactivated. Please contact support.');
            } else if (userStatus === 'banned') {
                alert('Your account has been banned. Contact support for more information.');
            } else if (userStatus === 'active') {
                // Check user role and redirect accordingly
                if (userRole === 'admin') {
                    window.location.href = '/AdminDashboard.html';
                } else {
                    window.location.href = '/UserDashboard.html';
                }
            }
        } else {
            alert('No user found with this username. Please sign up first.');
        }
    } catch (error) {
        // Handle Firebase Auth errors
        switch (error.code) {
            case 'auth/wrong-password':
                alert('Incorrect password. Please try again.');
                break;
            case 'auth/too-many-requests':
                alert('Too many login attempts. Please try again later.');
                break;
            default:
                console.error('Error during login:', error);
                alert(`An error occurred: ${error.message}`);
        }
    }
});
