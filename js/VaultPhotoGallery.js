// Import Firebase services for authentication and Firestore database
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'; // Firebase Auth import
import { collection, doc, getDoc, getDocs, query, where, deleteDoc, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js'; // Import Firebase configuration
import { logout } from './login.js'; // Import logout functionality
import { createNotificationPopup, openPopup } from './Notification.js';  // Import notification popup functions

//=================================== Notification section =========================
// Attach an event listener to the bell icon
document.querySelector('.fa-bell').addEventListener('click', () => {
    let popup = document.getElementById('notification-popup'); // Notification popup
    let overlay = document.getElementById('popup-overlay'); // Overlay for the popup

    // If the popup doesn't exist, create it dynamically
    if (!popup || !overlay) {
        createNotificationPopup(); // Function to create the popup
    }

    // Open the notification popup
    openPopup();
});

//=================================== END of Notification section =========================

// gallery container to render photos
const galleryContainer = document.querySelector('.gallery');

// DOM elements for profile dropdown functionality
const profileDropdown = document.querySelector('.profile-dropdown');

// Initialize Firebase authentication
const auth = getAuth();

// Listen for changes in user authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Save user data to sessionStorage
        sessionStorage.setItem('user', JSON.stringify({ uid: user.uid, email: user.email }));
        console.log("User data stored in sessionStorage:", user);
    } else {
        console.log("No user is logged in.");
    }
});

// Profile Dropdown: Show dropdown menu when hovering over the profile container
const profileContainer = document.querySelector('.profile-container');

profileContainer.addEventListener('mouseenter', () => {
    profileDropdown.classList.remove('hidden'); // Show the dropdown menu
});

profileContainer.addEventListener('mouseleave', () => {
    profileDropdown.classList.add('hidden'); // Hide the dropdown menu
});

// Handle the logout action when the logout button is clicked
document.getElementById('logout-button').addEventListener('click', async (event) => {
    event.preventDefault();
    await logout(); // Call the logout function
});

// Fetch the user's profile image from Firestore and display it
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
            const userData = userDoc.data(); // Get user data
            console.log("User data fetched successfully:", userData); // Debugging step

            // If profilePic exists, set it to the profile image element
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
    await fetchPhotos();
    const galleryContainer = document.querySelector('.gallery');

    // Fetch and display the profile image
    await fetchUserProfileImage();
    await loadVaultPhotosForUser(); // Load vault photos for the current user

    galleryContainer.addEventListener('click', (event) => {
        // Check if the click is on the ellipsis icon
        if (event.target.classList.contains('options-icon')) {
            const optionsMenu = event.target.nextElementSibling;

            // Close all other menus
            document.querySelectorAll('.options-menu').forEach(menu => {
                if (menu !== optionsMenu) {
                    menu.classList.add('hidden');
                }
            });

            // Toggle visibility of the clicked menu
            optionsMenu.classList.toggle('hidden');
        }

        // Check if the click is on an option button
        if (event.target.classList.contains('options-btn')) {
            const action = event.target.dataset.action; // Get the action from the button
            const photoId = event.target.closest('.card').dataset.photoId; // Get the photo ID
            handleOptionsAction(action, photoId); // Call the handler
        }
    });

    // Close menus when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.classList.contains('options-icon') && !event.target.closest('.options-menu')) {
            document.querySelectorAll('.options-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    });

});

// Function to handle gallery options (delete, edit, make public)
function handleOptionsAction(action, photoId) {
    switch (action) {
        case 'delete':
            deletePhoto(photoId); // Call the delete function
            break;
        case 'edit':
            editPhoto(photoId); // Call the edit function
            break;
        case 'public':
            turnPhotoPublic(photoId); // Call the make public function
            break;
        default:
            console.error('Unknown action:', action); // Log unknown actions
    }
}


