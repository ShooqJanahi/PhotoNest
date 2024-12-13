// Import Firebase services
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'; // Firebase Auth import
import { collection, doc, getDoc, getDocs, query, where, deleteDoc, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
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


// Handle dropdown menu actions
function handleOptionsAction(action, photoId) {
    switch (action) {
        case 'delete':
            deletePhoto(photoId);
            break;
        case 'edit':
            editPhoto(photoId);
            break;
       
            
        case 'public':
            turnPhotoPublic(photoId);
            break;
        default:
            console.error('Unknown action:', action);
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












async function loadVaultPhotosForUser() {
    const currentUser = JSON.parse(sessionStorage.getItem('user')); // Get the logged-in user from session storage

    if (!currentUser || !currentUser.uid) {
        console.error("User not logged in or UID not found in session storage.");
        galleryContainer.innerHTML = `<p>Please log in to view your vault photos.</p>`;
        return;
    }

    try {
        const photosRef = collection(db, 'VaultPhoto');
        // Query only photos where `userId` matches the current user's UID
        const userPhotosQuery = query(photosRef, where('userId', '==', currentUser.uid));
        const photosSnapshot = await getDocs(userPhotosQuery);

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
     
     

     const hashtags = photo.hashtags
         ? photo.hashtags.map(tag => `<span class="hashtag">#${tag}</span>`).join(' ')
         : '';

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


    
        galleryContainer.innerHTML += photoCard;
    }

    // Add click event listeners to the options menu icons
    addDropdownEventListeners();
}

//================ Photo Dropdown =================
function addDropdownEventListeners() {
    const optionsIcons = document.querySelectorAll('.options-icon');

    // Add click event listeners to each options icon
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

            // Toggle visibility of the clicked menu
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
        const photosRef = collection(db, "VaultPhoto");
        const photosSnapshot = await getDocs(photosRef);

        displayedPhotos = photosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Initially render all photos
        const sortOption = sortSelect.value; // Get current sort option
        const sortedPhotos = sortPhotos(displayedPhotos, sortOption); // Apply sorting
        renderPhotos(sortedPhotos);
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
        const matchesCaption = photo.caption?.toLowerCase().includes(searchQuery);
        const matchesCity = photo.city?.toLowerCase().includes(searchQuery);
        const matchesCountry = photo.country?.toLowerCase().includes(searchQuery);
        const matchesHashtags = photo.hashtags?.some(tag => tag.toLowerCase().includes(searchQuery));

        // Fetch user document to check username, using cache to avoid redundant fetches
        let matchesUsername = false;
        if (photo.userId) {
            if (userCache.has(photo.userId)) {
                const userData = userCache.get(photo.userId);
                matchesUsername = userData.username?.toLowerCase().includes(searchQuery);
            } else {
                const userDoc = await getDoc(doc(db, "users", photo.userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userCache.set(photo.userId, userData); // Cache the user data
                    matchesUsername = userData.username?.toLowerCase().includes(searchQuery);
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



// Trigger search and sort when the user interacts with input
searchButton.addEventListener('click', async () => {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const sortOption = sortSelect.value;
    const sortedPhotos = sortPhotos(displayedPhotos, sortOption); // Apply sort to all photos
    await filterPhotos(searchQuery, sortedPhotos); // Filter the sorted photos
});

// Apply sorting when sort option changes
sortSelect.addEventListener('change', async () => {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const sortOption = sortSelect.value;
    const sortedPhotos = sortPhotos(displayedPhotos, sortOption); // Sort photos
    await filterPhotos(searchQuery, sortedPhotos); // Filter sorted photos
});

// Trigger search when the user presses 'Enter' in the search input
searchInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        const searchQuery = searchInput.value.trim().toLowerCase();
        await filterPhotos(searchQuery);
    }
});

// Helper function to sort photos
function sortPhotos(photos, sortOption) {
    if (sortOption === "latest") {
        return photos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)); // Newest first
    } else if (sortOption === "oldest") {
        return photos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate)); // Oldest first
    }
    return photos; // Default: no sorting
}




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