// Import Firebase services
import { getAuth, onAuthStateChanged, updateEmail, updatePassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

import { db } from './firebaseConfig.js';


// Firebase Authentication
const auth = getAuth();
const storage = getStorage();



// Function to initialize profile image upload
function initializeProfileImageUpload(userData) {
    const uploadButton = document.querySelector('.upload-btn');
    const profileImage = document.getElementById('Changeprofile-image'); // Match ID
    profileImage.src = userData.profilePic || '../assets/Default_profile_icon.jpg';

    const previewProfileImage = document.createElement('img'); // Create an element to preview the new image

    // Style the preview image
    previewProfileImage.style.borderRadius = '50%';
    previewProfileImage.style.width = '80px';
    previewProfileImage.style.marginTop = '10px';
    previewProfileImage.style.display = 'none'; // Hidden by default

    // Append the preview image next to the upload button
    uploadButton.parentElement.appendChild(previewProfileImage);

    let selectedImageFile = null; // Variable to store the selected file

    uploadButton.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.click();

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                selectedImageFile = file; // Store the file for later saving

                // Display the new image as a preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    profileImage.src = event.target.result;
                    previewProfileImage.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Save the profile image on "Save" button click
    document.querySelector('.save').addEventListener('click', async () => {
        if (selectedImageFile) {
            try {
                const currentUserId = auth.currentUser?.uid;
                if (!currentUserId) {
                    alert('No user logged in.');
                    return;
                }

                // Upload the new profile image to Firebase Storage
                const storageRef = ref(storage, `profilePictures/${currentUserId}/${selectedImageFile.name}`);
                await uploadBytes(storageRef, selectedImageFile);
                const downloadURL = await getDownloadURL(storageRef);

                // Save the new image URL in Firestore
                const userRef = doc(db, 'users', currentUserId);
                await updateDoc(userRef, { profilePic: downloadURL });

                alert('Profile information has been updated successfully.');

                // Reload the page to reflect changes
                setTimeout(() => window.location.reload(), 500);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });
}


// DOMContentLoaded Listener
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOMContentLoaded fired');

    try {
        loadBlockedUsers(); // Ensure container exists before invoking
        await checkUserAuthentication(); // Ensure user authentication
        initializeSidebar(); // Sidebar event listeners
    } catch (error) {
        console.error('Error initializing the page:', error.message);
    }

    const saveButton = document.querySelector('.save');
    if (saveButton) {
        saveButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the default form submission behavior
            updateProfile(event);   // Call the updateProfile function
        });
    } else {
        console.error('Save Changes button not found.');
    }

});



// Function to check user authentication and load profile data
async function checkUserAuthentication() {
    document.body.style.display = 'none'; // Hide content initially

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('User is logged in:', user.uid);
            document.body.style.display = 'block'; // Show content
            try {
                await loadUserProfile();
                await loadBlockedUsers();
            } catch (error) {
                console.error('Error loading user data:', error.message);
            }
        } else {
            console.error('No user logged in.');
            redirectToLogin();
        }
    });
}

// Function to redirect to the login page
function redirectToLogin() {
    window.location.href = '../html/Login.html';
}

// Function to load user profile (name, username, profile picture, and form fields)
async function loadUserProfile() {
    try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            console.error('No user logged in.');
            return;
        }

        const userRef = doc(db, 'users', currentUserId); // Reference to Firestore user document
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Update Sidebar Profile Image
            const sidebarProfileImage = document.getElementById('sidebar-profile-image');
            if (sidebarProfileImage) {
                sidebarProfileImage.src = userData.profilePic || '../assets/Default_profile_icon.jpg';
            }

            // Update Top Navigation Profile Image
            const topNavProfileImage = document.getElementById('topnav-profile-image');
            if (topNavProfileImage) {
                topNavProfileImage.src = userData.profilePic || '../assets/Default_profile_icon.jpg';
            }

            console.log('Profile loaded successfully:', userData);

            // Update Sidebar Profile Details
            const profileName = document.getElementById('profile-name');
            const profileUsername = document.getElementById('profile-username');

            if (profileName) {
                profileName.textContent = `${userData.firstName || 'Unknown'} ${userData.lastName || ''}`.trim();
            }

            if (profileUsername) {
                profileUsername.textContent = `@${userData.username || 'anonymous'}`;
            }

            // Update Profile Edit Form Fields
            const firstNameField = document.getElementById('firstName');
            if (firstNameField) firstNameField.value = userData.firstName || '';

            const lastNameField = document.getElementById('lastName');
            if (lastNameField) lastNameField.value = userData.lastName || '';

            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.value = userData.username || '';

            const emailField = document.getElementById('email');
            if (emailField) emailField.value = userData.email || '';

            const bioField = document.getElementById('bio');
            if (bioField) bioField.value = userData.bio || '';

            const linkField = document.getElementById('link');
            if (linkField) linkField.value = userData.link || '';


            // Initialize Profile Image Upload for Profile Edit Page
            initializeProfileImageUpload(userData);
        } else {
            console.error('User document not found.');
        }
    } catch (error) {
        console.error('Error loading profile:', error.message);

    }
}