// Function to edit a photo
async function editPhoto(photoId) {
    if (!photoId) {
        console.error("Photo ID is required to edit the photo.");
        return;
    }
    try {
        // Fetch the current photo data
        const photoDoc = await getDoc(doc(db, "VaultPhoto", photoId));
        if (!photoDoc.exists()) {
            console.error("Photo not found.");
            alert("Photo not found.");
            return;
        }
        const photoData = photoDoc.data();

        // Create a popup for editing
        const popup = document.createElement("div");
        popup.classList.add("edit-popup");

        popup.innerHTML = `
            <div class="popup-overlay"></div>
            <div class="popup-content">
                <h2>Edit Photo</h2>
                <label for="edit-caption">Caption:</label>
                <input type="text" id="edit-caption" value="${photoData.caption || ''}" placeholder="Enter new caption">
                
                <label for="edit-hashtags">Hashtags (comma-separated):</label>
                <input type="text" id="edit-hashtags" value="${photoData.hashtags ? photoData.hashtags.join(', ') : ''}" placeholder="Enter hashtags">
                
                <div class="popup-buttons">
                    <button id="save-edit">Save</button>
                    <button id="cancel-edit">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        // Add event listeners for Save and Cancel buttons
        document.getElementById("save-edit").addEventListener("click", async () => {
            const updatedCaption = document.getElementById("edit-caption").value.trim();
            const updatedHashtags = document.getElementById("edit-hashtags").value
                .trim()
                .split(",")
                .map(tag => tag.trim())
                .filter(tag => tag !== "");
            try {
                // Update the photo data in Firestore
                await updateDoc(doc(db, "VaultPhoto", photoId), {
                    caption: updatedCaption,
                    hashtags: updatedHashtags
                });

                alert("Photo updated successfully!");

                // Refresh the gallery to reflect the changes
                await loadVaultPhotosForUser();

                // Close the popup
                document.body.removeChild(popup);
            } catch (error) {
                console.error("Error updating photo:", error);
                alert("Failed to update the photo. Please try again.");
            }
        });

        document.getElementById("cancel-edit").addEventListener("click", () => {
            // Close the popup
            document.body.removeChild(popup);
        });
    } catch (error) {
        console.error("Error editing photo:", error);
        alert("An error occurred while editing the photo. Please try again.");
    }
}


// =================================== Load Photos for User =====================================
// Load and render the vault photos for the logged-in user
async function loadVaultPhotosForUser() {
    const currentUser = JSON.parse(sessionStorage.getItem('user')); // Get the logged-in user from session storage

    if (!currentUser || !currentUser.uid) {
        console.error("User not logged in or UID not found in session storage.");
        galleryContainer.innerHTML = `<p>Please log in to view your vault photos.</p>`;
        return;
    }

    try {
        // Query Firestore for photos uploaded by the current user
        const photosRef = collection(db, 'VaultPhoto');
        // Query only photos where `userId` matches the current user's UID
        const userPhotosQuery = query(photosRef, where('userId', '==', currentUser.uid));
        const photosSnapshot = await getDocs(userPhotosQuery);

        // Map photo documents into an array of photo data
        const photos = photosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        if (photos.length === 0) {
            galleryContainer.innerHTML = `<p>No photos found in your vault.</p>`;
        } else {
            renderPhotos(photos); // Render photos belonging to the logged-in user
        }
    } catch (error) {
        console.error("Error loading vault photos:", error);
        galleryContainer.innerHTML = `<p>Error loading vault photos. Please try again later.</p>`;
    }
}

// =================================== END of Load Photos for User =====================================

// =================================== Render Photos =====================================


/**
 * // Render photos dynamically into the gallery
 * @param {Array} photos - Array of photo objects.
 */
async function renderPhotos(photos) {
    return new Promise(async (resolve) => {


    galleryContainer.innerHTML = ''; // Clear existing content in the gallery container

    // Loop through each photo and render it
    for (const photo of photos) {
        let userData = { username: 'Unknown', profilePic: '../assets/Default_profile_icon.jpg' }; // Default user data
        // Fetch user data if available
        if (photo.userId) {
            const userDoc = await getDoc(doc(db, 'users', photo.userId));
            if (userDoc.exists()) {
                userData = userDoc.data();
                userData.username = userData.username || 'Unknown';
            }
        }
        // Format the timestamp into a relative time format
        const timestamp = photo.uploadDate
            ? new Date(photo.uploadDate).toLocaleString('en-US', {
                timeZone: 'UTC',
                hour: 'numeric',
                minute: 'numeric',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            })
            : 'Unknown time';
        // Generate hashtags if available
        const hashtags = photo.hashtags
            ? photo.hashtags.map(tag => `<span class="hashtag">#${tag}</span>`).join(' ')
            : '';

        // Photo card HTML
        const photoCard = `
         <div class="card" data-photo-id="${photo.id}">
             <!-- User Info -->
             <div class="user-info">
                 <div class="profile-circle">
                     <img src="${userData.profilePic}" alt="${userData.username}'s profile">
                 </div>
                 <div class="user-details">
                     <span class="username">${userData.username}</span>
                     <div class="location-time">
                         <span>${photo.city || 'Unknown city'}, ${photo.country || 'Unknown country'}</span>
                         <span>${timestamp}</span>
                     </div>
                 </div>
             </div>
 
             <!-- Photo -->
             <img src="${photo.imageUrl}" alt="${photo.caption || 'Photo'}">
 
             <!-- Caption and Hashtags -->
             <div class="photo-details">
                 <div class="photo-caption">
                     <span>${photo.caption || 'No caption available'}</span>
                 </div>
                 <div class="photo-hashtags">
                     ${hashtags}
                 </div>
             </div>
 
             <!-- Options icon and menu -->
             <i class="fas fa-ellipsis-v options-icon"></i>
             <div class="options-menu hidden">
                 <button class="options-btn" data-action="delete">Delete Photo</button>
                 <button class="options-btn" data-action="edit">Edit Photo</button>
                 <button class="options-btn" data-action="public">Make Photo Public</button>
             </div>
         </div>
         `;
        galleryContainer.innerHTML += photoCard; // Append the photo card to the container
    }
    // Add click event listeners to the options menu icons
    addDropdownEventListeners();
     // Resolve the promise after rendering is complete
     resolve();
    });
}

