// Import Firestore database from firebaseConfig.js
import { db } from './firebaseConfig.js';

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'; // Import required Firestore methods

import { logout } from './login.js';


// Function to display users based on the URL parameter
async function displayUsers() {
    const userCardsContainer = document.querySelector('.user-cards');
    userCardsContainer.innerHTML = ''; // Clear existing user cards

    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status'); // Get the 'status' parameter from URL

    try {
        // Fetch all users from the 'users' collection
        console.log('Fetching all users...');
        const usersRef = collection(db, 'users'); // Reference to the 'users' collection
        const querySnapshot = await getDocs(usersRef); // Fetch all users

        if (querySnapshot.empty) {
            console.log('No users found.');
            userCardsContainer.innerHTML = '<p>No users found.</p>';
            return;
        }

        // Display each user
        querySnapshot.forEach((docSnapshot) => {
            const userData = docSnapshot.data();

            // Filter users by status if the parameter is provided
            if (!status || userData.status === status) {
                console.log('User found:', userData);
                createUserCard(docSnapshot.id, userData, userCardsContainer);
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        userCardsContainer.innerHTML = `<p>Error fetching users: ${error.message}</p>`;
    }
}


// Function to create a user card for general users (from the 'users' collection)
function createUserCard(userId, userData, container) {
    const userCard = document.createElement('div');
    userCard.className = 'user-card';

    // Use toDate() method to convert Firestore Timestamps
    const createdAt = userData.createdAt instanceof Timestamp
        ? userData.createdAt.toDate().toLocaleString()
        : 'N/A';

    const lastActive = userData.lastActive instanceof Timestamp
        ? userData.lastActive.toDate().toLocaleString()
        : 'N/A';

    // Concatenate first name and last name to create full name
    const fullName = `${userData.firstName || 'Unknown'} ${userData.lastName || ''}`.trim();

    // Use profilePic URL or fallback to a placeholder image
    const profilePicUrl = userData.profilePic || '../assets/Default_profile_icon.jpg';

    userCard.innerHTML = `
        <img src="${profilePicUrl}" alt="${fullName}'s profile picture" class="user-avatar">
        <h3>${fullName}</h3>
        <p>@${userData.username || 'unknown'}</p>
        <p>Email: ${userData.email || 'N/A'}</p>
        <p>Role: ${userData.role || 'unknown'}</p>
        <p>Status: <span id="status-${userId}">${userData.status || 'Unknown'}</span></p>
        <p>Last Active: ${lastActive}</p>
        <p>Account Created: ${createdAt}</p>
        <div class="card-buttons">
            <button class="delete-button" onclick="deleteUser('${userId}')">Delete</button>
            <button class="ban-button" onclick="openBanUserModal('${userId}')">Ban</button>
           <button class="view-button" onclick="viewUser('${userId}')">View</button>


        </div>
    `;

    container.appendChild(userCard);
}

// Function to handle the "View" button action
export function viewUser(userId) {
    // Save the user ID in localStorage
    localStorage.setItem('selectedUserId', userId);

    // Redirect to the UserProfile.html page
    window.location.href = 'UserProfile.html';
}



// Function to update the displayed ban duration

export function updateBanDuration(userId) {
    const slider = document.getElementById(`ban-duration-${userId}`);
    const display = document.getElementById(`ban-duration-display-${userId}`);
    display.textContent = slider.value; // Update the displayed number of days
}




// Function to delete a user and all related data
export async function deleteUser(userId) {
    // Show a confirmation dialog
    const isConfirmed = confirm('Are you sure you want to delete this user? This will delete all associated data, including photos, comments, and more. This action cannot be undone.');
    if (!isConfirmed) {
        return; // Exit if the user cancels
    }

    try {
        // Delete related documents in all collections
        console.log(`Deleting user-related data for userId: ${userId}`);

        // Delete from ActivityLogs
        await deleteCollectionDocuments('ActivityLogs', userId);

        // Delete from Albums
        await deleteCollectionDocuments('Albums', userId);

        // Delete from Comments
        await deleteCollectionDocuments('Comments', userId);

        // Delete from Follows
        await deleteCollectionDocuments('Follows', userId);

        // Delete from Likes
        await deleteCollectionDocuments('Likes', userId);

        // Delete from Photos
        await deleteCollectionDocuments('Photos', userId);

        // Delete from other collections (extend as needed)
        await deleteCollectionDocuments('Messages', userId);
        await deleteCollectionDocuments('Notifications', userId);
        await deleteCollectionDocuments('Reports', userId);

        // Delete the user document from the 'users' collection
        await deleteDoc(doc(db, 'users', userId));
        console.log(`User ${userId} deleted from Firestore.`);

        // Optionally delete the user's authentication account
        // Uncomment this if Firebase Admin SDK or client authentication deletion logic is set up
        /*
        if (userData.email) {
            const auth = getAuth();
            const usersList = await auth.listUsers(); // Admin SDK is typically required
            const matchedUser = usersList.find(user => user.email === userData.email);

            if (matchedUser) {
                await auth.deleteUser(matchedUser.uid);
                console.log(`User ${userData.email} deleted from Firebase Authentication.`);
            }
        }
        */

        // Refresh the user list in the UI
        displayUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
}

// Function to delete all documents in a specific collection related to a userId
async function deleteCollectionDocuments(collectionName, userId) {
    try {
        const collectionRef = collection(db, collectionName);
        const querySnapshot = await getDocs(collectionRef);

        for (const docSnapshot of querySnapshot.docs) {
            const docData = docSnapshot.data();

            // Check if the document belongs to the user
            if (docData.userId === userId) {
                await deleteDoc(doc(db, collectionName, docSnapshot.id));
                console.log(`Deleted document from ${collectionName}: ${docSnapshot.id}`);
            }
        }
    } catch (error) {
        console.error(`Error deleting documents from ${collectionName}:`, error);
    }
}



document.addEventListener("DOMContentLoaded", () => {

    displayUsers();

   
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (hamburgerMenu && mobileMenu) {
        // Toggle mobile menu visibility on hamburger menu click
        hamburgerMenu.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });

        // Optional: Close the menu when clicking outside
        window.addEventListener('click', (event) => {
            if (!mobileMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                mobileMenu.classList.remove('show');
            }
        });
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout();
        });
    } else {
        console.warn('Logout button not found.');
    }
    
});

