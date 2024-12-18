// Import Firebase Firestore services
import { collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
// Import Firebase configuration
import { db } from './firebaseConfig.js';
// Import utility functions for notifications and login/logout functionality
import { createNotificationPopup, openPopup } from './Notification.js';
import { logout } from './login.js';


// Reference the container where albums will be displayed
const albumsContainer = document.getElementById('albums-container');

// Reference the search input and button
const searchInput = document.getElementById('album-search');
const searchButton = document.getElementById('search-button');

// Global variable to store the user's albums for filtering and rendering
let userAlbums = [];

// Event listener for the logout button
document.getElementById('logout-button').addEventListener('click', async (event) => {
    event.preventDefault(); // Prevents default anchor behavior
    await logout(); // Call the logout function to sign the user out
});

// Event listener for the notification bell icon
document.querySelector('.fa-bell').addEventListener('click', () => {
    let popup = document.getElementById('notification-popup');
    let overlay = document.getElementById('popup-overlay');

    // Create notification popup if it doesn't already exist
    if (!popup || !overlay) {
        createNotificationPopup();
    }

    // Open the popup
    openPopup();
});

// Fetch the user's profile picture from Firestore and display it
async function fetchUserProfileImage() {
    const user = JSON.parse(sessionStorage.getItem('user')); // Retrieve user data from session storage

    // Check if user data exists
    if (!user || !user.uid) {
        console.error("User not logged in or UID not found.");
        return;
    }
    try {
        // Fetch user document from Firestore using UID
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data(); // Extract user data
            console.log("User data fetched successfully:", userData); // Debugging step

            // Set profile picture if available
            if (userData.profilePic) {
                const profileImageElement = document.getElementById('profile-image');
                if (profileImageElement) {
                    profileImageElement.src = userData.profilePic; // Set the profile picture
                    console.log("Profile picture set:", userData.profilePic); // Debugging step
                } else {
                    console.error("Profile image element not found in the DOM.");
                }
            } else {
                console.log("Profile picture is not set for the user in Firestore.");
            }
        } else {
            console.error("User document does not exist in Firestore.");
        }
    } catch (error) {
        console.error("Error fetching user profile data:", error);
    }
}



document.addEventListener('DOMContentLoaded', async () => {
    setupCreateAlbumModal();// Initialize Create Album Modal functionality
    await fetchUserProfileImage();// Fetch user profile image

    const user = JSON.parse(sessionStorage.getItem('user')); // Get the logged-in user
    if (!user || !user.uid) {
        console.error("User not logged in.");
        return;
    }
    try {
        // Query Firestore for albums belonging to the current user
        const albumsQuery = query(
            collection(db, 'Albums'),
            where('userId', '==', user.uid) // Filter albums by user ID
        );
        const albumsSnapshot = await getDocs(albumsQuery);

        // Handle empty album list
        if (albumsSnapshot.empty) {
            albumsContainer.innerHTML = '<p>No albums found.</p>';
            return;
        }
        // Process albums and fetch thumbnails for display
        userAlbums = await Promise.all(
            albumsSnapshot.docs.map(async albumDoc => { 
                const albumData = albumDoc.data(); // Extract album data
                const albumId = albumDoc.id;

                // Default thumbnail if no photos exist
                let thumbnailUrl = '../assets/PhotoNest_Logo.jpg'; 

                // Fetch the first photo if photo IDs are available
                if (albumData.photoIds && albumData.photoIds.length > 0) {
                    const firstPhotoId = albumData.photoIds[0];
                    const photoDoc = await getDoc(doc(db, 'Photos', firstPhotoId));
                    if (photoDoc.exists()) {
                        thumbnailUrl = photoDoc.data().imageUrl || thumbnailUrl;
                    }
                }
                // Return album details with thumbnail
                return {
                    id: albumId,
                    ...albumData,
                    thumbnailUrl,
                };
            })
        );

        renderAlbums(userAlbums); // Render albums on the page


        const editButtons = document.querySelectorAll('.options-btn[data-action="edit"]');
        const modal = document.getElementById('editAlbumModal');
        const closeBtn = document.querySelector('.close');
        const saveBtn = document.getElementById('saveEdit');
        const titleInput = document.getElementById('editAlbumTitle');
        let currentAlbumId = '';

        editButtons.forEach(button => {
            button.addEventListener('click', function () {
                const albumId = this.closest('.album-card').getAttribute('data-album-id');
                const currentTitle = this.closest('.album-card').querySelector('.info h3').innerText;
                titleInput.value = currentTitle;
                currentAlbumId = albumId;
                modal.style.display = 'block';
            });
        });

        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }

        saveBtn.addEventListener('click', () => {
            if (titleInput.value.trim()) {
                const albumRef = doc(db, 'Albums', currentAlbumId);
                updateDoc(albumRef, { name: titleInput.value.trim() })
                    .then(async() => {
                        await logActivity("edit_album", currentAlbumId); // Log album edit
                        alert('Album title updated successfully.');
                        location.reload(); // Refresh the page to show the new title
                    })
                    .catch(error => {
                        console.error('Error updating album:', error);
                        alert('Failed to update album. Please try again.');
                    });
                modal.style.display = 'none';
            } else {
                alert('Please enter a valid title.');
            }
        });

    } catch (error) {
        console.error("Error fetching albums:", error);
        albumsContainer.innerHTML = '<p>Error loading albums. Please try again later.</p>';
    }
});