// Function to handle profile updates
async function updateProfile(event) {
    event.preventDefault(); // Prevent form submission

    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) {
        alert('No user logged in.');
        return;
    }

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const link = document.getElementById('link').value.trim();

    const newPassword = document.getElementById('Change_password').value.trim();
    const confirmPassword = document.getElementById('Confirm_password').value.trim();
    const currentPassword = document.getElementById('password').value.trim(); // Current password for authentication

    // Confirmation dialog
    const confirmChanges = confirm(
        "Are you sure you want to save these changes?"
    );
    if (!confirmChanges) {
        return; // Abort changes if user cancels
    }


    try {
        // Check for duplicate username
        if (await isDuplicate("username", username, currentUserId)) {
            alert("Username already exists. Please choose a different username.");
            return;
        }

        // Check for duplicate email
        if (await isDuplicate("email", email, currentUserId)) {
            alert("Email already exists. Please choose a different email.");
            return;
        }
        // Update Firestore user document
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            firstName,
            lastName,
            username,
            email,
            bio,
            link,

        });

        // Update Firebase Authentication email if changed
        if (email && email !== auth.currentUser.email) {
            await updateEmail(auth.currentUser, email);
            await sendEmailVerification(auth.currentUser); // Send verification email
            alert('Email updated. Please verify your new email address.');
        }

        alert('Profile information has been updated successfully.');

        // Validate current password before updating to the new one
        if (newPassword && newPassword === confirmPassword) {
            const currentEmail = auth.currentUser.email; // Get the user's email
            const currentPassword = document.getElementById('password').value.trim();

            try {
                // Re-authenticate the user with current email and password
                await signInWithEmailAndPassword(auth, currentEmail, currentPassword);

                // If re-authentication is successful, update the password
                await updatePassword(auth.currentUser, newPassword);
                alert('Password updated successfully.');
            } catch (error) {
                if (error.code === 'auth/wrong-password') {
                    alert('The current password is incorrect. Please try again.');
                } else {
                    console.error('Error re-authenticating user:', error.message);
                    alert(`Error: ${error.message}`);
                }
                return; // Stop further execution
            }
        } else if (newPassword || confirmPassword) {
            alert('Passwords do not match. Please confirm your new password.');
        }


        alert('Profile updated successfully!');


        document.querySelector('.save').addEventListener('click', (event) => {
            updateProfile(event);
        });



    } catch (error) {
        // Handle specific field errors
        if (error.message.includes("username")) {
            alert(error.message); // Error related to username
        } else if (error.message.includes("email")) {
            alert(error.message); // Error related to email
        } else if (error.message.includes("password")) {
            alert(error.message); // Error related to password
        } else {
            // General error
            console.error('Error updating profile:', error.message);
            alert(`Error: ${error.message}`);
        }
    }

    // Function to check if a username or email already exists in Firestore
    async function isDuplicate(field, value, currentUserId) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where(field, "==", value));
        const querySnapshot = await getDocs(q);

        for (const doc of querySnapshot.docs) {
            if (doc.id !== currentUserId) {
                return true; // Duplicate found
            }
        }
        return false; // No duplicates
    }


    // Event listener for save button
    document.querySelector('.save').addEventListener('click', updateProfile);
}

//==========Blocked users Section========//
// Function to load blocked users
async function loadBlockedUsers() {
    const currentUserId = sessionStorage.getItem('userId');
    console.log('loadBlockedUsers invoked');
    const blockedUsersContainer = document.getElementById('blockedUsersContainer');
    
    if (!blockedUsersContainer) {
        console.error('Blocked Users container not found.');
        return;
    }

    blockedUsersContainer.innerHTML = ''; // Clear existing content
    console.log('Fetching blocked users from Firestore...');

    try {
        
        console.log('Current User ID:', currentUserId);

        if (!currentUserId) {
            console.error('No user logged in.');
            return;
        }

        const blockedUsersRef = collection(db, 'blockedUsers');
        const blockedQuery = query(blockedUsersRef, where('blockerId', '==', currentUserId));
        const snapshot = await getDocs(blockedQuery);

        if (!snapshot.empty) {
            snapshot.forEach((doc) => {
                const blockedUserData = doc.data();
                const userHTML = `
                    <div class="blocked-user">
                        <img src="${blockedUserData.profilePic || '../assets/Default_profile_icon.jpg'}" alt="User Profile" class="user-profile-img">
                        <div class="user-details">
                            <h3 class="username">${blockedUserData.username}</h3>
                            <button class="unblock-btn" data-user-id="${doc.id}">Unblock</button>
                        </div>
                    </div>
                `;
                blockedUsersContainer.innerHTML += userHTML;
            });

            // Add event listeners for "Unblock" buttons
            document.querySelectorAll('.unblock-btn').forEach((button) => {
                button.addEventListener('click', async (event) => {
                    const userIdToUnblock = event.target.getAttribute('data-user-id');
                    await unblockUser(userIdToUnblock);
                });
            });
        } else {
            blockedUsersContainer.innerHTML = '<p>No blocked users found.</p>';
        }
    } catch (error) {
        console.error('Error loading blocked users:', error.message);
    }
}


// Function to unblock a user
async function unblockUser(userId) {
    try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            console.error('No user logged in.');
            return;
        }

        // Reference to the current user's blocked document
        const blockedUsersRef = doc(db, 'blockedUsers', currentUserId);

        // Update the document to remove the user from the array
        await updateDoc(blockedUsersRef, {
            blockedUsers: arrayRemove(userId),
        });

        alert('User unblocked successfully.');
        await loadBlockedUsers(); // Refresh the blocked users list
    } catch (error) {
        console.error('Error unblocking user:', error.message);
        alert('Failed to unblock user.');
    }
}
















//=================Side Bar================================
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

// Dropdown middle functionality
document.querySelectorAll('.profile-accordion').forEach((accordion) => {
    const header = accordion.querySelector('.faqs__item-top');
    const content = accordion.querySelector('.faqs__item-bottom');

    header.addEventListener('click', () => {
        // Collapse any other open accordion
        document.querySelectorAll('.profile-accordion .faqs__item-bottom').forEach((item) => {
            if (item !== content) {
                item.classList.remove('show');
            }
        });

        // Toggle the current accordion
        content.classList.toggle('show');
    });
});
