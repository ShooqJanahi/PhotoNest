//login.js

// Import Firebase components using the modular syntax
import { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'; //User authentication
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'; //Database interactions
import { auth, db } from './firebaseConfig.js'; //Modularized Firebase configuration


// Select the login form from the HTML
const loginForm = document.querySelector('.login-form');

// Check if the login form exists on the page
if (loginForm) {
    // Select the username and password input fields
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Add an event listener to handle form submission
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission behavior

        const username = usernameInput.value.trim().toLowerCase(); // Get and normalize the username input
        const password = passwordInput.value; // Get the password input

        console.log(`Attempting to log in with username: ${username}`); // Log the login attempt for debugging

        const usersRef = collection(db, "users"); // Reference the "users" Firestore collection
        const q = query(usersRef, where("username", "==", username)); // Query Firestore for a user with the given username

        // Execute the query to fetch the user data
        getDocs(q)
            .then(async querySnapshot => {
                if (querySnapshot.empty) {
                    alert("No user found with that username."); // Show an error if no user matches the username
                    return; // Exit the function
                }

                const userDoc = querySnapshot.docs[0]; // Get the first matching user document
                const userData = userDoc.data(); // Extract user data from the document
                const userEmail = userData.email; // Get the user's email
                const userStatus = userData.status; // Get the user's status (e.g., active, banned)
                const userRole = userData.role; // Get the user's role (e.g., admin, user)
                const userDocRef = doc(db, "users", userDoc.id); // Create a reference to the user's document

                // Check if the user's status is banned
                if (userStatus.toLowerCase() === "banned") {
                    window.location.href = '../html/BannedMessage.html'; // Redirect to the banned message page
                    return; // Exit the function
                }

                // Attempt to sign in the user with email and password
                signInWithEmailAndPassword(auth, userEmail, password)
                    .then(async (userCredential) => {
                        // Check if the account is not active
                        if (userStatus.toLowerCase() !== "active") {
                            window.location.href = '../html/verifyEmail.html'; // Redirect to the verify email page
                            return; // Exit the function
                        }

                        const currentTimestamp = new Date().toISOString(); // Get the current timestamp
                        try {
                            // Update the user's lastActive field in Firestore
                            await updateDoc(userDocRef, {
                                lastActive: currentTimestamp
                            });

                            console.log("Last active timestamp updated:", currentTimestamp); // Log success
                        } catch (error) {
                            console.error("Error updating lastActive field:", error); // Log errors
                        }

                        const userId = userCredential.user.uid; // Get the logged-in user's UID
                        const sessionRef = doc(db, "sessions", userId); // Reference the session document in Firestore

                        // Log login activity
                        await logActivity(userId, "login", `${username} logged in.`);
                        try {

                            sessionStorage.setItem("role", userRole.toLowerCase()); // Ensure role is set

                            // Save all user data to sessionStorage as a JSON string
                            sessionStorage.setItem("user", JSON.stringify({
                                ...userData,          // All user data from Firestore
                                uid: userId,          // Include Firebase Auth UID
                                loginTime: currentTimestamp, // Login timestamp
                            }));

                            console.log("Session data stored:", JSON.parse(sessionStorage.getItem("user")));


                            // Save the user session data in Firestore
                            await setDoc(sessionRef, {
                                ...userData, // Spread user data into the document
                                userId: userId, // Include the user ID
                                loginTime: currentTimestamp, // Save login time
                                logoutTime: null, // Initialize logout time as null
                                status: "online" // Set the user status to online
                            }, { merge: true });

                            console.log("Session updated: User is online with full user data"); // Log success
                        } catch (error) {
                            console.error("Error saving session data:", error); // Log errors
                        }


                        // Redirect the user based on their role
                        switch (userRole) {
                            case 'admin':
                                window.location.href = '../html/AdminDashboard.html'; // Redirect admins to the admin dashboard
                                break;
                            case 'user':
                                window.location.href = '../html/UserDashboard.html'; // Redirect regular users to the user dashboard
                                break;
                            default:
                                alert("Unauthorized access. Please contact support."); // Handle unknown roles
                                break;
                        }
                    })
                    .catch((error) => {
                        alert('Login failed: ' + error.message); // Show an error message if login fails
                    });
            })
            .catch(error => {
                console.error("Error fetching user data:", error); // Log errors while fetching user data
                alert('An error occurred while fetching user data.'); // Show an error message
            });
    });
}