export async function unbanUser(userId) {
    const statusElement = document.getElementById(`status-${userId}`);
    try {
        // Update Firestore `users` collection to reset the status
        await updateDoc(doc(db, 'users', userId), {
            status: 'Active',
        });

        // Find and delete the related ban document in the `ban` collection
        const banCollectionRef = collection(db, 'ban');
        const querySnapshot = await getDocs(banCollectionRef);

        querySnapshot.forEach(async (docSnapshot) => {
            const banData = docSnapshot.data();
            if (banData.userId === userId) {
                await deleteDoc(doc(db, 'ban', docSnapshot.id));
                console.log(`Ban record for user ${userId} deleted.`);
            }
        });

        // Update the UI to reflect the unbanned status
        statusElement.textContent = 'Active';
        alert(`User ${userId} has been unbanned.`);

        // Refresh the user list to update the button dynamically
        displayUsers();
    } catch (error) {
        console.error('Error unbanning user:', error);
        alert('Error unbanning user: ' + error.message);
    }
}


// Function to open the ban user modal
export function openBanUserModal(userId) {
    const modal = document.getElementById('banUserModal');
    modal.classList.remove('hidden'); // Show the modal

    const confirmButton = document.getElementById('confirmBanButton');
    const cancelButton = document.getElementById('cancelBanButton');

    // Clear any previous event listeners
    confirmButton.onclick = null;
    cancelButton.onclick = null;

    // Handle Confirm
    confirmButton.onclick = async () => {
        const banReason = document.getElementById('banReason').value.trim();
        const banDurationSlider = document.getElementById(`ban-duration-${userId}`); // Get the slider outside the modal
        const banDuration = parseInt(banDurationSlider.value, 10); // Get the duration

        if (!banReason) {
            alert('Please enter a reason for banning the user.');
            return;
        }

        try {
            await banUser(userId, banReason, banDuration); // Call the banUser function
            closeBanUserModal();
        } catch (error) {
            console.error('Error banning user:', error);
            alert('Error banning user: ' + error.message);
        }
    };

    // Handle Cancel
    cancelButton.onclick = () => {
        closeBanUserModal(); // Close the modal
    };
}



// Function to close the modal
export function closeBanUserModal() {
    const modal = document.getElementById('banUserModal');
    modal.classList.add('hidden'); // Hide the modal
    document.getElementById('banReason').value = ''; // Clear input fields
   
}

// Function to ban a user
export async function banUser(userId, reason, duration) {
    const statusElement = document.getElementById(`status-${userId}`);
    try {
        // Calculate the ban expiration timestamp
        const banExpirationDate = new Date();
        banExpirationDate.setDate(banExpirationDate.getDate() + duration); // Add ban duration

        // Update Firestore `users` collection with ban status
        await updateDoc(doc(db, 'users', userId), {
            status: 'Banned',
        });

        // Add a new document to the `ban` collection with ban details
        const banCollectionRef = collection(db, 'ban');
        await addDoc(banCollectionRef, {
            userId: userId,
            banDuration: duration,
            banExpiration: banExpirationDate,
            reason: reason,
            timestamp: new Date(), // The time when the ban was issued
        });

        // Update the UI to show the user is banned
        statusElement.textContent = 'Banned';
        alert(`User banned for ${duration} day(s). Reason: ${reason}`);
    } catch (error) {
        console.error('Error banning user:', error);
        alert('Error banning user: ' + error.message);
    }
}

