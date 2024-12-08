// Import Firebase services
import { collection, query, where, getDocs,addDoc, doc, getDoc, deleteDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js'; // Ensure this points to your Firebase config
import { createNotificationPopup, openPopup } from './Notification.js';
import { logout } from './login.js';




const albumsContainer = document.getElementById('albums-container');
const searchInput = document.getElementById('album-search');
const searchButton = document.getElementById('search-button');

let userAlbums = []; // Store fetched albums globally


document.getElementById('logout-button').addEventListener('click', async (event) => {
    event.preventDefault();
    await logout();
});

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



document.addEventListener('DOMContentLoaded', async () => {

    // Initialize the Create Album modal functionality
    setupCreateAlbumModal();

   

    // Fetch and display the profile image
    await fetchUserProfileImage();

    const user = JSON.parse(sessionStorage.getItem('user')); // Get the logged-in user
    if (!user || !user.uid) {
        console.error("User not logged in.");
        return;
    }
    

    try {
        // Fetch the user's albums
        const albumsQuery = query(
            collection(db, 'Albums'),
            where('userId', '==', user.uid)
        );
        const albumsSnapshot = await getDocs(albumsQuery);

        if (albumsSnapshot.empty) {
            albumsContainer.innerHTML = '<p>No albums found.</p>';
            return;
        }

        // Store albums in a global variable
        userAlbums = await Promise.all(
            albumsSnapshot.docs.map(async albumDoc => { // Renamed `doc` to `albumDoc`
                const albumData = albumDoc.data();
                const albumId = albumDoc.id;

                // Fetch the first photo for the album thumbnail (if available)
                let thumbnailUrl = 'https://placehold.co/250x150'; // Default thumbnail
                if (albumData.photoIds && albumData.photoIds.length > 0) {
                    const firstPhotoId = albumData.photoIds[0];
                    const photoDoc = await getDoc(doc(db, 'Photos', firstPhotoId));
                    if (photoDoc.exists()) {
                        thumbnailUrl = photoDoc.data().imageUrl || thumbnailUrl;
                    }
                }

                return {
                    id: albumId,
                    ...albumData,
                    thumbnailUrl,
                };
            })
        );

        // Render the albums
        renderAlbums(userAlbums);


        const editButtons = document.querySelectorAll('.options-btn[data-action="edit"]');
        const modal = document.getElementById('editAlbumModal');
        const closeBtn = document.querySelector('.close');
        const saveBtn = document.getElementById('saveEdit');
        const titleInput = document.getElementById('editAlbumTitle');
        let currentAlbumId = '';
    
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
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
                    .then(() => {
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


// Function to render albums
function renderAlbums(albums) {
    const albumsContainer = document.getElementById('albums-container');

    albumsContainer.innerHTML = ''; // Clear previous content
    if (albums.length === 0) {
        albumsContainer.innerHTML = '<p>No albums found.</p>';
        return;
    }

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

        albumsContainer.innerHTML += albumCard;
    });

    setupAlbumCardListeners();
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
            description: "", // Default empty description
            photoIds: [], // Empty array for photos initially
            createdAt: new Date().toISOString(),
            userId: user.uid, // Link album to the current user
        };

        // Add the new album to Firestore
        await addDoc(collection(db, "Albums"), newAlbum);

        alert("Album created successfully!");
        location.reload(); // Refresh to show the new album
    } catch (error) {
        console.error("Error creating album:", error);
        alert("Failed to create album. Please try again.");
    }
}

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

    // Handle form submission
    createAlbumForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const albumTitle = document.getElementById('albumTitle').value.trim();
        if (albumTitle) {
            createAlbum(albumTitle);
            createAlbumModal.style.display = 'none';
        } else {
            alert("Please enter a valid album title.");
        }
    });
}




// Function to setup event listeners for each album card
function setupAlbumCardListeners() {
    albumsContainer.querySelectorAll('.album-card').forEach(card => {
        // Setup click listener for the options icon to toggle the menu
        const optionsIcon = card.querySelector('.options-icon');
        const optionsMenu = card.querySelector('.options-menu');

        // Toggle options menu visibility
        optionsIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevents triggering click on the entire card
            optionsMenu.classList.toggle('hidden'); // Toggle visibility of the options menu
        });

        // Setup listeners for each button in the options menu
        optionsMenu.querySelectorAll('.options-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent click from reaching the card
                handleOptionClick(event, card); // Handle the click
            });
        });

        // Listener for clicking outside the options menu to close it
        document.addEventListener('click', (event) => {
            if (!card.contains(event.target)) {
                optionsMenu.classList.add('hidden');
            }
        }, { once: true });

        // Setup redirection for non-option areas of the card
        const clickableAreas = card.querySelectorAll('.clickable-area');
        clickableAreas.forEach(area => {
            area.addEventListener('click', () => {
                const albumId = card.getAttribute('data-album-id');
                localStorage.setItem('currentAlbumId', albumId);
                window.location.href = 'PhotoGallery.html'; // Redirection
            });
        });
    });

    // Close the options menu if clicked outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.options-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    });
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
        case 'view':
            viewAlbumDetails(albumId);
            break;
        default:
            console.log('Unknown action:', action);
    }
}



// Functions for options menu actions
function editAlbum(albumId) {
    console.log(`Edit album: ${albumId}`);
    // Implement the logic for editing the album
}

// Function to delete an album after confirmation
function deleteAlbum(albumId) {
    const confirmation = confirm("Are you sure you want to delete this album?");
    if (confirmation) {
        // Deleting the album document from Firestore
        const albumRef = doc(db, 'Albums', albumId);
        deleteDoc(albumRef)
            .then(() => {
                console.log(`Album ${albumId} deleted successfully.`);
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


function viewAlbumDetails(albumId) {
    console.log(`View details of album: ${albumId}`);
    localStorage.setItem('currentAlbumId', albumId);
    window.location.href = 'AlbumDetails.html'; // Redirect to album details page
}


document.getElementById('search-button').addEventListener('click', searchAlbums);

function searchAlbums() {
    const searchQuery = document.getElementById('album-search').value.toLowerCase().trim();
    const filteredAlbums = userAlbums.filter(album => album.name.toLowerCase().includes(searchQuery));
    renderAlbums(filteredAlbums);
}
