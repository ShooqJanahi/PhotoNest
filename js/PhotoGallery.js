// Import Firebase services for authentication and Firestore
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'; // Firebase Auth import
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js'; // Firebase configuration import
import { logout } from './login.js';  // Logout function import
import { createNotificationPopup, openPopup } from './Notification.js'; // Notification popup functions

// click event listener to the bell icon to show notifications
document.querySelector('.fa-bell').addEventListener('click', () => {
    let popup = document.getElementById('notification-popup'); // Get notification popup element
    let overlay = document.getElementById('popup-overlay'); // Get overlay element

    // Create the popup if it doesn't exist
    if (!popup || !overlay) {
        createNotificationPopup();
    }

    // Open the popup
    openPopup();
});

// Select the gallery container element for displaying photos
const galleryContainer = document.querySelector('.gallery');

// Select the profile dropdown for user-related actions
const profileDropdown = document.querySelector('.profile-dropdown');

// Initialize Firebase Authentication
const auth = getAuth();

// Listen for authentication state changes (user login)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Save logged-in user data to sessionStorage
        sessionStorage.setItem('user', JSON.stringify({ uid: user.uid, email: user.email }));
        console.log("User data stored in sessionStorage:", user);
    } else {
        console.log("No user is logged in.");
    }
});

// Show profile dropdown on hover
const profileContainer = document.querySelector('.profile-container');

profileContainer.addEventListener('mouseenter', () => {
    profileDropdown.classList.remove('hidden'); // Show dropdown menu
});

profileContainer.addEventListener('mouseleave', () => {
    profileDropdown.classList.add('hidden'); // Hide dropdown menu
});

// Handle logout button click
document.getElementById('logout-button').addEventListener('click', async (event) => {
    event.preventDefault(); // Prevent default form submission
    await logout(); // Call the logout function
});

// Fetch and display the user's profile image
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
            const userData = userDoc.data(); // Extract user data
            console.log("User data fetched successfully:", userData); // Debugging step

            // Check if a profile picture is set for the user
            if (userData.profilePic) {
                const profileImageElement = document.getElementById('profile-image'); // Get profile image DOM element
                if (profileImageElement) {
                    profileImageElement.src = userData.profilePic; // Update the profile image source
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

// Handle document-ready actions
document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.querySelector('.gallery'); // Select gallery container

    // Fetch and display the user's profile image
    await fetchUserProfileImage();
    await determinePhotoSource();  // Decide which photos to load (default or album)

    // Handle click events for showing/hiding options menus
    gallery.addEventListener('click', (event) => {
        // Check if the click is on an ellipsis icon
        if (event.target.classList.contains('options-icon')) {
            const optionsMenu = event.target.nextElementSibling; // Get the corresponding options menu
            if (optionsMenu) {
                optionsMenu.classList.toggle('hidden');  // Toggle menu visibility
            }
        }

        // Close any open menu when clicking outside
        if (!event.target.classList.contains('options-icon')) {
            document.querySelectorAll('.options-menu').forEach(menu => {
                menu.classList.add('hidden');  // Hide all open menus
            });
        }
    });
});
// Determine the source of photos to display (album or default collection)
async function determinePhotoSource() {
    const albumId = localStorage.getItem('currentAlbumId'); // Check if an album is selected
    console.log("Retrieved albumId from localStorage:", albumId);

if (!albumId) {
    console.error("Album ID not found in localStorage.");
    alert("No album selected or album ID missing.");
    return;
}
    if (albumId) {
        console.log('Album selected, loading album photos...');
        await loadPhotosForAlbum(albumId); // Load album photos
    } else {
        console.log('Default mode, loading public photos...');
        await loadPhotosFromCollection('Photos'); // Load public photos
    }
}

// Load photos from a specified Firestore collection
async function loadPhotosFromCollection(collectionName) {
    try {
        const photosRef = collection(db, collectionName); // Get reference to collection
        const photosSnapshot = await getDocs(photosRef); // Fetch all documents

        // Map the documents into an array of photo objects
        const photos = photosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        renderPhotos(photos); // Render the photos in the gallery
    } catch (error) {
        console.error(`Error loading photos from ${collectionName}:`, error);
        galleryContainer.innerHTML = `<p>Error loading photos. Please try again later.</p>`; // Show error message
    }
}



// Fetch the selected album ID from localStorage
const albumId = localStorage.getItem('currentAlbumId');
if (!albumId) {
    console.error('No album selected.');
    galleryContainer.innerHTML = '<p>No album selected. Please return to the Albums page and try again.</p>'; // Show warning message
} else {
    loadPhotosForAlbum(albumId); // Load photos for the selected album
}

