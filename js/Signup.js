import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js";
import { getFirestore, doc, setDoc, query, where, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";
import { app } from "./firebaseConfig.js";
import { sendEmail } from './sendEmail.js'; // Import the sendEmail function

const auth = getAuth(app);
const db = getFirestore(app);
const signupForm = document.querySelector(".signup-form");

// Function to check if username, email, or phone is unique
async function isUniqueUser(username, email, phone) {
    const usersRef = collection(db, "users");

    const usernameQuery = query(usersRef, where("username", "==", username));
    const emailQuery = query(usersRef, where("email", "==", email));
    const phoneQuery = query(usersRef, where("phone", "==", phone));

    const [usernameSnapshot, emailSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(usernameQuery),
        getDocs(emailQuery),
        getDocs(phoneQuery),
    ]);

    return usernameSnapshot.empty && emailSnapshot.empty && phoneSnapshot.empty;
}

// Password strength check
function isStrongPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// Function to generate a random password
function generateRandomPassword(length = 10) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;
    const email = document.getElementById("email").value;
    const username = document.getElementById("username").value;
    const phone = document.getElementById("phone").value;
    const isAdmin = /* Logic to determine if the user is an admin */; // Define how to determine if the current user is an admin
    let password;
    let repeatPassword;

    // If the user is an admin, generate a random password
    if (isAdmin) {
        password = generateRandomPassword();
        repeatPassword = password; // Set repeat password to the same generated password
    } else {
        password = document.getElementById("password").value;
        repeatPassword = document.getElementById("repeat-password").value;
    }

    const role = isAdmin ? "admin" : "user"; // Set the role based on whether the user is an admin
    const status = "Unverified"; // Default status for self-registering users

    // Check if passwords match
    if (!isAdmin && password !== repeatPassword) {
        alert("Passwords do not match.");
        return;
    }

    // Validate password strength if the user is not an admin
    if (!isAdmin && !isStrongPassword(password)) {
        alert("Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
        return;
    }

    try {
        const isUnique = await isUniqueUser(username, email, phone);
        if (!isUnique) {
            alert("Username, email, or phone number already exists.");
            return;
        }

        // Create the user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Save user data with Unverified status
        await setDoc(doc(db, "users", userId), {
            firstName,
            lastName,
            username,
            email,
            phone,
            role,
            status,
        });

        // Send verification email
        await sendEmailVerification(userCredential.user);

        // Prepare the email content for EmailJS
        const verificationMessage = `Hello ${firstName},\n\nPlease verify your email by clicking the link: [Your Verification Link].\n\nThank you!`;

        // Send verification email using EmailJS
        await sendEmail(email, "Email Verification", verificationMessage);

        // Optionally redirect to the verification page if needed
        window.location.href = "VerifyEmail.html";

        // Reset the form after successful signup
        signupForm.reset();
    } catch (error) {
        console.error("Error creating user:", error);
        alert("Failed to create user: " + error.message);
    }
});

// Show/hide password toggle
const passwordInput = document.getElementById("password");
const repeatPasswordInput = document.getElementById("repeat-password");
const togglePasswordVisibility = (input) => {
    input.type = input.type === "password" ? "text" : "password";
};

document.getElementById("toggle-password").addEventListener("click", () => togglePasswordVisibility(passwordInput));
document.getElementById("toggle-repeat-password").addEventListener("click", () => togglePasswordVisibility(repeatPasswordInput));

// Disable password fields for admins
if (isAdmin) {
    passwordInput.disabled = true;
    repeatPasswordInput.disabled = true;
}
