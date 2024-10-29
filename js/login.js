// Import Firebase components using the modular syntax
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Import Firebase services from your local configuration file
import { auth, db } from './firebaseConfig.js';

// Setup the login form event listener
const loginForm = document.querySelector('.login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', function (event) {
    event.preventDefault();  // Prevent the default form submission behavior

    const username = usernameInput.value.trim().toLowerCase(); // Convert username to lowercase to ensure case-insensitivity
    const password = passwordInput.value;

    console.log("Attempting to log in with username:", username);  // Debugging output

    // Query Firestore for user with the given username in lowercase
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));

    getDocs(q)
        .then(async querySnapshot => {
            if (querySnapshot.empty) {
                alert("No user found with that username.");
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userEmail = userDoc.data().email;
            const userStatus = userDoc.data().status;
            const userRole = userDoc.data().role;  // Get user role from Firestore
            const userDocRef = doc(db, "users", userDoc.id); // Reference to user document

            // Check user's status before allowing login
            if (userStatus.toLowerCase() === "unverified") {
                window.location.href = 'VerifyEmail.html';
                return;
            }

            // Use the email to sign in with Firebase Auth
            signInWithEmailAndPassword(auth, userEmail, password)
                .then(async (userCredential) => {
                    if (userStatus.toLowerCase() !== "active") {
                        alert("Your account is not active. Please contact support.");
                        return;
                    }

                    // Update the lastActive field in Firestore for the user
                    const currentTimestamp = new Date().toISOString();
                    try {
                        await updateDoc(userDocRef, {
                            lastActive: currentTimestamp
                        });
                        console.log("Last active timestamp updated:", currentTimestamp);
                    } catch (error) {
                        console.error("Error updating lastActive field:", error);
                    }

                    // Track or update the session in Firestore
                    const userId = userCredential.user.uid;  // Get the Firebase user ID
                    const sessionRef = doc(db, "sessions", userId);  // Reference to the session document
                    try {
                        // Update session document with the new loginTime (or create if doesn't exist)
                        await setDoc(sessionRef, {
                            userId: userId,
                            username: username,
                            role: userRole,  // Store the user role in the session
                            loginTime: currentTimestamp,  // Update login time
                            logoutTime: null,  // Set logoutTime to null until the user logs out
                            status: "online"  // Mark as online
                        }, { merge: true });  // Merge with existing data if session already exists
                        console.log("Session updated: User is online with new loginTime");
                    } catch (error) {
                        console.error("Error tracking session: ", error);
                    }

                    // Store user info in session storage after successful login
                    sessionStorage.setItem("username", username);
                    sessionStorage.setItem("role", userRole);  // Store role in sessionStorage

                    // Redirect based on role
                    switch (userRole) {
                        case 'admin':
                            window.location.href = '../AdminDashboard.html';
                            break;
                        case 'user':
                            window.location.href = '../UserDashboard.html';
                            break;
                        default:
                            alert("Unauthorized access. Please contact support.");
                            break;
                    }
                })
                .catch((error) => {
                    alert('Login failed: ' + error.message);
                });
        })
        .catch(error => {
            console.error("Error fetching user data:", error);
            alert('An error occurred while fetching user data.');
        });
});

// Function to log out the user and update Firestore
export async function logout() {
    console.log("Logout function called");

    try {
        const userId = auth.currentUser.uid;
        const sessionRef = doc(db, "sessions", userId);
        const logoutTimestamp = new Date().toISOString();

        // Mark user as offline and update logoutTime in Firestore
        await updateDoc(sessionRef, {
            status: "offline",
            logoutTime: logoutTimestamp  // Update with the current timestamp when logging out
        });

        // Firebase Auth sign-out
        await auth.signOut();
        console.log("User signed out successfully");

        // Clear session storage
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("role");

        // Redirect to login page
        window.location.href = '../index.html';
    } catch (error) {
        console.error("Error signing out: ", error);
    }
}
