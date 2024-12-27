// Import Firebase services
import { getAuth, deleteUser, signInWithEmailAndPassword, onAuthStateChanged, updateEmail, updatePassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { writeBatch, doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { logout } from './login.js';
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

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (file) {
                selectedImageFile = file; // Store the file for later saving

                // Resize the image before previewing
                try {
                    const resizedImage = await resizeImage(file, 200, 200); // Resize to 200x200
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        profileImage.src = event.target.result; // Show resized image preview
                    };
                    reader.readAsDataURL(resizedImage);

                    // Store the resized image for uploading
                    selectedImageFile = resizedImage;
                } catch (error) {
                    console.error('Error resizing image:', error.message);
                    alert('Failed to process the image.');
                }
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


// Function to resize and crop an image to fit a square
async function resizeImage(file, size) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = size;
                canvas.height = size;

                // Crop and center the image to a square
                const aspectRatio = img.width / img.height;
                let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

                if (aspectRatio > 1) {
                    sx = (img.width - img.height) / 2; // Crop sides
                    sWidth = img.height;
                } else {
                    sy = (img.height - img.width) / 2; // Crop top and bottom
                    sHeight = img.width;
                }

                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);

                // Convert to Blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        const resizedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now(),
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Canvas is empty'));
                    }
                }, file.type);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = event.target.result;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}








// DOMContentLoaded Listener
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOMContentLoaded fired');
    //logout button
    const logoutButton = document.querySelector('.login-btn'); // Ensure this matches the ID in your HTML

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout(); // Call the logout function from login.js
        });
    } else {
        console.error("Logout button not found in the DOM.");
    }

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


     // Get the query parameter from the URL
     const urlParams = new URLSearchParams(window.location.search);
     const editMode = urlParams.get('edit'); // Will be 'true' if ?edit=true is in the URL
 
     if (editMode === 'true') {
         console.log("Edit Profile mode activated");
 
         // Find the Edit Profile accordion and expand it
         const editProfileAccordion = document.querySelector('.faqs__item.profile-accordion');
         const editProfileContent = editProfileAccordion.querySelector('.faqs__item-bottom');
 
         if (editProfileAccordion && editProfileContent) {
             // Add the class to expand the accordion
             editProfileAccordion.classList.add('active');
             editProfileContent.style.display = 'block'; // Show the content
         } else {
             console.error("Edit Profile card not found.");
         }
     }
     // Wait for 2 seconds and then hide the splash screen
setTimeout(() => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.style.transition = 'opacity 0.5s ease'; // Smooth fade-out
        splashScreen.style.opacity = '0'; // Fade-out effect
        
        // Remove the splash screen from the DOM after the fade-out
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 500); // Matches the transition duration
    }
}, 2000); // 2 seconds




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
    if (!currentUserId) {
        console.error('No user logged in.');
        return;
    }

    const blockedUsersContainer = document.getElementById('blockedUsersContainer');
    if (!blockedUsersContainer) {
        console.error('Blocked Users container not found.');
        return;
    }

    // Clear existing content
    blockedUsersContainer.innerHTML = '';

    try {
        console.log(`Fetching blocked users for user: ${currentUserId}`);

        // Reference to the blockedUsers subcollection
        const blockedUsersRef = collection(db, `users/${currentUserId}/blockedUsers`);
        const blockedSnapshot = await getDocs(blockedUsersRef);

        if (blockedSnapshot.empty) {
            console.log('No blocked users found.');
            blockedUsersContainer.innerHTML = '<p>No blocked users found.</p>';
            return;
        }

        // Fetch user details for each blocked user
        const blockedUserPromises = blockedSnapshot.docs.map(async (blockedDoc) => {
            const blockedUserId = blockedDoc.id;

            console.log(`Fetching user data for blocked user ID: ${blockedUserId}`);
            const userDocRef = doc(db, `users/${blockedUserId}`);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log(`User data for ${blockedUserId}:`, userData);

                // Build the HTML for the blocked user
                return `
                    <div class="blocked-user">
                        <img src="${userData.profilePic || '../assets/Default_profile_icon.jpg'}" alt="User Profile" class="user-profile-img">
                        <div class="user-details">
                            <h3 class="username">${userData.username || 'Unknown'}</h3>
                            <button class="unblock-btn" data-user-id="${blockedUserId}">Unblock</button>
                        </div>
                    </div>
                `;
            } else {
                console.warn(`User document not found for blocked user ID: ${blockedUserId}`);
                return '';
            }
        });

        // Wait for all user data to be fetched
        const blockedUsersHTML = await Promise.all(blockedUserPromises);

        // Add the generated HTML to the container
        blockedUsersContainer.innerHTML = blockedUsersHTML.join('');

        // Add event listeners for the "Unblock" buttons
        document.querySelectorAll('.unblock-btn').forEach((button) => {
            button.addEventListener('click', async (event) => {
                const blockedUserId = event.target.getAttribute('data-user-id');
                console.log(`Unblocking user ID: ${blockedUserId}`);
                await unblockUser(blockedUserId);
            });
        });
    } catch (error) {
        console.error('Error fetching blocked users:', error.message);
    }
}




