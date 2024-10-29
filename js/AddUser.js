import { db } from './firebaseConfig.js';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { collection, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Check if the user is logged in and has admin role
function checkAdminAccess() {
    const username = sessionStorage.getItem("username");
    const role = sessionStorage.getItem("role");

    // Redirect to login if no username is found in session storage
    if (!username) {
        window.location.href = '../index.html';
        return;
    }

    // Ensure the user has the correct role (admin)
    if (role !== 'admin') {
        window.location.href = '../Error.html'; // Redirect if not admin
        return;
    }
}

// Call the access check when the script loads
checkAdminAccess();

// Function to handle user addition
document.querySelector('.add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Get user input values
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const username = document.getElementById('username').value;
    const role = document.getElementById('role').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;

    const password = generateRandomPassword(); // Generate a random password

    const auth = getAuth();
    
    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email verification
        await sendEmailVerification(user);
        
        // Add user to Firestore with default status as unverified
        await addDoc(collection(db, 'users'), {
            uid: user.uid,
            firstName: firstName,
            lastName: lastName,
            username: username,
            role: role,
            email: email,
            phone: phone,
            status: 'unverified', // Default status
            createdAt: Timestamp.fromDate(new Date()) // Record creation date
        });

        // Log activity in a separate collection (log the admin's activity)
        const adminUsername = sessionStorage.getItem("username");
        await logUserActivity(adminUsername, 'added user: ' + username); // Log the action of the admin

        alert('User added successfully! A verification email has been sent.');
        // Redirect to user management page
        window.location.href = '../UserManagement.html';

    } catch (error) {
        console.error('Error adding user:', error);
        alert('Error adding user: ' + error.message);
    }
});

// Function to generate a random password
function generateRandomPassword(length = 8) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

// Function to log user activity
async function logUserActivity(username, action) {
    try {
        await addDoc(collection(db, 'userActivities'), {
            username: username, // Store admin username for tracking
            action: action,
            timestamp: Timestamp.fromDate(new Date()) // Record activity time
        });
    } catch (error) {
        console.error('Error logging user activity:', error);
    }
}

document.querySelector('.cancel-btn').addEventListener('click', () => {
    window.location.href = '../UserManagement.html';
});