// Function to display albums dynamically
function renderAlbums(albums) {
    const albumsContainer = document.getElementById('albums-container');
    albumsContainer.innerHTML = ''; // Clear previous content

    // If no albums exist, display a message
    if (albums.length === 0) {
        albumsContainer.innerHTML = '<p>No albums found.</p>';
        return;
    }
    // Loop through albums and create HTML for each album
    albums.forEach(album => {
        const albumCard = `
            <div class="album-card" data-album-id="${album.id}">
                <div class="album-options">
                    <i class="fas fa-ellipsis-v options-icon"></i>
                    <div class="options-menu hidden" data-album-id="${album.id}">
                        <button class="options-btn" data-action="edit">Edit</button>
                        <button class="options-btn" data-action="delete">Delete</button>
                        <button class="options-btn" data-action="share">Share Album</button>
                    </div>
                </div>
                <img src="${album.thumbnailUrl}" alt="${album.name}" class="clickable-area">
                <div class="info clickable-area">
                    <h3>${album.name}</h3>
                    <p>${album.photoIds ? album.photoIds.length : 0} photos</p>
                </div>
            </div>
        `;

        albumsContainer.innerHTML += albumCard; // Append the album card
    });

    setupAlbumCardListeners(); // Add event listeners to album cards
}

document.getElementById('album-search').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchAlbums();
    }
});


async function createAlbum(title) {
    const user = JSON.parse(sessionStorage.getItem('user')); // Fetch logged-in user
    if (!user || !user.uid) {
        console.error("User not logged in.");
        alert("You must be logged in to create an album.");
        return;
    }

    try {
        const newAlbum = {
            name: title,
            
            photoIds: [], // Empty array for photos initially
            createdAt: new Date().toISOString(),
            userId: user.uid, // Link album to the current user
        };

        // Add the new album to Firestore
        const albumRef = await addDoc(collection(db, "Albums"), newAlbum);

        await logActivity("created_album", albumRef.id); // Log album creation

        alert("Album created successfully!");
        location.reload(); // Refresh to show the new album
    } catch (error) {
        console.error("Error creating album:", error);
        alert("Failed to create album. Please try again.");
    }
}

// Function to initialize the Create Album modal
function setupCreateAlbumModal() {
    const createAlbumButton = document.querySelector('.icons button'); // Select the create album button
    const createAlbumModal = document.getElementById('createAlbumModal');
    const closeModalButton = createAlbumModal.querySelector('.close');
    const createAlbumForm = document.getElementById('createAlbumForm');

    // Show the modal when clicking the Create Album button
    createAlbumButton.addEventListener('click', () => {
        createAlbumModal.style.display = 'block';
    });

    // Close the modal when clicking the close button
    closeModalButton.addEventListener('click', () => {
        createAlbumModal.style.display = 'none';
    });

    // Close the modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === createAlbumModal) {
            createAlbumModal.style.display = 'none';
        }
    });

    // Handle album creation form submission
    createAlbumForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent page reload

        const albumTitle = document.getElementById('albumTitle').value.trim();
        if (albumTitle) {
            createAlbum(albumTitle); // Create new album
            createAlbumModal.style.display = 'none'; // Close modal
        } else {
            alert("Please enter a valid album title.");
        }
    });
}