// =================================== END of Render Photos =====================================


// =================================== Add Dropdown Event Listeners =====================================
// Handle toggling the options menu
function addDropdownEventListeners() {
    const optionsIcons = document.querySelectorAll('.options-icon');

    optionsIcons.forEach((icon) => {
        icon.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling to the document
            const optionsMenu = icon.nextElementSibling;

            // Close all other menus
            document.querySelectorAll('.options-menu').forEach((menu) => {
                if (menu !== optionsMenu) {
                    menu.classList.remove('show');
                }
            });

            // Toggle visibility of the current options menu
            optionsMenu.classList.toggle('show');
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.options-menu').forEach((menu) => {
            menu.classList.remove('show');
        });
    });
}

//================ END of Photo Dropdown =================

const searchButton = document.getElementById('search-button'); // Target the search button
const searchInput = document.getElementById('search-input');   // Target the search input
const sortSelect = document.getElementById('sort-select');     // Target the sorting dropdown

// Global variable to store displayed photos
let displayedPhotos = [];

// Fetch and display photos based on search and sort criteria
async function fetchPhotos() {
    try {
        // Fetch all photos from Firestore
        const photosRef = collection(db, "VaultPhoto");
        const photosSnapshot = await getDocs(photosRef);

        displayedPhotos = photosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Render the initial photos with sorting applied
        renderFilteredAndSortedPhotos();
    } catch (error) {
        console.error("Error fetching photos:", error);
        galleryContainer.innerHTML = `<p>Error loading photos. Please try again later.</p>`;
    }
}

// Combined Function: Filter and Sort Photos
function renderFilteredAndSortedPhotos() {
    const searchQuery = searchInput.value.trim().toLowerCase(); // Get search input
    const sortOption = sortSelect.value; // Get selected sort option

    // Apply search filtering
    let filteredPhotos = displayedPhotos.filter(photo => {
        const caption = photo.caption?.toLowerCase() || '';
        const hashtags = photo.hashtags?.map(tag => tag.toLowerCase()).join(' ') || '';
        const city = photo.city?.toLowerCase() || '';
        const country = photo.country?.toLowerCase() || '';
        const uploadDate = photo.uploadDate
            ? new Date(photo.uploadDate).toLocaleString('en-US').toLowerCase() // Converts date to searchable string
            : '';

        return (
            caption.includes(searchQuery) || // Search caption
            hashtags.includes(searchQuery) || // Search hashtags
            city.includes(searchQuery) || // Search city
            country.includes(searchQuery) || // Search country
            uploadDate.includes(searchQuery) // Search date and time
        );
    });

    // Apply sorting
    if (sortOption === "latest") {
        filteredPhotos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } else if (sortOption === "oldest") {
        filteredPhotos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
    }

    // Render the filtered and sorted photos
    renderPhotos(filteredPhotos);
}

// Event Listeners for Search and Sort
searchButton.addEventListener('click', renderFilteredAndSortedPhotos);
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') renderFilteredAndSortedPhotos();
});
sortSelect.addEventListener('change', renderFilteredAndSortedPhotos);