// Function to unblock a user
async function unblockUser(blockedUserId) {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
        console.error('No user logged in.');
        return;
    }

    try {
        // Reference to the blocked user's document
        const blockedUserRef = doc(db, `users/${currentUserId}/blockedUsers`, blockedUserId);
        await deleteDoc(blockedUserRef);

        alert('User unblocked successfully.');
        loadBlockedUsers(); // Reload the blocked users list
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



//============================= Delete user account ======================
async function deleteAccount() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
  
    if (!currentUser) {
      alert("No user is logged in.");
      return;
    }
  
    const currentUserId = currentUser.uid;
  
    const confirmation = confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      );
      if (!confirmation) {
        return; // Abort the operation if the user cancels
      }
      
  
    try {
      // 1. Delete user from Firestore collections and subcollections
      const userRef = doc(db, "users", currentUserId);
      const subcollections = ["blockedUsers","followers", "following" ]; // Add other subcollections if necessary
  
      // Delete user subcollections
      for (const subcollection of subcollections) {
        const subcollectionRef = collection(db, `users/${currentUserId}/${subcollection}`);
        const subcollectionDocs = await getDocs(subcollectionRef);
  
        for (const docSnapshot of subcollectionDocs.docs) {
          await deleteDoc(docSnapshot.ref);
        }
      }
  
      // 2. Remove user from others' followers and following lists
      const usersRef = collection(db, "users");
  
      const followersQuery = query(
        usersRef,
        where(`followers.${currentUserId}`, "==", true)
      );
      const followersSnapshot = await getDocs(followersQuery);
  
      const followingQuery = query(
        usersRef,
        where(`following.${currentUserId}`, "==", true)
      );
      const followingSnapshot = await getDocs(followingQuery);
  
      await Promise.all(
        [...followersSnapshot.docs, ...followingSnapshot.docs].map(
          async (userDoc) => {
            const userId = userDoc.id;
  
            // Run a transaction to safely decrement counts
            await runTransaction(db, async (transaction) => {
              const userRef = doc(db, "users", userId);
              const userData = (await transaction.get(userRef)).data();
  
              // Remove the current user from followers/following
              if (userData.followers?.[currentUserId]) {
                transaction.update(userRef, {
                  [`followers.${currentUserId}`]: deleteField(),
                  followersCount: Math.max(0, (userData.followersCount || 1) - 1),
                });
              }
  
              if (userData.following?.[currentUserId]) {
                transaction.update(userRef, {
                  [`following.${currentUserId}`]: deleteField(),
                  followingCount: Math.max(0, (userData.followingCount || 1) - 1),
                });
              }
            });
          }
        )
      );
  
      // Delete main user document
      await deleteDoc(userRef);
  
      // 3. Delete user from Firebase Authentication
      await deleteUser(currentUser);
  
      alert("Account deleted successfully.");
      window.location.href = "../html/Login.html"; // Redirect to the login page
    } catch (error) {
      console.error("Error deleting account:", error.message);
      alert("Failed to delete the account. Please try again.");
    }
  }
  
  // Attach deleteAccount function to the delete button
  document.addEventListener("DOMContentLoaded", () => {
    const deleteAccountButton = document.querySelector(".delete-account");
    if (deleteAccountButton) {
      deleteAccountButton.addEventListener("click", deleteAccount);
    }
  });





