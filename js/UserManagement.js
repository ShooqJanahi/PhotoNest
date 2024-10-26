// Import Firestore database from firebaseConfig.js
import { db } from './firebaseConfig.js';

// Function to display users
async function displayUsers() {
    const userCardsContainer = document.querySelector('.user-cards');
    userCardsContainer.innerHTML = ''; // Clear existing user cards

    // Fetch users from Firestore
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        createUserCard(doc.id, userData, userCardsContainer);
    });
}

// Function to create a user card
function createUserCard(userId, userData, container) {
    const userCard = document.createElement('div');
    userCard.className = 'user-card';
    userCard.innerHTML = `
        <img src="${userData.avatar || 'default-avatar.png'}" alt="User avatar" class="user-avatar">
        <h3>${userData.name}</h3>
        <p>@${userData.username}</p>
        <p>Role: ${userData.role}</p>
        <p>Status: <span id="status-${userId}">${userData.status}</span></p>
        <p>Last Active: ${userData.lastActive}</p>
        <p>Account Created: ${userData.createdAt}</p>
        <div class="card-buttons">
            <button class="delete-button" onclick="deleteUser('${userId}')">Delete</button>
            <button class="ban-button" onclick="banUser('${userId}')">Ban</button>
            <button class="edit-button" onclick="editUser('${userId}')">Edit</button>
        </div>
        <label for="ban-duration-${userId}">Ban Duration (days):</label>
        <input type="range" id="ban-duration-${userId}" name="ban-duration" min="1" max="30" value="1" oninput="updateBanDuration(${userId})">
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
    await db.collection('users').doc(userId).update({
        status: 'Banned' // Change status to banned
    });
    statusElement.textContent = 'Banned'; // Update UI
}

// Function to delete a user
async function deleteUser(userId) {
    await db.collection('users').doc(userId).delete();
    displayUsers(); // Refresh the user list
}

// Load users when the page is loaded
document.addEventListener('DOMContentLoaded', displayUsers);
