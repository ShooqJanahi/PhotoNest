import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, query, where, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { auth, db } from "./firebaseConfig.js"; // Make sure the path is correct

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

    const isUsernameUnique = usernameSnapshot.empty;
    const isEmailUnique = emailSnapshot.empty;

    return {
        isUsernameUnique,
        isEmailUnique,
        isPhoneUnique: phoneSnapshot.empty,
    };
}

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Password strength check
function isStrongPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission

    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase(); // Convert email to lowercase

    const username = document.getElementById("username").value.trim().toLowerCase();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();
    const repeatPassword = document.getElementById("repeat-password").value.trim();

    // Check if passwords match
    if (password !== repeatPassword) {
        alert("Passwords do not match.");
        return;
    }

    // Validate password strength for user signup
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

        // Save user data with active status and default following
        await setDoc(doc(db, "users", userId), {
            firstName,
            lastName,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            phone,
            role: "user", // Default role for regular users
            status: "active",
            createdAt: new Date(), // Current timestamp
            lastActive: new Date(), // Set lastActive to now
            followersCount: 0, // Initial followers count
            followingCount: 1, // They follow "PhotoNest"
            postsCount: 0, // Initial posts count
            profilePic: "https://example.com/default-profile-pic.jpg", // Default profile picture
            following: ["PhotoNest"], // Automatically follow "PhotoNest"
        });

        // Send Firebase verification email
        await sendEmailVerification(userCredential.user);

        // Redirect to VerifyEmail.html after successful signup
        window.location.href = "VerifyEmail.html";

        // Reset the form after successful signup
        signupForm.reset();
    } catch (error) {
        console.error("Error creating user:", error);
        alert("Failed to create user: " + error.message);
    }
});

// Password toggle functionality
const togglePasswordButtons = document.querySelectorAll('.toggle-password');

togglePasswordButtons.forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling; // The input element
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        button.classList.toggle('fa-eye'); // Change the icon to show/hide
        button.classList.toggle('fa-eye-slash');
    });
});
