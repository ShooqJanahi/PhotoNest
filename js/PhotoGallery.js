// Import Firebase services
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js'; // Firebase configuration import

const galleryContainer = document.querySelector('.gallery');

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
            renderPhotos(photos);
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
function renderPhotos(photos) {
    galleryContainer.innerHTML = ''; // Clear the container before rendering

    photos.forEach((photo, index) => {
        const photoCard = `
            <div class="card" data-photo-id="${photo.id || index}">
                <img src="${photo.imageUrl}" alt="${photo.caption || 'Photo'}">
                <div class="card-footer">
                    <span>${photo.caption || 'No caption available'}</span>
                </div>
            </div>
        `;

        galleryContainer.innerHTML += photoCard;
    });

    // Add click event listeners to photo cards
    const photoCards = document.querySelectorAll('.card');
    photoCards.forEach(card => {
        card.addEventListener('click', () => {
            const photoId = card.getAttribute('data-photo-id');
            if (!photoId) {
                console.error("Photo ID not found on card.");
                return;
            }

            // Save the photo ID in localStorage
            localStorage.setItem('photoId', photoId);

            // Redirect to ViewImage.html
            window.location.href = 'ViewImage.html';
        });
    });
}