// Function to setup event listeners for each album card
function setupAlbumCardListeners() {
    albumsContainer.querySelectorAll('.album-card').forEach(card => {

        // Setup redirection for non-option areas of the card
        const clickableAreas = card.querySelectorAll('.clickable-area');
        clickableAreas.forEach(area => {
            area.addEventListener('click', () => {
                const albumId = card.getAttribute('data-album-id');
                localStorage.setItem('currentAlbumId', albumId);
                localStorage.setItem('currentAlbumIdTimestamp', Date.now());
                window.location.href = 'PhotoGallery.html'; // Redirection
            });
        });
        const optionsIcon = card.querySelector('.options-icon');
        const optionsMenu = card.querySelector('.options-menu');

        // Remove any existing listener to avoid duplicates
        optionsIcon.removeEventListener('click', toggleMenu);
        optionsIcon.addEventListener('click', toggleMenu);
        function toggleMenu(event) {
            event.stopPropagation(); // Stop event bubbling
            console.log('Options menu clicked'); // Debug log
            closeAllOptionMenus(); // Close other open menus
            optionsMenu.classList.toggle('show'); // Toggle the 'show' class instead of 'hidden'
        }
        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!optionsMenu.contains(event.target) && !optionsIcon.contains(event.target)) {
                optionsMenu.classList.add('hidden');
            }
        });

        // Options menu button handling
        optionsMenu.querySelectorAll('.options-btn').forEach(button => {
            button.removeEventListener('click', handleOption);
            button.addEventListener('click', handleOption);
        });

        function handleOption(event) {
            event.stopPropagation();
            handleOptionClick(event, card);
        }
    });
    // Close all open menus helper
    function closeAllOptionMenus() {
        document.querySelectorAll('.options-menu').forEach(menu => {
            menu.classList.remove('show'); // Remove 'show' class from all menus
        });
    }
}





