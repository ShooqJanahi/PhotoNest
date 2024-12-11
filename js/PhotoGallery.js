// Import Firebase services
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'; // Firebase Auth import
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js'; // Firebase configuration import
import { logout } from './login.js';
import { createNotificationPopup, openPopup } from './Notification.js';

// Attach an event listener to the bell icon
document.querySelector('.fa-bell').addEventListener('click', () => {
    let popup = document.getElementById('notification-popup');
    let overlay = document.getElementById('popup-overlay');

    // Create the popup if it doesn't exist
    if (!popup || !overlay) {
        createNotificationPopup();
    }

    // Open the popup
    openPopup();
});


const galleryContainer = document.querySelector('.gallery');

// DOM elements
const profileDropdown = document.querySelector('.profile-dropdown');

// Initialize Firebase Auth
const auth = getAuth();

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Save user data to sessionStorage
        sessionStorage.setItem('user', JSON.stringify({ uid: user.uid, email: user.email }));
        console.log("User data stored in sessionStorage:", user);
    } else {
        console.log("No user is logged in.");
    }
});

// Show/hide dropdown on hover
const profileContainer = document.querySelector('.profile-container');

profileContainer.addEventListener('mouseenter', () => {
    profileDropdown.classList.remove('hidden'); // Show dropdown
});

profileContainer.addEventListener('mouseleave', () => {
    profileDropdown.classList.add('hidden'); // Hide dropdown
});

document.getElementById('logout-button').addEventListener('click', async (event) => {
    event.preventDefault();
    await logout();
});


