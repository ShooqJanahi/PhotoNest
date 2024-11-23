// Import Firebase services
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js';

// Firebase Authentication
const auth = getAuth();

// DOMContentLoaded Listener
document.addEventListener('DOMContentLoaded', function () {
    checkUserAuthentication(); // Ensure user authentication
    initializeSidebar(); // Sidebar event listeners
});

// Function to check user authentication and load profile data
async function checkUserAuthentication() {
    document.body.style.display = 'none'; // Hide content initially

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            redirectToLogin(); // Redirect to login if not authenticated
        } else {
            document.body.style.display = 'block'; // Show content
            await loadUserProfile(); // Load user profile information
        }
    });
}

// Function to redirect to the login page
function redirectToLogin() {
    window.location.href = '../html/Login.html';
}

// Function to load user profile (name, username, profile picture)
async function loadUserProfile() {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
        console.error('No user logged in.');
        return;
    }

    const userRef = doc(db, 'users', currentUserId); // Reference to Firestore user document
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();

        // Update profile details in the sidebar
        const profileImage = document.getElementById('profile-image');
        const profileName = document.getElementById('profile-name');
        const profileUsername = document.getElementById('profile-username');

        profileImage.src = userData.profilePic || '../assets/Default_profile_icon.jpg';
        profileName.textContent = `${userData.firstName || 'Unknown'} ${userData.lastName || ''}`.trim();
        profileUsername.textContent = `@${userData.username || 'anonymous'}`;
    } else {
        console.error('User document not found.');
    }
}

// Function to initialize sidebar interactions
function initializeSidebar() {
    // Handle active state for menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach((item) => {
        item.addEventListener('click', () => {
            menuItems.forEach((menuItem) => menuItem.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Show and hide sidebar (for mobile devices)
    const menuBtn = document.querySelector('#menu-btn');
    const closeBtn = document.querySelector('#close-btn');
    const sidebar = document.querySelector('.left');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            sidebar.style.display = 'block';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.style.display = 'none';
        });
    }
}
