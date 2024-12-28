// Import Firestore database from firebaseConfig.js
import { db } from './firebaseConfig.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'; // Import required Firestore methods
import { logout } from './login.js';


// Store all users in a local cache for search and sort
let cachedUsers = [];

// Function to display users (with optional search and sort capabilities)
async function displayUsers({ searchTerm = '', sortKey = '', filterKey = '', filterValue = '' } = {}) {
    const userCardsContainer = document.querySelector('.user-cards');
    userCardsContainer.innerHTML = ''; // Clear existing user cards

    try {
        // If cachedUsers is empty, fetch users from Firestore
        if (cachedUsers.length === 0) {
            console.log('Fetching all users...');
            const usersRef = collection(db, 'users'); // Reference to the 'users' collection
            const querySnapshot = await getDocs(usersRef); // Fetch all users

            if (querySnapshot.empty) {
                console.log('No users found.');
                userCardsContainer.innerHTML = '<p>No users found.</p>';
                return;
            }
            // Cache the fetched users
            cachedUsers = querySnapshot.docs.map((docSnapshot) => {
                const userData = docSnapshot.data();
                userData.id = docSnapshot.id; // Add document ID
                return userData;
            });
        }
        // Filter users based on the search term
        let users = [...cachedUsers];
        if (searchTerm) {
            users = users.filter((user) =>
                (user.firstName || '').toLowerCase().includes(searchTerm) ||
                (user.lastName || '').toLowerCase().includes(searchTerm) ||
                (user.username || '').toLowerCase().includes(searchTerm) ||
                (user.email || '').toLowerCase().includes(searchTerm)
            );
        }
        // Apply filtering by key and value
        if (filterKey && filterValue) {
            users = users.filter((user) => user[filterKey] === filterValue);
        }
        // Sort users based on the selected sort key
        if (sortKey) {
            users.sort((a, b) => {
                if (sortKey === 'lastActive') {
                    // Convert string to Date for comparison
                    const dateA = a.lastActive ? new Date(a.lastActive) : new Date(0); // Default to epoch if missing
                    const dateB = b.lastActive ? new Date(b.lastActive) : new Date(0);
                    return dateB - dateA; // Descending order
                } else if (sortKey === 'accountCreated') {
                    return new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0);
                } else if (sortKey === 'status' || sortKey === 'role') {
                    return (a[sortKey] || '').localeCompare(b[sortKey] || '');
                }
                return 0;
            });
        }

        // Display the filtered and sorted users
        users.forEach((userData) => {
            createUserCard(userData.id, userData, userCardsContainer);
        });
    } catch (error) {
        console.error('Error displaying users:', error);
        userCardsContainer.innerHTML = `<p>Error displaying users: ${error.message}</p>`;
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

    const lastActive = userData.lastActive
        ? new Date(userData.lastActive).toLocaleString() // Convert and format the string
        : 'N/A'; // Handle missing `lastActive`

    // Concatenate first name and last name to create full name
    const fullName = `${userData.firstName || 'Unknown'} ${userData.lastName || ''}`.trim();

    // Use profilePic URL or fallback to a placeholder image
    const profilePicUrl = userData.profilePic || '../assets/Default_profile_icon.jpg';

    // Determine if the user is banned
    const isBanned = userData.status === 'Banned';

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
            ${isBanned
            ? `<button class="unban-button" onclick="unbanUser('${userId}')">Unban</button>`
            : `<button class="ban-button" onclick="openBanUserModal('${userId}')">Ban</button>`
        }
            <button class="view-button" onclick="viewUser('${userId}')">View</button>
        </div>
        ${!isBanned
            ? `
            <div class="ban-slider">
                <label for="ban-duration-${userId}">Ban Duration (days):</label>
                <input 
                    type="range" 
                    id="ban-duration-${userId}" 
                    name="ban-duration-${userId}" 
                    min="1" 
                    max="30" 
                    value="1" 
                    onchange="updateBanDuration('${userId}')"
                >
                <span id="ban-duration-display-${userId}">1</span> day(s)
            </div>`
            : ''
        }
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


export async function unbanUser(userId) {
    try {
        // Update Firestore `users` collection to reset the status
        await updateDoc(doc(db, 'users', userId), {
            status: 'active',
        });
        // Find and delete the related ban document in the `ban` collection
        const banCollectionRef = collection(db, 'ban');
        const querySnapshot = await getDocs(banCollectionRef);

        for (const docSnapshot of querySnapshot.docs) {
            const banData = docSnapshot.data();
            if (banData.userId === userId) {
                await deleteDoc(doc(db, 'ban', docSnapshot.id));
                console.log(`Ban record for user ${userId} deleted.`);
            }
        }
        // Update the cached user data
        const updatedUser = cachedUsers.find((user) => user.id === userId);
        if (updatedUser) {
            updatedUser.status = 'active';
        }

        // Dynamically refresh the card for the unbanned user
        const userCard = document.querySelector(`#status-${userId}`).closest('.user-card');
        const userCardsContainer = document.querySelector('.user-cards');
        if (userCard) {
            // Remove the outdated card
            userCardsContainer.removeChild(userCard);

            // Recreate the card with updated data
            createUserCard(userId, updatedUser, userCardsContainer);
        }
        alert(`User ${userId} has been unbanned.`);

    } catch (error) {
        console.error('Error unbanning user:', error);
        alert('Error unbanning user: ' + error.message);
    }
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



document.addEventListener("DOMContentLoaded", async () => {
    await displayUsers(); // Display users initially
    handleSearchSortFilter(); // Enable search and sort functionality
    initializeApp(); // Start the app initialization
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


// Function to open the ban user modal
export function openBanUserModal(userId) {
    const modal = document.getElementById('banUserModal');
    modal.classList.remove('hidden'); // Show the modal

    const confirmButton = document.getElementById('confirmBanButton');
    const cancelButton = document.getElementById('cancelBanButton');

    confirmButton.onclick = null;
    cancelButton.onclick = null;

    confirmButton.onclick = async () => {
        const banReason = document.getElementById('banReason').value.trim();
        const banDurationSlider = document.getElementById(`ban-duration-${userId}`);
        const banDuration = parseInt(banDurationSlider.value, 10);

        if (!banReason) {
            alert('Please enter a reason for banning the user.');
            return;
        }

        try {
            await banUser(userId, banReason, banDuration);
            closeBanUserModal();
        } catch (error) {
            console.error('Error banning user:', error);
            alert('Error banning user: ' + error.message);
        }
    };

    cancelButton.onclick = () => {
        closeBanUserModal();
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
    try {
        // Calculate the ban expiration timestamp
        const banExpirationDate = new Date();
        banExpirationDate.setDate(banExpirationDate.getDate() + duration); // Add ban duration
        // Get the logged-in admin's ID (replace with your authentication logic)
        const loggedInAdminId = sessionStorage.getItem("userId"); // Assuming admin ID is stored in localStorage

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
        // Add a new document to the `AdminNote` collection with the logged-in admin's information
        const adminNoteCollectionRef = collection(db, 'AdminNote');
        await addDoc(adminNoteCollectionRef, {
            adminId: loggedInAdminId, // The admin who performed the ban
            userId: userId, // The user who was banned
            category: 'banned', // Category indicating the action type
            reason: reason, // The reason for banning
            timestamp: new Date(), // Timestamp of the action
        });
        // Update the cached user data
        const updatedUser = cachedUsers.find((user) => user.id === userId);
        if (updatedUser) {
            updatedUser.status = 'Banned';
        }
        // Dynamically refresh the card for the banned user
        const userCard = document.querySelector(`#status-${userId}`).closest('.user-card');
        const userCardsContainer = document.querySelector('.user-cards');
        if (userCard) {
            // Remove the outdated card
            userCardsContainer.removeChild(userCard);
            // Recreate the card with updated data
            createUserCard(userId, updatedUser, userCardsContainer);
        }
        alert(`User banned for ${duration} day(s). Reason: ${reason}`);
    } catch (error) {
        console.error('Error banning user:', error);
        alert('Error banning user: ' + error.message);
    }
}


// Handle search, sort, and filter interactions
function handleSearchSortFilter() {
    const searchInput = document.querySelector('.search-container input');
    const sortButton = document.querySelector('.sort-button');
    let dropdownMenu = null;

    // Add an event listener for the sort button to toggle the dropdown menu
    sortButton.addEventListener('click', () => {
        if (!dropdownMenu) {
            // Create and display the dropdown menu
            dropdownMenu = document.createElement('div');
            dropdownMenu.classList.add('sort-dropdown');
            dropdownMenu.innerHTML = `
                <h4>Sort Options</h4>
                <ul>
                    <li data-sort="lastActive">Sort by Last Active</li>
                    <li data-sort="accountCreated">Sort by Account Creation Date</li>
                </ul>
                <h4>Filter Options</h4>
                <ul>
                    <li data-filter="role:admin">Filter by Admin Role</li>
                    <li data-filter="role:user">Filter by User Role</li>
                    <li data-filter="status:Banned">Filter by Banned Status</li>
                    <li data-filter="status:Active">Filter by Active Status</li>
                    <li data-filter="status:Unverified">Filter by Unverified Status</li>
                </ul>
            `;
            document.body.appendChild(dropdownMenu);

            // Position the dropdown near the button
            const rect = sortButton.getBoundingClientRect();
            dropdownMenu.style.position = 'absolute';
            dropdownMenu.style.top = `${rect.bottom + window.scrollY}px`;
            dropdownMenu.style.left = `${rect.left + window.scrollX}px`;

            // Add event listeners to dropdown items
            dropdownMenu.querySelectorAll('li[data-sort]').forEach((item) => {
                item.addEventListener('click', async (event) => {
                    const sortKey = event.target.dataset.sort;
                    console.log(`Sorting by: ${sortKey}`);
                    await displayUsers({ sortKey });
                    dropdownMenu.remove();
                    dropdownMenu = null; // Clean up
                });
            });

            dropdownMenu.querySelectorAll('li[data-filter]').forEach((item) => {
                item.addEventListener('click', async (event) => {
                    const [filterKey, filterValue] = event.target.dataset.filter.split(':');
                    console.log(`Filtering by: ${filterKey} = ${filterValue}`);
                    await displayUsers({ filterKey, filterValue });
                    dropdownMenu.remove();
                    dropdownMenu = null; // Clean up
                });
            });
        } else {
            // Remove the dropdown if it already exists
            dropdownMenu.remove();
            dropdownMenu = null;
        }
    });

    // Add an event listener for the search input to filter results
    searchInput.addEventListener('input', async (event) => {
        const searchTerm = event.target.value.toLowerCase();
        console.log(`Searching for: ${searchTerm}`);
        await displayUsers({ searchTerm });
    });
}



//=========================== splash screen ======================================

// Function to hide the splash screen
function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.style.opacity = 0; // Smooth transition effect
        setTimeout(() => splashScreen.remove(), 500); // Wait for the transition to complete and then remove
    }
}

// Function to initialize the app
async function initializeApp() {
    try {
        console.log("Initializing the app...");

        // Fetch and display users
        await displayUsers();

        // Enable search, sort, and filter
        handleSearchSortFilter();

        // Hide the splash screen after everything is loaded
        hideSplashScreen();
    } catch (error) {
        console.error("Error during app initialization:", error);

        // Hide the splash screen even if there's an error
        hideSplashScreen();

        // Optionally show an error message to the user
        document.body.innerHTML += `<p class="error">Error loading the application. Please try again later.</p>`;
    }
}




//=========================== END of splash screen ======================================








