//login.js

// Import Firebase components using the modular syntax
import { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db } from './firebaseConfig.js';


// Setup the login form event listener
const loginForm = document.querySelector('.login-form');
if (loginForm) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const username = usernameInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        console.log("Attempting to log in with username:", username);

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));

        getDocs(q)
            .then(async querySnapshot => {
                if (querySnapshot.empty) {
                    alert("No user found with that username.");
                    return;
                }

                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                const userEmail = userData.email;
                const userStatus = userData.status;
                const userRole = userData.role;
                const userDocRef = doc(db, "users", userDoc.id);

                if (userStatus.toLowerCase() === "banned") {
                    window.location.href = '../html/BannedMessage.html';
                    return;
                }

                signInWithEmailAndPassword(auth, userEmail, password)
                    .then(async (userCredential) => {
                        if (userStatus.toLowerCase() !== "active") {
                            alert("Your account is not active. Please contact support.");
                            return;
                        }

                        const currentTimestamp = new Date().toISOString();
                        try {
                            await updateDoc(userDocRef, {
                                lastActive: currentTimestamp
                            });
                            console.log("Last active timestamp updated:", currentTimestamp);
                        } catch (error) {
                            console.error("Error updating lastActive field:", error);
                        }

                        const userId = userCredential.user.uid;
                        const sessionRef = doc(db, "sessions", userId);

                        try {
                            // Save all user data to session storage
                            for (const [key, value] of Object.entries(userData)) {
                                sessionStorage.setItem(key, value);
                            }
                            sessionStorage.setItem("userId", userId);
                            sessionStorage.setItem("loginTime", currentTimestamp);

                            // Save the user data to Firestore sessions
                            await setDoc(sessionRef, {
                                ...userData,
                                userId: userId,
                                loginTime: currentTimestamp,
                                logoutTime: null,
                                status: "online"
                            }, { merge: true });
                            console.log("Session updated: User is online with full user data");
                        } catch (error) {
                            console.error("Error tracking session: ", error);
                        }

                        // Redirect based on user role
                        switch (userRole) {
                            case 'admin':
                                window.location.href = '../html/AdminDashboard.html';
                                break;
                            case 'user':
                                window.location.href = '../html/UserDashboard.html';
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
}



// Function to hash a passcode using SHA-256
async function hashPasscode(passcode) {
    const msgUint8 = new TextEncoder().encode(passcode);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Function to set a passcode for the user
export async function setPasscode(userId, passcode) {
    const hashedPasscode = await hashPasscode(passcode);
    const userDocRef = doc(db, "users", userId);

    try {
        await updateDoc(userDocRef, { passcode: hashedPasscode });
        console.log("Passcode set successfully for user:", userId);
    } catch (error) {
        console.error("Error setting passcode:", error);
    }
}

// Function to verify the passcode for accessing the vault
export async function verifyPasscode(userId, inputPasscode) {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        alert("User data not found.");
        return false;
    }

    const storedHashedPasscode = userDoc.data().passcode;

    if (storedHashedPasscode === null) {
        window.location.href = "../html/createPasscode.html"; // Redirect to create passcode page
        return;
    }

    const hashedInputPasscode = await hashPasscode(inputPasscode);

    if (storedHashedPasscode === hashedInputPasscode) {
        console.log("Access granted to vault.");
        return true;
    } else {
        alert("Incorrect passcode.");
        return false;
    }
}

// Event listener for the vault passcode page
document.addEventListener('DOMContentLoaded', () => {
    const unlockButton = document.getElementById('unlockButton');
    if (unlockButton) {
        unlockButton.addEventListener("click", async () => {
            const auth = getAuth();
            const userId = auth.currentUser ? auth.currentUser.uid : null;
            const passcode = document.getElementById("passcodeInput").value;

            if (!userId) {
                alert("Please log in first.");
                window.location.href = '../html/index.html'; // Redirect to login if not authenticated
                return;
            }

            if (passcode === "") {
                alert("Please enter your passcode.");
                return;
            }

            try {
                const accessGranted = await verifyPasscode(userId, passcode);

                if (accessGranted) {
                    window.location.href = "../html/vault.html"; // Redirect to the actual vault page
                } else {
                    alert("Incorrect passcode.");
                }
            } catch (error) {
                console.error("Error verifying passcode:", error);
                alert("An error occurred while verifying the passcode.");
            }
        });
    }
});

// Function to change the passcode
export async function changePasscode(userId, oldPasscode, newPasscode, confirmNewPasscode) {
    if (newPasscode !== confirmNewPasscode) {
        alert("New passcodes do not match.");
        return;
    }

    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        alert("User data not found.");
        return;
    }

    const storedHashedPasscode = userDoc.data().passcode;
    const hashedOldPasscode = await hashPasscode(oldPasscode);

    if (storedHashedPasscode !== hashedOldPasscode) {
        alert("Incorrect old passcode.");
        return;
    }

    const hashedNewPasscode = await hashPasscode(newPasscode);
    try {
        await updateDoc(userDocRef, { passcode: hashedNewPasscode });
        alert("Passcode changed successfully.");
        console.log("Passcode updated for user:", userId);
    } catch (error) {
        console.error("Error changing passcode:", error);
    }
}

// Function to log out the user and update Firestore
export async function logout() {
    console.log("Logout function called");

    try {
        const userId = auth.currentUser.uid;
        const sessionRef = doc(db, "sessions", userId);
        const logoutTimestamp = new Date().toISOString();

        await updateDoc(sessionRef, {
            status: "offline",
            logoutTime: logoutTimestamp
        });

        await signOut(auth);
        console.log("User signed out successfully");

        sessionStorage.clear(); // Clear all session storage

        window.location.href = '../html/index.html';
    } catch (error) {
        console.error("Error signing out: ", error);
    }
}