async function fetchUserProfileImage() {
    const user = JSON.parse(sessionStorage.getItem('user')); // Get the logged-in user from session storage
    if (!user || !user.uid) {
        console.error("User not logged in or UID not found in session storage.");
        return;
    }

    try {
        // Fetch the user's document from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data fetched successfully:", userData); // Debugging step

            // Check if the profilePic field exists
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

// Function to toggle the visibility of the options menu
document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.querySelector('.gallery');

     // Fetch and display the profile image
     await fetchUserProfileImage();
     await determinePhotoSource();  // Add this below existing logic

    gallery.addEventListener('click', (event) => {
        // Check if the click is on an ellipsis icon
        if (event.target.classList.contains('options-icon')) {
            const optionsMenu = event.target.nextElementSibling;

            // Toggle visibility of the menu
            if (optionsMenu) {
                optionsMenu.classList.toggle('hidden');
            }
        }

        // Close any open menu when clicking outside
        if (!event.target.classList.contains('options-icon')) {
            document.querySelectorAll('.options-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    });
});

async function determinePhotoSource() {
   

    const albumId = localStorage.getItem('currentAlbumId'); // Check if an album is selected
    if (albumId) {
        console.log('Album selected, loading album photos...');
        await loadPhotosForAlbum(albumId); // Load album photos
    } else {
        console.log('Default mode, loading public photos...');
        await loadPhotosFromCollection('Photos'); // Load public photos
    }
}






async function loadPhotosFromCollection(collectionName) {
    try {
        const photosRef = collection(db, collectionName);
        const photosSnapshot = await getDocs(photosRef);

        const photos = photosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        renderPhotos(photos);
    } catch (error) {
        console.error(`Error loading photos from ${collectionName}:`, error);
        galleryContainer.innerHTML = `<p>Error loading photos. Please try again later.</p>`;
    }
}



// Fetch the selected album ID from localStorage
const albumId = localStorage.getItem('currentAlbumId');
if (!albumId) {
    console.error('No album selected.');
    galleryContainer.innerHTML = '<p>No album selected. Please return to the Albums page and try again.</p>';
} else {
    loadPhotosForAlbum(albumId);
}

/**
 * Function to load photos for a selected album.
 * @param {string} albumId - The ID of the selected album.
 */
async function loadPhotosForAlbum(albumId) {
    try {
        // Fetch the album document from Firestore
        const albumDocRef = doc(db, 'Albums', albumId);
        const albumDoc = await getDoc(albumDocRef);

        if (!albumDoc.exists()) {
            console.error('Album does not exist.');
            galleryContainer.innerHTML = '<p>Album does not exist. Please return to the Albums page.</p>';
            return;
        }

        const albumData = albumDoc.data();
        const photoIds = albumData.photoIds;

        if (!photoIds || photoIds.length === 0) {
            galleryContainer.innerHTML = '<p>No photos found in this album.</p>';
            return;
        }

        // Fetch all photos by their IDs
        const photoPromises = photoIds.map(async (photoId) => {
            const photoDocRef = doc(db, 'Photos', photoId);
            const photoDoc = await getDoc(photoDocRef);
            return photoDoc.exists() ? { id: photoId, ...photoDoc.data() } : null;
        });

        const photos = (await Promise.all(photoPromises)).filter(photo => photo !== null);

        if (photos.length === 0) {
            galleryContainer.innerHTML = '<p>No valid photos found in this album.</p>';
        } else {
            displayedPhotos = photos; // Store photos globally for search
            renderPhotos(displayedPhotos); // Render all photos initially
        }
    } catch (error) {
        console.error('Error loading photos:', error);
        galleryContainer.innerHTML = '<p>Error loading photos. Please try again later.</p>';
    }
}


/**
 * Function to render photos in the gallery and handle redirection to ViewImage.html.
 * @param {Array} photos - Array of photo objects.
 */
async function renderPhotos(photos) {
    galleryContainer.innerHTML = ''; // Clear the container before rendering

    for (const photo of photos) {
        let userData = { username: 'Unknown', profilePic: '../assets/Default_profile_icon.jpg' }; // Default values
        if (photo.userId) {
            const userDoc = await getDoc(doc(db, 'users', photo.userId));
            if (userDoc.exists()) {
                userData = userDoc.data();
                userData.username = userData.username || 'Unknown';
            }
        }

        const photoCard = `
        <div class="card" data-photo-id="${photo.id}">
            <img src="${photo.imageUrl}" alt="${photo.caption || 'Photo'}">
            <div class="card-footer">
                <div class="user-info">
                    <div class="profile-circle">
                        <img src="${userData.profilePic}" alt="${userData.username}'s profile">
                    </div>
                    <span class="username">@${userData.username}</span>
                </div>
                <div class="photo-caption">
                    <span>${photo.caption || 'No caption available'}</span>
                </div>
            </div>
        </div>
    `;
    
        galleryContainer.innerHTML += photoCard;
    }

    // Add click event listeners to photo cards
    const photoCards = document.querySelectorAll('.card');
    photoCards.forEach(card => {
        card.addEventListener('click', () => {
            const photoId = card.getAttribute('data-photo-id');
            if (!photoId) {
                console.error('Photo ID not found on card.');
                return;
            }

            // Save the photo ID in localStorage
            localStorage.setItem('photoId', photoId);

            // Redirect to ViewImage.html
            window.location.href = 'ViewImage.html';
        });
    });
}





// DOM elements
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const searchButton = document.getElementById('search-button');
const photosContainer = document.getElementById('photos-container');

// Global variable to store displayed photos
let displayedPhotos = [];


// Fetch and display photos based on search and sort criteria
async function fetchPhotos() {
    try {
        // Fetch all photos from Firestore
        const photosRef = collection(db, "Photos");
        const photosSnapshot = await getDocs(photosRef);

        displayedPhotos = photosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Initially render all photos
        renderPhotos(displayedPhotos);
    } catch (error) {
        console.error("Error fetching photos:", error);
        galleryContainer.innerHTML = `<p>Error loading photos. Please try again later.</p>`;
    }
}

// Function to filter photos based on the search query
async function filterPhotos(searchQuery) {
    // If the search query is empty, render all photos
    if (!searchQuery) {
        renderPhotos(displayedPhotos);
        return;
    }

    const filteredPhotos = [];
    const userCache = new Map(); // Initialize the user cache

    for (const photo of displayedPhotos) {
        // Check if hashtags, city, country, or caption match the query
        const matchesCaption = photo.caption && photo.caption.toLowerCase().includes(searchQuery);
        const matchesCity = photo.city && photo.city.toLowerCase().includes(searchQuery);
        const matchesCountry = photo.country && photo.country.toLowerCase().includes(searchQuery);
        const matchesHashtags = photo.hashtags && photo.hashtags.some(tag => tag.toLowerCase().includes(searchQuery));

        // Fetch user document to check username, using cache to avoid redundant fetches
        let matchesUsername = false;
        if (photo.userId) {
            if (userCache.has(photo.userId)) {
                const userData = userCache.get(photo.userId);
                matchesUsername = userData.username && userData.username.toLowerCase().includes(searchQuery);
            } else {
                const userDoc = await getDoc(doc(db, "users", photo.userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userCache.set(photo.userId, userData); // Cache the user data
                    matchesUsername = userData.username && userData.username.toLowerCase().includes(searchQuery);
                }
            }
        }

        // Add the photo to filtered results if any condition matches
        if (matchesCaption || matchesCity || matchesCountry || matchesHashtags || matchesUsername) {
            filteredPhotos.push(photo);
        }
    }

    // Render the filtered photos
    renderPhotos(filteredPhotos);
}




// Trigger search when the search button is clicked
searchButton.addEventListener('click', async () => {
    const searchQuery = searchInput.value.trim().toLowerCase();
    await filterPhotos(searchQuery);
});

// Trigger search when the user presses 'Enter' in the search input
searchInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        const searchQuery = searchInput.value.trim().toLowerCase();
        await filterPhotos(searchQuery);
    }
});






// Helper function to check if username matches the search query
async function doesUsernameMatch(userId, query) {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.name && userData.name.toLowerCase().includes(query);
    }
    return false;
}

// Helper function to sort photos
function sortPhotos(photos, sortOption) {
    if (sortOption === "popularity") {
        return photos.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)); // Most likes first
    } else if (sortOption === "latest") {
        return photos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)); // Newest first
    } else if (sortOption === "oldest") {
        return photos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate)); // Oldest first
    }
    return photos;
}

