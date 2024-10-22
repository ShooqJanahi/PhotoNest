// Import Firebase services from firebaseConfig.js
import { auth, db } from './firebaseConfig.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { collection, doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

document.querySelector('.signup-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeat-password').value;

    // Validate passwords
    if (password !== repeatPassword) {
        alert('Passwords do not match!');
        return;
    }

    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User created:', user.uid); // Debug log

        // Save additional user information in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            firstName: firstName,
            lastName: lastName,
            username: username,
            email: email,
            phone: phone,
            followersCount: 0,  // Initial value
            followingCount: 0,  // Initial value
            postsCount: 0,  // Initial value
            profilePic: "https://example.com/default-profile-pic.jpg",  // Default profile pic
            role: "user",  // Default role
            status: "active",  // Default status
            lastActive: new Date().toISOString(),  // Current timestamp
            uid: user.uid,  // Firebase UID
            createdAt: new Date(),  // Current timestamp
        });
        console.log('Data saved to Firestore'); // Debug log

        alert('User signed up successfully!');
        document.querySelector('.signup-form').reset();  // Reset form
    } catch (error) {
        console.error('Error:', error);
        alert(`An error occurred: ${error.message}`);
    }
});
