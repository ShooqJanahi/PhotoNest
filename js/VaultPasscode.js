// Import required Firebase modules
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db, auth } from "./firebaseConfig.js"; // Import Firebase configuration
import { onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Event listener to run after the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
    // Select the "Unlock" button
    const unlockButton = document.getElementById("unlockButton");
    console.log("Unlock button:", unlockButton); // Debugging step

    // Check if the Unlock button exists
    if (!unlockButton) {
        console.error("Unlock button not found in the DOM.");
        return;
    }

    // Add event listener for Unlock button click
    unlockButton.addEventListener("click", async () => {
        console.log("Unlock button clicked."); // Debugging step

        // Get passcode input from the form
        const passcode = passcodeInput.value.trim();

        // Check if passcode is empty
        if (!passcode) {
            alert("Error: Please enter your passcode.");
            return;
        }

        // Get the currently authenticated user
        const currentUser = auth.currentUser;

         // If no user is logged in, redirect to login page
        if (!currentUser) {
            console.error("No user is currently authenticated.");
            alert("Error: You are not logged in. Redirecting to the login page.");
            window.location.href = "../html/Login.html";
            return;
        }
        console.log("Authenticated user:", currentUser.uid); // Debugging step

        try {
            // Reference the "Passcode" document for the logged-in user
            const passcodeRef = doc(db, "Passcode", currentUser.uid);
            const passcodeDoc = await getDoc(passcodeRef);

            // If no passcode document exists, alert the user
            if (!passcodeDoc.exists()) {
                console.error("Passcode document does not exist for user:", currentUser.uid);
                alert("Error: Passcode not found. Please create one.");
                return;
            }

            // Compare input passcode with stored passcode
            if (passcodeDoc.data().passcode === passcode) {
                alert("Access granted! Redirecting to Vault...");
                sessionStorage.setItem("viewVault", "true"); // Store permission in session
                window.location.href = "../html/VaultPhotoGallery.html";
            } else {
                alert("Error: Invalid passcode. Please try again.");
                console.error("Incorrect passcode entered for user:", currentUser.uid);
            }
        } catch (error) {
            console.error("Error verifying passcode:", error.message);
            alert(`An unexpected error occurred: ${error.message}`);
        }
    });

    // Reference the passcode input field
    const passcodeInput = document.getElementById("passcodeInput");

    // Check if the user is logged in and has a passcode
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is logged in:", user.uid);

             // Reference the user's Passcode document
            const passcodeRef = doc(db, "Passcode", user.uid);
            const passcodeDoc = await getDoc(passcodeRef);

            // If no passcode exists, show a popup to create one
            if (!passcodeDoc.exists()) {
                showCreatePasscodePopup(); // Show popup to create a passcode
            } else {
                console.log("User already has a passcode.");
                // Allow the user to proceed
            }
        } else {
            // Redirect unauthenticated users to the login page
            window.location.href = "../html/Login.html";
        }
    });
});


// Function to display a popup for creating a passcode
function showCreatePasscodePopup() {
    // Create the popup container
    const popup = document.createElement("div");
    popup.classList.add("popup");

    // HTML content for the popup
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Create Passcode</h2>
            <p>You need to create a passcode to access the Vault.</p>
            <form id="createPasscodeForm">
                <label for="userPassword">Enter your password:</label>
                <input type="password" id="userPassword" placeholder="Password" required>

                <label for="newPasscode">Create a passcode:</label>
                <input type="password" id="newPasscode" placeholder="Passcode" required>

                <label for="confirmPasscode">Confirm passcode:</label>
                <input type="password" id="confirmPasscode" placeholder="Confirm Passcode" required>

                <div class="popup-buttons">
                    <button type="submit" id="savePasscodeButton">Save</button>
                    <button type="button" id="cancelPasscodeButton">Cancel</button>
                </div>
            </form>
        </div>
    `;

    // Create a grey overlay background
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    // Append popup and overlay to the page
    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Attach event listeners for buttons
    const savePasscodeButton = document.getElementById("savePasscodeButton");
    const cancelPasscodeButton = document.getElementById("cancelPasscodeButton");

    // Handle cancel button: close the popup
    cancelPasscodeButton.addEventListener("click", () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
        window.location.href = "../html/UserDashboard.html"; // Redirect user back to the dashboard
    });

    // Handle save button: validate and save the new passcode
    savePasscodeButton.addEventListener("click", async (event) => {
        event.preventDefault();

        // Retrieve input values
        const userPassword = document.getElementById("userPassword").value.trim();
        const newPasscode = document.getElementById("newPasscode").value.trim();
        const confirmPasscode = document.getElementById("confirmPasscode").value.trim();

        // Validate input fields
        if (!userPassword || !newPasscode || !confirmPasscode) {
            alert("All fields are required.");
            return;
        }
        if (newPasscode !== confirmPasscode) {
            alert("Passcodes do not match.");
            return;
        }
        try {
             // Get current authenticated user
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("You are not logged in.");
                window.location.href = "../html/Login.html";
                return;
            }
            // Reauthenticate the user with their password
            const email = currentUser.email;
            await signInWithEmailAndPassword(auth, email, userPassword);

            // Save the new passcode to Firestore
            const passcodeRef = doc(db, "Passcode", currentUser.uid);
            await setDoc(passcodeRef, { passcode: newPasscode });

            alert("Passcode created successfully!");

            // Remove popup and overlay
            document.body.removeChild(popup);
            document.body.removeChild(overlay);

            // Set vault permission and redirect user
            sessionStorage.setItem("viewVault", "true");
            window.location.href = "../html/VaultPhotoGallery.html"; // Redirect to VaultPhotoGallery page
        } catch (error) {
            console.error("Error creating passcode:", error.message);
            alert("Failed to create passcode. Please try again.");
        }
    });
}