/**
 * Function to load photos for a selected album.
 * @param {string} albumId - The ID of the selected album.
 */
// Global variable to store displayed photos
let displayedPhotos = []; // Declare early to prevent ReferenceError

async function loadPhotosForAlbum(albumId) {
    try {
        const albumDocRef = doc(db, 'Albums', albumId); // Get the album document reference
        const albumDoc = await getDoc(albumDocRef); // Fetch the album document

        if (!albumDoc.exists()) {
            console.error('Album does not exist.');
            galleryContainer.innerHTML = '<p>Album does not exist. Please return to the Albums page.</p>';
            return;
        }

        const albumData = albumDoc.data(); // Extract album data
        const photoIds = albumData.photoIds; // Get photo IDs in the album

        if (!photoIds || photoIds.length === 0) {
            galleryContainer.innerHTML = '<p>No photos found in this album.</p>';
            return;
        }

        // Fetch all photos by their IDs
        const photoPromises = photoIds.map(async (photoId) => {
            const photoDocRef = doc(db, 'Photos', photoId); // Get photo document reference
            const photoDoc = await getDoc(photoDocRef); // Fetch the photo document
            return photoDoc.exists() ? { id: photoId, ...photoDoc.data() } : null;
        });

        const photos = (await Promise.all(photoPromises)).filter(photo => photo !== null); // Filter out invalid photos

        if (photos.length === 0) {
            galleryContainer.innerHTML = '<p>No valid photos found in this album.</p>';
        } else {
            displayedPhotos = photos; // Store photos globally for search
            renderPhotos(displayedPhotos); // Render all photos initially
        }
    } catch (error) {
        console.error('Error loading photos:', error);
        galleryContainer.innerHTML = '<p>Error loading photos. Please try again later.</p>'; // Show error message
    }
}


/**
 * Function to render photos in the gallery and handle redirection to ViewImage.html.
 * @param {Array} photos - Array of photo objects.
 */
async function renderPhotos(photos) {
    galleryContainer.innerHTML = ''; // Clear previous gallery content
    
    for (const photo of photos) {
        let userData = { username: 'Unknown', profilePic: '../assets/Default_profile_icon.jpg' }; // Default user data
        if (photo.userId) {
            const userDoc = await getDoc(doc(db, 'users', photo.userId)); // Fetch user data
            if (userDoc.exists()) {
                userData = userDoc.data(); // Extract user data
                userData.username = userData.username || 'Unknown'; // Fallback to "Unknown" if no username
            }
        }
        // Create a card for each photo
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
        galleryContainer.innerHTML += photoCard; // Append the card to the gallery
    }

    // Adding click event listeners to photo cards
    const photoCards = document.querySelectorAll('.card');
    photoCards.forEach(card => {
        card.addEventListener('click', () => {
            const photoId = card.getAttribute('data-photo-id'); // Get the photo ID
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
const sortOption = sortSelect.value; // Get selected sort option
const sortedPhotos = sortPhotos(displayedPhotos || [], sortOption);
renderPhotos(sortedPhotos);





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


// =================================== splash screen ============================
// Show splash screen
function showSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.style.display = 'flex'; // Make it visible
        splashScreen.style.opacity = '1';   // Ensure it’s fully opaque
    }
}

// Hide splash screen
function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.style.transition = 'opacity 0.5s ease'; // Smooth fade-out
        splashScreen.style.opacity = '0'; // Start fade-out
        setTimeout(() => {
            splashScreen.style.display = 'none'; // Remove from view
        }, 500); // Match the fade-out duration
    }
}

// Centralized function to fetch and render all content
async function fetchAndRenderPageData() {
    const promises = [];

    // Fetch album photos
    const albumId = localStorage.getItem("currentAlbumId");
    if (albumId) {
        promises.push(loadPhotosForAlbum(albumId));
    }

    // Fetch user profile image
    const currentUser = JSON.parse(sessionStorage.getItem('user'));
    if (currentUser && currentUser.uid) {
        promises.push(fetchUserProfileImage());
    }

    // Ensure all fetch/render tasks are complete before proceeding
    await Promise.all(promises);
}

// Main function to initialize the page with the splash screen
async function initializePageWithSplashScreen() {
    showSplashScreen(); // Display splash screen

    try {
        // Wait for DOMContentLoaded
        await new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve(); // If already loaded, resolve immediately
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });

        // Fetch and render content
        await fetchAndRenderPageData();
        console.log("Page content fully loaded and rendered.");
    } catch (error) {
        console.error("Error initializing page:", error);
    } finally {
        // Ensure the splash screen is hidden after loading is complete or an error occurs
        hideSplashScreen();
    }
}

// Start the page initialization process
initializePageWithSplashScreen();
