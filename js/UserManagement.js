// Import Firestore database from firebaseConfig.js
import { db } from './firebaseConfig.js';

import { collection, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'; // Import required Firestore methods



// Function to display users based on the URL parameter
async function displayUsers() {
    const userCardsContainer = document.querySelector('.user-cards');
    userCardsContainer.innerHTML = ''; // Clear existing user cards

    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status'); // Get the 'status' parameter from URL

    let querySnapshot;

    try {
        // Fetch all users from the 'users' collection
        console.log('Fetching all users...');
        const usersRef = collection(db, 'users'); // Reference to the 'users' collection
        querySnapshot = await getDocs(usersRef); // Fetch all users

        // Display each user
        querySnapshot.forEach((docSnapshot) => {
            const userData = docSnapshot.data();
            console.log('User found:', userData);
            createUserCard(docSnapshot.id, userData, userCardsContainer);
        });

        // Check if no users were found
        if (querySnapshot.empty) {
            console.log('No users found.');
            userCardsContainer.innerHTML = '<p>No users found.</p>';
        }

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
        ? userData.createdAt.toDate().toString() 
        : 'N/A';

    const lastActive = userData.lastActive instanceof Timestamp 
        ? userData.lastActive.toDate().toString() 
        : 'N/A';

    // Concatenate first name and last name to create full name
    const fullName = `${userData.firstName || 'Unknown'} ${userData.lastName || ''}`.trim();

    userCard.innerHTML = `
        <img src="${userData.avatar || 'default-avatar.png'}" alt="User avatar" class="user-avatar">
        <h3>${fullName}</h3>
        <p>@${userData.username || 'unknown'}</p>
        <p>Email: ${userData.email || 'N/A'}</p>
        <p>Role: ${userData.role || 'unknown'}</p>
        <p>Status: <span id="status-${userId}">${userData.status || 'Unknown'}</span></p>
        <p>Last Active: ${lastActive}</p> <!-- Display lastActive -->
        <p>Account Created: ${createdAt}</p> <!-- Display createdAt -->
        <div class="card-buttons">
            <button class="delete-button" onclick="deleteUser('${userId}')">Delete</button>
            <button class="ban-button" onclick="banUser('${userId}')">Ban</button>
            <button class="edit-button" onclick="editUser('${userId}')">Edit</button>
        </div>
        <label for="ban-duration-${userId}">Ban Duration (days):</label>
        <input type="range" id="ban-duration-${userId}" name="ban-duration" min="1" max="30" value="1" oninput="updateBanDuration('${userId}')">
        <span id="ban-duration-display-${userId}">1</span> days
    `;
    container.appendChild(userCard);
}





// Function to update the displayed ban duration
function updateBanDuration(userId) {
    const slider = document.getElementById(`ban-duration-${userId}`);
    const display = document.getElementById(`ban-duration-display-${userId}`);
    display.textContent = slider.value; // Update the displayed number of days
}

// Function to ban a user
async function banUser(userId) {
    const statusElement = document.getElementById(`status-${userId}`);
    try {
        await updateDoc(doc(db, 'users', userId), {
            status: 'Banned' // Change status to banned
        });
        statusElement.textContent = 'Banned'; // Update UI
    } catch (error) {
        console.error('Error banning user:', error);
        alert('Error banning user: ' + error.message);
    }
}

// Function to delete a user
async function deleteUser(userId) {
    try {
        await deleteDoc(doc(db, 'users', userId));
        displayUsers(); // Refresh the user list
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
}

// Load users when the page is loaded
document.addEventListener('DOMContentLoaded', displayUsers);