// Function to handle option clicks
function handleOptionClick(event, card) {
    const albumId = card.getAttribute('data-album-id');
    const action = event.target.getAttribute('data-action');
    switch (action) {
        case 'edit':
            editAlbum(albumId);
            break;
        case 'delete':
            deleteAlbum(albumId);
            break;
        case 'share':
            ShareAlbumDetails(albumId);
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// Functions for options menu actions
function editAlbum(albumId) {
    console.log(`Edit album: ${albumId}`);
    // opens the edit album popup
}

// Function to delete an album after confirmation
function deleteAlbum(albumId) {
    const confirmation = confirm("Are you sure you want to delete this album?");
    if (confirmation) {
        // Deleting the album document from Firestore
        const albumRef = doc(db, 'Albums', albumId);

        deleteDoc(albumRef)
            .then(async() => {
                console.log(`Album ${albumId} deleted successfully.`);

                await logActivity("delete_album", albumId); // Log album deletion
                alert("Album deleted successfully.");

                // Refresh the albums list or redirect as needed
                location.reload(); // Reload the page to refresh the albums list
            })
            .catch(error => {
                console.error("Error deleting album:", error);
                alert("Failed to delete album. Please try again.");
            });
    }
}


// Share Album Details Function
function ShareAlbumDetails(albumId) {
    const modal = document.getElementById('shareAlbumModal');
    const closeModal = document.getElementById('closeShareModal');
    const recipientInput = document.getElementById('recipientSearch');
    const autocompleteResults = document.getElementById('autocomplete-results');
    const shareForm = document.getElementById('shareAlbumForm');
    const messageInput = document.getElementById('shareMessage');

    let selectedRecipient = null;

    // Show the modal
    modal.style.display = 'block';

    // Close modal when clicking the close button
    closeModal.onclick = () => {
        modal.style.display = 'none';
        resetShareForm();
    };

    // Reset modal fields
    function resetShareForm() {
        recipientInput.value = '';
        messageInput.value = '';
        autocompleteResults.innerHTML = '';
        selectedRecipient = null;
    }

    // Fetch and display autocomplete results
    recipientInput.addEventListener('input', async () => {
        const searchQuery = recipientInput.value.trim().toLowerCase();
        if (!searchQuery) {
            autocompleteResults.innerHTML = '';
            return;
        }

        try {
            // Query Firestore for matching usernames with the role "user"
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                where('username', '>=', searchQuery),
                where('username', '<=', searchQuery + '\uf8ff'),
                where('role', '==', 'user') // Filter for role "user"
            );

            const querySnapshot = await getDocs(q);

            // Display autocomplete results
            autocompleteResults.innerHTML = '';
            if (querySnapshot.empty) {
                autocompleteResults.innerHTML = `<div>No users found.</div>`;
                return;
            }

            querySnapshot.forEach(doc => {
                const user = doc.data();
                const userId = doc.id;

                const resultItem = document.createElement('div');
                resultItem.classList.add('autocomplete-item');
                resultItem.innerHTML = `
                    <img src="${user.profilePic || '../assets/Default_profile_icon.jpg'}" alt="${user.username} Profile picture">
                    <span>${user.username}</span>
                `;
                resultItem.addEventListener('click', () => {
                    selectedRecipient = { id: userId, username: user.username };
                    recipientInput.value = user.username;
                    autocompleteResults.innerHTML = '';
                });

                autocompleteResults.appendChild(resultItem);
            });
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    });


    // Handle form submission
    shareForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!selectedRecipient) {
            alert('Please select a valid recipient.');
            return;
        }

        const currentUser = JSON.parse(sessionStorage.getItem('user')); // Assume current user info is stored in session
        const optionalMessage = messageInput.value.trim(); // Get the optional message

        const messageData = {
            senderId: currentUser.uid,
            receiverId: selectedRecipient.id,
            subject: 'Shared an Album',
            albumId: albumId,
            message: optionalMessage || '',
            status: 'Unread',
            timestamp: serverTimestamp(),
        };

        try {
            // Save the message in Firestore
            await addDoc(collection(db, 'Messages'), messageData);

            // Log activity and notification
            await logActivity("shared_album", albumId); // Log album sharing
            await logNotification(selectedRecipient.id, currentUser.uid, albumId); // Log notification
           
            alert(`Album shared successfully with ${selectedRecipient.username}.`);
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error sharing album:', error);
            alert('Failed to share the album. Please try again.');
        }
    });
}


document.getElementById('search-button').addEventListener('click', searchAlbums);

function searchAlbums() {
    const searchQuery = document.getElementById('album-search').value.toLowerCase().trim();
    const filteredAlbums = userAlbums.filter(album => album.name.toLowerCase().includes(searchQuery));
    renderAlbums(filteredAlbums);
}


//========================== Activity log ================

// Function to log user activity to Firestore
async function logActivity(category, targetId) {
    const currentUser = JSON.parse(sessionStorage.getItem('user')); // Fetch the current user

    if (!currentUser || !currentUser.uid) {
        console.error("User not logged in.");
        return;
    }

    try {
        // Create a timestamp in ISO string format
        const currentTimestamp = new Date().toISOString();

        const activityLog = {
            category: category,            // Action category (e.g., "delete_album")
            userId: currentUser.uid,       // Current user's ID
            targetId: targetId,            // Album ID or target ID
            timestamp: currentTimestamp,  // Firestore server timestamp
        };

        // Save log to "ActivityLogs" collection
        await addDoc(collection(db, 'ActivityLogs'), activityLog);
        console.log(`Activity logged: ${category} for target ${targetId}`);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}


//========================== END of Activity log ================


//======================= Share Album Notification =================
// Function to log a notification when an album is shared
async function logNotification(receiverId, senderId, albumId, photoId = null) {
    try {
        const notificationData = {
            category: "Share", // Default category
            senderId: senderId, // ID of the sender
            receiverId: receiverId, // ID of the receiver
            albumId: albumId, // Shared album ID
           
            status: "unopen", // Default status
            timestamp: new Date().toISOString(), // ISO time format
        };

        // Add the notification to the "Notifications" collection
        await addDoc(collection(db, "Notifications"), notificationData);
        console.log(`Notification sent to user: ${receiverId}`);
    } catch (error) {
        console.error("Error logging notification:", error);
    }
}



//======================= END of Share Album Notification =================