//============================= END of Delete user account ======================



//============================ Fetch Notification and Message Counts ===========================

/**
 * Fetches the unread notification and message counts for the current user.
 * @returns {Promise<{notifications: number, messages: number}>} - The counts of unread notifications and messages.
 */
async function fetchCounts() {
    const userId = auth.currentUser?.uid; // Get the logged-in user's ID
    if (!userId) {
        console.error("User not logged in.");
        return { notifications: 0, messages: 0 };
    }

    try {
        // Fetch unread notifications count
        const notificationsRef = collection(db, "Notifications");
        const notificationsQuery = query(
            notificationsRef,
            where("receiverId", "==", userId),
            where("status", "==", "unopen")
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        const unreadNotificationsCount = notificationsSnapshot.size;

        // Fetch unread messages count
        const messagesRef = collection(db, "Messages");
        const messagesQuery = query(
            messagesRef,
            where("receiverId", "==", userId),
            where("status", "==", "Unread")
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const unreadMessagesCount = messagesSnapshot.size;

        return {
            notifications: unreadNotificationsCount,
            messages: unreadMessagesCount,
        };
    } catch (error) {
        console.error("Error fetching notification or message counts:", error);
        return { notifications: 0, messages: 0 };
    }
}


/**
 * Updates the notification and message count elements in the UI.
 * @param {number} notificationCount - The number of unread notifications.
 * @param {number} messageCount - The number of unread messages.
 */
function updateCountsInUI(notificationCount, messageCount) {
    const notificationCountElement = document.getElementById("notification-count");
    const messageCountElement = document.getElementById("message-count");

    // Update notification count
    if (notificationCountElement) {
        if (notificationCount > 0) {
            notificationCountElement.textContent = notificationCount; // Display count
            notificationCountElement.style.display = "inline-block"; // Show the placeholder
        } else {
            notificationCountElement.textContent = ""; // Clear content
            notificationCountElement.style.display = "none"; // Hide the placeholder
        }
    }

   // Update message count
   if (messageCountElement) {
    if (messageCount > 0) {
        messageCountElement.textContent = messageCount; // Display count
        messageCountElement.style.display = "inline-block"; // Show the placeholder
    } else {
        messageCountElement.textContent = ""; // Clear content
        messageCountElement.style.display = "none"; // Hide the placeholder
    }
}
}



/**
 * Marks all notifications as read for the current user.
 */
async function markNotificationsAsRead() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.error("User not logged in.");
        return;
    }

    try {
        const notificationsRef = collection(db, "Notifications");
        const notificationsQuery = query(
            notificationsRef,
            where("receiverId", "==", userId),
            where("status", "==", "unopen")
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);

        const batch = writeBatch(db); // Batch update
        notificationsSnapshot.forEach((doc) => {
            batch.update(doc.ref, { status: "open" });
        });
        await batch.commit();

        console.log("All unread notifications marked as read.");
        updateCounts(); // Refresh counts
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
}

/**
 * Marks all messages as read for the current user.
 */
async function markMessagesAsRead() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.error("User not logged in.");
        return;
    }

    try {
        const messagesRef = collection(db, "Messages");
        const messagesQuery = query(
            messagesRef,
            where("receiverId", "==", userId),
            where("status", "==", "Unread")
        );
        const messagesSnapshot = await getDocs(messagesQuery);

        const batch = writeBatch(db); // Batch update
        messagesSnapshot.forEach((doc) => {
            batch.update(doc.ref, { status: "Read" });
        });
        await batch.commit();

        console.log("All unread messages marked as read.");
        updateCounts(); // Refresh counts
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
}















//============================ END of Fetch Notification and Message Counts ===========================