//====================== Delete Photo option =============
async function deletePhoto(photoId) {
    if (!photoId) {
        console.error("Photo ID is required to delete the photo.");
        return;
    }

    try {
        // Confirm before deleting
        const confirmDelete = confirm("Are you sure you want to delete this photo?");
        if (!confirmDelete) return;

        // Delete the photo from the VaultPhoto collection
        await deleteDoc(doc(db, "VaultPhoto", photoId));
        console.log(`Photo with ID: ${photoId} deleted from VaultPhoto collection.`);

        // Find and delete all references to the photo in other collections
        const collectionsToCheck = ["Likes", "Comments", "Hashtag", "Photos", "Reports"]; // List collections to search
        for (const collectionName of collectionsToCheck) {
            const collectionRef = collection(db, collectionName);
            const querySnapshot = await getDocs(query(collectionRef, where("photoId", "==", photoId)));

            for (const docSnapshot of querySnapshot.docs) {
                await deleteDoc(doc(db, collectionName, docSnapshot.id));
                console.log(`Reference to photo ID: ${photoId} deleted from ${collectionName} collection.`);
            }
        }

        // Notify the user
        alert("Photo has been deleted successfully.");

        // Refresh the gallery to reflect the deletion
        await loadVaultPhotosForUser();
    } catch (error) {
        console.error("Error deleting photo or its references:", error);
        alert("An error occurred while deleting the photo. Please try again.");
    }
}

//====================== END of Delete Photo option =============


//====================== Make Photo Public option ==============


// Function to make a photo public
async function turnPhotoPublic(photoId) {
    if (!photoId) {
        console.error("Photo ID is required to make the photo public.");
        return;
    }

    try {
        // Confirm the action with the user
        const confirmPublic = confirm("Are you sure you want to make this photo public?");
        if (!confirmPublic) return;

        // Fetch the photo data from the VaultPhoto collection
        const photoDoc = await getDoc(doc(db, "VaultPhoto", photoId));
        if (!photoDoc.exists()) {
            console.error("Photo not found in VaultPhoto collection.");
            alert("Photo not found.");
            return;
        }

        const photoData = photoDoc.data();

        // Move the photo to the Photos collection using setDoc
        await setDoc(doc(db, "Photos", photoId), {
            ...photoData, // Copy all the data from the photo
            status: "Public", // Set status to public
            publicDate: new Date().toISOString() // Optionally, add a timestamp for when it was made public
        });
        console.log(`Photo with ID: ${photoId} moved to Photos collection.`);

        // Delete the photo from the VaultPhoto collection
        await deleteDoc(doc(db, "VaultPhoto", photoId));
        console.log(`Photo with ID: ${photoId} deleted from VaultPhoto collection.`);

        // Notify the user
        alert("Photo has been successfully made public.");

        // Redirect the user to VaultPhotoGallery.html
        window.location.href = "VaultPhotoGallery.html";
    } catch (error) {
        console.error("Error making photo public:", error);
        alert("An error occurred while making the photo public. Please try again.");
    }
}



//====================== END of Make Photo Public option ==============

//====================== splash screen =======================================

// Show splash screen
function showSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.style.display = 'flex';
        splashScreen.style.opacity = '1';
    }
}

// Hide splash screen
function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.style.transition = 'opacity 0.5s ease';
        splashScreen.style.opacity = '0'; // Fade-out effect
        setTimeout(() => {
            splashScreen.style.display = 'none'; // Completely hide after fade-out
        }, 500); // Match the fade-out duration
    }
}

// Centralized initialization function
async function initializePage() {
    showSplashScreen(); // Show splash screen initially

    try {
        // Ensure DOM is fully loaded
        await new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve(); // DOM already loaded
            } else {
                document.addEventListener('DOMContentLoaded', resolve); // Wait for DOMContentLoaded event
            }
        });

        // Perform all asynchronous tasks in parallel
        await Promise.all([
            fetchUserProfileImage(),    // Fetch user profile image
            loadVaultPhotosForUser(),  // Load user's photos from Firestore
        ]);

        // Ensure photos are fully rendered before hiding the splash screen
        await renderPhotos(displayedPhotos); 
        
        console.log("Page fully loaded and content rendered.");
    } catch (error) {
        console.error("Error during page initialization:", error);

        // Show an error message if required
        const galleryContainer = document.querySelector('.gallery');
        if (galleryContainer) {
            galleryContainer.innerHTML = `<p>Error loading content. Please try again later.</p>`;
        }
    } finally {
        hideSplashScreen(); // Always hide splash screen after tasks finish
    }
}

// Call initializePage to start the process
initializePage();
















