import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db, auth } from "./firebaseConfig.js"; // Import Firebase configuration
import { onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const unlockButton = document.getElementById("unlockButton");

    console.log("Unlock button:", unlockButton); // Debugging step

if (!unlockButton) {
    console.error("Unlock button not found in the DOM.");
    return;
}

// Attach the event listener inside the DOMContentLoaded callback
unlockButton.addEventListener("click", async () => {
    console.log("Unlock button clicked."); // Debugging step
    const passcode = passcodeInput.value.trim();

    if (!passcode) {
        alert("Error: Please enter your passcode.");
        return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
        console.error("No user is currently authenticated.");
        alert("Error: You are not logged in. Redirecting to the login page.");
        window.location.href = "../html/Login.html";
        return;
    }
    console.log("Authenticated user:", currentUser.uid); // Debugging step

    try {
        const passcodeRef = doc(db, "Passcode", currentUser.uid);
        const passcodeDoc = await getDoc(passcodeRef);

        if (!passcodeDoc.exists()) {
            console.error("Passcode document does not exist for user:", currentUser.uid);
            alert("Error: Passcode not found. Please create one.");
            return;
        }

        if (passcodeDoc.data().passcode === passcode) {
            alert("Access granted! Redirecting to Vault...");
            sessionStorage.setItem("viewVault", "true");
            window.location.href = "../html/PhotoGallery.html";
        } else {
            alert("Error: Invalid passcode. Please try again.");
            console.error("Incorrect passcode entered for user:", currentUser.uid);
        }
    } catch (error) {
        console.error("Error verifying passcode:", error.message);
        alert(`An unexpected error occurred: ${error.message}`);
    }
});



    const passcodeInput = document.getElementById("passcodeInput");

    // Check if the user is logged in
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is logged in:", user.uid);
    
            const passcodeRef = doc(db, "Passcode", user.uid);
            const passcodeDoc = await getDoc(passcodeRef);
    
            if (!passcodeDoc.exists()) {
                showCreatePasscodePopup(); // Show popup to create a passcode
            } else {
                console.log("User already has a passcode.");
                // Allow the user to proceed
            }
        } else {
            window.location.href = "../html/Login.html";
        }
    });
    
});

    



// Function to show the create passcode popup
function showCreatePasscodePopup() {
    // Create the popup container
    const popup = document.createElement("div");
    popup.classList.add("popup");

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

    // Style for the grey background
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    // Append popup and overlay to the body
    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Add event listeners
    const savePasscodeButton = document.getElementById("savePasscodeButton");
    const cancelPasscodeButton = document.getElementById("cancelPasscodeButton");

    cancelPasscodeButton.addEventListener("click", () => {
        // Remove popup and overlay
        document.body.removeChild(popup);
        document.body.removeChild(overlay);

        // Redirect user back to the dashboard
        window.location.href = "../html/UserDashboard.html";
    });

    savePasscodeButton.addEventListener("click", async (event) => {


        event.preventDefault();

        const userPassword = document.getElementById("userPassword").value.trim();
        const newPasscode = document.getElementById("newPasscode").value.trim();
        const confirmPasscode = document.getElementById("confirmPasscode").value.trim();

        // Validate input
        if (!userPassword || !newPasscode || !confirmPasscode) {
            alert("All fields are required.");
            return;
        }

        if (newPasscode !== confirmPasscode) {
            alert("Passcodes do not match.");
            return;
        }

        try {
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

            // Set Vault mode in session storage
            sessionStorage.setItem("viewVault", "true");

            // Redirect to PhotoGallery page
            window.location.href = "../html/PhotoGallery.html";
        } catch (error) {
            console.error("Error creating passcode:", error.message);
            alert("Failed to create passcode. Please try again.");
        }
    });
}