// Track inactivity and logout user
let inactivityTimeout; // Declare a variable for the inactivity timeout

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout); // Clear the existing timer
    inactivityTimeout = setTimeout(async () => { // Start a new timer
        alert("You have been logged out due to inactivity."); // Alert the user
        const userId = auth.currentUser ? auth.currentUser.uid : null;

        if (userId) {
            // Log inactivity logout activity
            await logActivity(userId, "logout", "User logged out due to inactivity.");
        }

        logout(); // Log out the user
    }, 15 * 60 * 1000); // 15 minutes
}

function updateLastActive() {
    const userId = auth.currentUser ? auth.currentUser.uid : null; // Get the current user's ID
    if (userId) {
        const sessionRef = doc(db, "sessions", userId); // Reference to the user's session document
        const currentTimestamp = new Date().toISOString(); // Get the current timestamp

        updateDoc(sessionRef, { lastActive: currentTimestamp }).catch((error) => {
            console.error("Error updating lastActive:", error); // Log any errors
        });
    }
}

function handleUserActivity() {
    resetInactivityTimer(); // Reset inactivity timeout on user activity
    updateLastActive();      // Update the last active timestamp
}

// Consolidate event listeners for user activity
window.addEventListener('mousemove', handleUserActivity); // Track mouse movement
window.addEventListener('keydown', handleUserActivity); // Track keyboard input
window.addEventListener('touchstart', handleUserActivity); // Track touch input
window.addEventListener('scroll', handleUserActivity); // Track scrolling

// Initialize inactivity timer
resetInactivityTimer(); // Start the inactivity timer

// Function to log out the user and update Firestore
export async function logout() {
    try {
        const userId = auth.currentUser.uid;  // Get the current user's ID
        const sessionRef = doc(db, "sessions", userId); // Reference to the user's session document
        const logoutTimestamp = new Date().toISOString(); // Get the current timestamp

        await updateDoc(sessionRef, {
            status: "offline", // Update the user's status to offline
            logoutTime: logoutTimestamp // Save the logout time
        });

        // Log logout activity
        await logActivity(userId, "logout", "User logged out.");

        await signOut(auth); // Sign the user out

        sessionStorage.clear(); // Clear all session storage
        clearTimeout(inactivityTimeout); // Clear the inactivity timer
        window.location.href = '../html/index.html'; // Redirect to the login page

    } catch (error) {
        console.error("Error signing out: ", error); // Log any errors
    }
}

// Reference the logout button
const logoutButton = document.querySelector('.logout-button');

// Attach the logout function to the button
if (logoutButton) {
    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const confirmLogout = confirm("Are you sure you want to log out?");
        if (confirmLogout) {
            await logout();
        }
    });
}



// Update session status before the browser is closed
window.addEventListener('beforeunload', () => {
    const userId = auth.currentUser ? auth.currentUser.uid : null; // Get the current user's ID
    if (userId) {
        const sessionRef = doc(db, "sessions", userId); // Reference to the user's session document
        const logoutTimestamp = new Date().toISOString(); // Get the current timestamp

        const payload = JSON.stringify({
            status: "offline",  // Update the user's status to offline
            logoutTime: logoutTimestamp, // Save the logout time
        });


        navigator.sendBeacon('/update-session', payload); // Send data to the server
    }
});




// Log Activity Function
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
        console.log(`Activity logged: ${category} - ${message}`);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}
