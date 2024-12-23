// Import Firebase components using the modular syntax
//this will inport the Firebase SDK modules for initializing the app and accessing authentication, Firestore, and storage services
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, query, where, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { auth, db } from "./firebaseConfig.js"; // Import Firebase configuration


//Selects the sign-up form element to handle user interactions
const signupForm = document.querySelector(".signup-form");


// Function to check if username, email, or phone is unique before creating a new user account
async function isUniqueUser(username, email, phone) {
    const usersRef = collection(db, "users"); // Reference to the "users" Firestore collection

    // Create queries to check if username, email, or phone exists
    const usernameQuery = query(usersRef, where("username", "==", username));
    const emailQuery = query(usersRef, where("email", "==", email));
    const phoneQuery = query(usersRef, where("phone", "==", phone));

    // Run all queries simultaneously for efficiency
    const [usernameSnapshot, emailSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(usernameQuery),
        getDocs(emailQuery),
        getDocs(phoneQuery),
    ]);

    // Check if any snapshots return existing data
    const isUsernameUnique = usernameSnapshot.empty;
    const isEmailUnique = emailSnapshot.empty;

    return {
        isUsernameUnique,
        isEmailUnique,
        isPhoneUnique: phoneSnapshot.empty,
    };
}


// Email validation function, it validates the email format using a regular expression
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}


// Password strength check, it Ensures the password is secure by enforcing criteria like minimum length, uppercase and lowercase letters, a number, and a special character
function isStrongPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}


//Handles user registration, validates inputs, ensures uniqueness, creates a new Firebase Auth user, stores user data in Firestore, and sends a verification email
signupForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission

    // Collect user input from the form
    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase(); // Normalize email to lowercase
    const username = document.getElementById("username").value.trim().toLowerCase(); // Normalize username
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();
    const repeatPassword = document.getElementById("repeat-password").value.trim();

    // Check if passwords match
    if (password !== repeatPassword) {
        alert("Passwords do not match.");
        return;
    }
    // Validate phone number
    if (!isNumeric(phone)) {
        alert("Phone number should only contain numeric values.");
        return;
    }

    // Validate password strength 
    if (!isStrongPassword(password)) {
        alert("Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
        return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    try {
        // Check if the username, email, and phone are unique
        const { isUsernameUnique, isEmailUnique, isPhoneUnique } = await isUniqueUser(username, email, phone);

        if (!isUsernameUnique) {
            alert("This username is already taken. Please choose another.");
            return;
        }

        if (!isEmailUnique) {
            alert("This email is already registered. Please use another email.");
            return;
        }

        if (!isPhoneUnique) {
            alert("This phone number is already associated with an account.");
            return;
        }

        // Create the user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Save user data with unverfied status, default following, and null passcode
        await setDoc(doc(db, "users", userId), {
            firstName,
            lastName,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            phone,
            role: "user", // Default role for regular users
            status: "unverfied", // Default status
            createdAt: new Date(), // Current timestamp
            lastActive: new Date(), // Set lastActive to now
            followersCount: 0, // Initial followers count
            followingCount: 1, // They follow "PhotoNest"
            postsCount: 0, // Initial posts count
            profilePic: "../assets/Default_profile_icon.jpg", // Default profile picture
           
            passcode: null // Set initial passcode to null
        });

        // Create the "following" subcollection and follow "PhotoNest"
        const followingRef = doc(db, `users/${userId}/following`, "PhotoNest");
        await setDoc(followingRef, {
            userId: "PhotoNest", // PhotoNest ID (or use an actual user ID for the official account)
            followedAt: new Date(), // Timestamp for following
        });

        // Create an empty "followers" subcollection
        const followersRef = collection(db, `users/${userId}/followers`);
        // You can leave this empty initially as no one follows this user yet

        // Send Firebase verification email
        await sendEmailVerification(userCredential.user);

        // Redirect to verification page after successful signup
        window.location.href = "../html/VerifyEmail.html";

        // Reset the form after successful submission
        signupForm.reset();
    } catch (error) {
        console.error("Error creating user:", error);
        alert("Failed to create user: " + error.message);
    }
});

// Ensure the phone number contains only digits
function isNumeric(value) {
    const numericRegex = /^[0-9]{8}$/;
    return numericRegex.test(value);
}

// Password toggle functionality, it alows users to toggle password visibility for better usability during input
const togglePasswordButtons = document.querySelectorAll('.toggle-password');

togglePasswordButtons.forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling; /// Select the password input
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type); // Toggle between password and text
        button.classList.toggle('fa-eye'); // Change the icon to show/hide
        button.classList.toggle('fa-eye-slash');
    });
});
