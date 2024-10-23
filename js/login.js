import { auth, db } from './firebaseConfig.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

document.querySelector('.login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User logged in:', user.uid);

        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            const userRole = userData.role;

            if (userRole === 'admin') {
                window.location.href = '/AdminDashboard.html';
            } else {
                window.location.href = '/UserDashboard.html';
            }
        } else {
            console.log('No such user document!');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert(`An error occurred: ${error.message}`);
    }
});
