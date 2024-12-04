// Importing necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, deleteDoc, collection, query, where, getDocs, addDoc, increment, updateDoc, orderBy, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { auth, db } from './firebaseConfig.js';

/**
 * Load and display comments for a given photo
 * @param {string} photoId - The ID of the photo to fetch comments for
 */
async function loadComments(photoId) {
    if (!photoId) {
        console.error("No photo ID provided for loading comments.");
        return;
    }

    try {
        // Query the Comments collection for comments with the matching photoId
        const commentsQuery = query(
            collection(db, "Comments"),
            where("photoId", "==", photoId),
            orderBy("timestamp", "desc")
        );

        const commentsContainer = document.getElementById('comments-container');
        if (!commentsContainer) {
            console.error("Comments container not found in the DOM.");
            return;
        }
        commentsContainer.innerHTML = ''; // Clear existing comments

        // Fetch comments
        const commentsSnapshot = await getDocs(commentsQuery);

        if (commentsSnapshot.empty) {
            commentsContainer.innerHTML = '<p>No comments yet.</p>';
            return;
        }

        // Loop through each comment
        commentsSnapshot.forEach(async (commentDoc) => {
            const commentData = commentDoc.data();

            // Fetch the user profile picture from Firestore
            const userDoc = await getDoc(doc(db, "users", commentData.userId));
            const userData = userDoc.exists() ? userDoc.data() : { profilePic: "../assets/Default_profile_icon.jpg", username: "Anonymous" };

            // Create a comment card
            const commentCard = document.createElement('div');
            commentCard.className = 'comment-card';

            commentCard.innerHTML = `
            <div class="comment-header">
                <img src="${userData.profilePic || '../assets/Default_profile_icon.jpg'}" alt="Profile Picture" class="comment-profile-pic">
                <div class="comment-details">
                    <strong>${userData.username || 'Anonymous'}</strong>
                    <span class="comment-time">${formatTimestamp(commentData.timestamp)}</span>
                </div>
                <div class="options-icon">
                    <i class="fas fa-ellipsis-v"></i>
                    <div class="dropdown-menu hidden">
                        <button class="dropdown-delete">Delete</button>
                        <button class="dropdown-report">Report</button>
                    </div>
                </div>
            </div>
            <p class="comment-text">${commentData.commentText}</p>
        `;

            commentsContainer.appendChild(commentCard);

            // Attach event listeners to the dropdown and options
            const optionsIcon = commentCard.querySelector('.options-icon i');
            const dropdownMenu = commentCard.querySelector('.dropdown-menu');
            const deleteButton = commentCard.querySelector('.dropdown-delete');
            const reportButton = commentCard.querySelector('.dropdown-report');

            // Toggle dropdown menu visibility
            optionsIcon.addEventListener('click', () => {
                dropdownMenu.classList.toggle('hidden');
            });

            // Handle Delete Comment
            deleteButton.addEventListener('click', async () => {
                const confirmDelete = confirm("Are you sure you want to delete this comment?");
                if (confirmDelete) {
                    await deleteComment(commentDoc.id, photoId);
                }
            });

            // Handle Report Comment
            reportButton.addEventListener('click', () => {
                showCommentReportPopup(commentDoc.id);
            });
        });
    } catch (error) {
        console.error("Error loading comments:", error);
    }
}

/**
 * Delete a comment from Firestore and update the comment count.
 * @param {string} commentId - The ID of the comment to delete.
 * @param {string} photoId - The ID of the photo associated with the comment.
 */
async function deleteComment(commentId, photoId) {
    try {
        // Fetch the comment from Firestore
        const commentDocRef = doc(db, "Comments", commentId);
        const commentSnapshot = await getDoc(commentDocRef);

        if (!commentSnapshot.exists()) {
            console.error("Comment not found.");
            alert("Comment does not exist.");
            return;
        }

        // Validate if the current user is the author of the comment
        const commentData = commentSnapshot.data();
        const loggedInUserId = sessionStorage.getItem("userId"); // Fetch logged-in user's ID

        if (commentData.userId !== loggedInUserId) {
            alert("You can only delete your own comments.");
            return;
        }

        // Delete the comment document
        await deleteDoc(doc(db, "Comments", commentId));

        // Log the activity
        await logActivity(sessionStorage.getItem("userId"), "deleted_comment", commentId, { photoId });


        // Decrement the comments count in the associated photo
        const photoDocRef = doc(db, "Photos", photoId);
        await updateDoc(photoDocRef, { commentsCount: increment(-1) });





        console.log("Comment deleted successfully.");
        window.location.reload(); // Reload the page to reflect changes
    } catch (error) {
        console.error("Error deleting comment:", error);
        alert("Failed to delete the comment. Please try again.");
    }
}

/**
 * Show the report popup for a specific comment.
 * @param {string} commentId - The ID of the comment to report.
 */
function showCommentReportPopup(commentId) {
    const popup = document.createElement('div');
    popup.className = 'popup'; // Apply consistent style

    popup.innerHTML = `
    <h3>Report Comment</h3>
    <textarea id="report-details" placeholder="Describe the issue..." rows="5"></textarea>
    <button id="report-submit">Submit</button>
    <button id="report-cancel">Cancel</button>
`;

    document.body.appendChild(popup);

    document.getElementById('report-submit').addEventListener('click', async () => {
        const reportDetails = document.getElementById('report-details').value.trim();
        if (!reportDetails) {
            alert("Please provide details for your report.");
            return;
        }

        await submitCommentReport(commentId, reportDetails);
        document.body.removeChild(popup); // Close the popup
    });

    document.getElementById('report-cancel').addEventListener('click', () => {
        document.body.removeChild(popup); // Close the popup
    });
}

/**
 * Submit a new comment to the database
 * @param {string} commentText - The comment text
 * @param {string} userId - The ID of the user submitting the comment
 * @param {string} photoId - The ID of the photo the comment is for
 */
async function submitComment(commentText, userId, photoId) {
    try {
        const userData = await getUserData(userId);
        const newComment = {
            photoId,
            userId,
            username: userData?.username || "Anonymous",
            commentText,
            timestamp: new Date().toISOString()
        };



        // Add the comment to Firestore
        await addDoc(collection(db, "Comments"), newComment);

        // Log the activity
        await logActivity(userId, "comment", photoId, { commentText });

        console.log("Comment added successfully");

        // Increment the comment count for the photo
        const photoDocRef = doc(db, "Photos", photoId);
        await updateDoc(photoDocRef, { commentsCount: increment(1) });

        // Reload comments dynamically
        await loadComments(photoId);

        // Reload photo details (if necessary)
        const photoData = await getPhotoData(photoId);
        if (photoData) {
            await updatePhotoDetails(photoData);
        }
    } catch (error) {
        console.error("Failed to submit comment:", error);
        alert("Failed to add comment. Please try again.");
    }
}


/**
 * Format a timestamp into a relative time string (e.g., "2 hours ago")
 * @param {string} timestamp - The ISO timestamp to format
 * @returns {string} - The formatted relative time
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
    return "Just now";
}

/**
 * Handle comment submission for the current photo
 */
function handleCommentSubmission() {
    const commentInput = document.getElementById('comment-input');
    const submitButton = document.getElementById('submit-comment');
    const userId = sessionStorage.getItem("userId");
    const photoId = localStorage.getItem('photoId');

    if (!commentInput || !submitButton || !userId || !photoId) {
        console.error("Missing elements or IDs for handling comments.");
        return;
    }

    // Ensure only one event listener is assigned to the button
    submitButton.onclick = null; // Clear any existing handler

    submitButton.onclick = () => {
        const commentText = commentInput.value.trim();
        if (!commentText) {
            alert("Comment cannot be empty.");
            return;
        }

        submitComment(commentText, userId, photoId);

    };
}




/**
 * Fetch user data from the database
 * @param {string} userId - The ID of the user to fetch data for
 * @returns {object|null} - The user data or null if not found
 */
async function getUserData(userId) {
    if (!userId || typeof userId !== "string") {
        console.error("Invalid userId:", userId);
        return null;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            console.error("User not found for userId:", userId);
            return null;
        }
        return userDoc.data();
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
}

/**
 * Fetch photo data from the database
 * @param {string} photoId - The ID of the photo to fetch data for
 * @returns {object|null} - The photo data or null if not found
 */
async function getPhotoData(photoId) {
    if (!photoId) {
        console.error("Photo ID is required to fetch photo data.");
        return null;
    }

    try {
        const photoDoc = await getDoc(doc(db, "Photos", photoId));
        if (!photoDoc.exists()) {
            console.error("Photo not found for photoId:", photoId);
            return null;
        }
        return photoDoc.data();
    } catch (error) {
        console.error("Error fetching photo data:", error);
        return null;
    }
}

/**
 * Set up the UI when the page loads
 */
async function setupUIAndListeners() {
    const photoId = localStorage.getItem("photoId");

    if (!photoId) {
        console.error("Photo ID not found in localStorage.");
        return;
    }

    try {
        const photoData = await getPhotoData(photoId);
        if (!photoData) {
            console.error("Photo data not found.");
            return;
        }

        // Ensure photo details are displayed
        await updatePhotoDetails(photoData);

        // Load hashtags and comments dynamically
        loadHashtags(photoData.hashtags);
        await loadComments(photoId);

        // Handle comment submission setup
        handleCommentSubmission();
    } catch (error) {
        console.error("Error setting up UI:", error);
    }
}



/**
 * Update photo details on the page
 * @param {object} photoData - The photo data to display

 */
async function updatePhotoDetails(photoData, userId) {
    if (!photoData || !photoData.userId) {
        console.error("Invalid data provided to updatePhotoDetails.");
        return;
    }

    // Update the photo details in the UI
    document.getElementById('photo-display').src = photoData.imageUrl || '../assets/default_image.png';
    document.getElementById('photo-caption').textContent = photoData.caption || "No caption provided.";
    document.getElementById('photo-location-text').textContent = `${photoData.city || "Unknown"}, ${photoData.country || ""}`;
    document.getElementById('photo-date-text').textContent = new Date(photoData.uploadDate).toLocaleDateString();
    document.getElementById('likes-count').textContent = `${photoData.likesCount || 0} Likes`;

    try {
        // Fetch and update owner's details using userId from photoData
        const ownerDoc = await getDoc(doc(db, "users", photoData.userId));
        if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data();
            document.getElementById('photo-username').textContent = ownerData.username || "Anonymous";
            document.getElementById('photo-user-profile-pic').src = ownerData.profilePic || '../assets/Default_profile_icon.jpg';
        } else {
            console.error("Photo owner not found in Firestore.");
            document.getElementById('photo-username').textContent = "Anonymous";
            document.getElementById('photo-user-profile-pic').src = '../assets/Default_profile_icon.jpg';
        }
    } catch (error) {
        console.error("Error fetching photo owner details:", error);
        document.getElementById('photo-username').textContent = "Anonymous";
        document.getElementById('photo-user-profile-pic').src = '../assets/Default_profile_icon.jpg';
    }
}



/**
 * Load hashtags for the photo
 * @param {array} hashtags - Array of hashtags for the photo
 */
function loadHashtags(hashtags) {
    const hashtagsElement = document.getElementById('photo-hashtags');
    if (!hashtagsElement) {
        console.error("Hashtags element not found in the DOM.");
        return;
    }

    if (Array.isArray(hashtags) && hashtags.length > 0) {
        // Convert hashtags array to a string with # prefix
        hashtagsElement.textContent = hashtags.map(tag => `#${tag}`).join(' ');
    } else {
        hashtagsElement.textContent = 'No hashtags available.';
    }
}


/**
 * Deletes a photo and its associated references from Firestore.
 * @param {string} photoId - The ID of the photo to delete.
 */
async function deletePhoto(photoId) {
    if (!photoId) {
        console.error("Photo ID is required to delete a photo.");
        return;
    }

    const userConfirmed = confirm("Are you sure you want to delete this photo?");
    if (!userConfirmed) {
        console.log("User cancelled photo deletion.");
        return;
    }

    try {
        // References to Firestore collections
        const photoDocRef = doc(db, "Photos", photoId);

        // Step 1: Fetch photo data to update related collections (hashtags, location)
        const photoDocSnap = await getDoc(photoDocRef);
        if (!photoDocSnap.exists()) {
            console.error("Photo not found in Firestore.");
            return;
        }
        const photoData = photoDocSnap.data();
        const { hashtags, locationId } = photoData;

        // Step 2: Delete photo document
        await deleteDoc(photoDocRef);
        console.log("Photo deleted successfully from Photos collection.");

        // Step 3: Delete comments associated with the photo
        const commentsQuery = query(
            collection(db, "Comments"),
            where("photoId", "==", photoId)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsSnapshot.forEach(async (commentDoc) => {
            await deleteDoc(doc(db, "Comments", commentDoc.id));
        });
        console.log("Comments deleted successfully.");

        // Step 4: Delete likes associated with the photo
        const likesQuery = query(
            collection(db, "Likes"),
            where("photoId", "==", photoId)
        );
        const likesSnapshot = await getDocs(likesQuery);
        likesSnapshot.forEach(async (likeDoc) => {
            await deleteDoc(doc(db, "Likes", likeDoc.id));
        });
        console.log("Likes deleted successfully.");

        // Step 5: Reduce photoCount for hashtags
        if (hashtags && Array.isArray(hashtags)) {
            for (const hashtag of hashtags) {
                const hashtagQuery = query(
                    collection(db, "Hashtag"),
                    where("hashtag", "==", hashtag)
                );
                const hashtagSnapshot = await getDocs(hashtagQuery);
                hashtagSnapshot.forEach(async (hashtagDoc) => {
                    const hashtagDocRef = doc(db, "Hashtag", hashtagDoc.id);
                    await updateDoc(hashtagDocRef, {
                        photoCount: increment(-1),
                    });
                });
            }
            console.log("Photo count reduced for hashtags.");
        }

        // Step 6: Reduce photoCount for location
        if (locationId) {
            const locationDocRef = doc(db, "Location", locationId);
            const locationDocSnap = await getDoc(locationDocRef);
            if (locationDocSnap.exists()) {
                await updateDoc(locationDocRef, {
                    photoCount: increment(-1),
                });
                console.log("Photo count reduced for location.");
            }
        }

        console.log("Photo and all references deleted successfully.");

        // Redirect to user dashboard after successful deletion
        alert("Photo deleted successfully!");
        window.location.href = "../html/UserDashboard.html"; // Replace with your actual dashboard path


    } catch (error) {
        console.error("Error deleting photo and references:", error);
        alert("Failed to delete the photo. Please try again.");
    }
}


/**
 * Initializes and sets up the like button functionality for a given photo.
 * @param {string} photoId - The ID of the photo to handle likes for.
 */
async function setupLikeButton(photoId) {
    const userId = auth.currentUser.uid;  // Ensure the user is authenticated
    const likeIcon = document.getElementById('like-icon');
    const likesCount = document.getElementById('likes-count');

    // Check if the user has already liked the photo
    const userLikeRef = doc(db, "Likes", `${userId}_${photoId}`);
    const userLikeSnap = await getDoc(userLikeRef);

    if (userLikeSnap.exists()) {
        likeIcon.classList.add('liked');
    } else {
        likeIcon.classList.remove('liked');
    }

    // Add event listener to toggle like status on click
    likeIcon.addEventListener('click', () => { // Using 'addEventListener' to ensure proper handling
        const isLiked = likeIcon.classList.contains('liked');
        toggleLikeStatus(isLiked, userLikeRef, photoId, likeIcon, likesCount);
    });
}

/**
 * Toggles the like status of a photo and updates UI accordingly.
 * @param {boolean} isLiked - Whether the photo is currently liked by the user.
 * @param {DocumentReference} userLikeRef - Reference to the user's like document.
 * @param {string} photoId - Photo ID.
 * @param {Element} likeIcon - DOM element of the like icon.
 * @param {Element} likesCount - DOM element where likes count is displayed.
 */
async function toggleLikeStatus(isLiked, userLikeRef, photoId, likeIcon, likesCount) {
    if (isLiked) {
        // Unlike the photo
        console.log("Unlike the photo");
        await deleteDoc(userLikeRef);
        likeIcon.classList.remove('liked');
        await updateDoc(doc(db, "Photos", photoId), { likesCount: increment(-1) });


    } else {
        // Like the photo
        console.log("Like the photo");
        await setDoc(userLikeRef, {
            userId: auth.currentUser.uid,
            photoId: photoId,
            timestamp: new Date()
        });
        likeIcon.classList.add('liked');
        await updateDoc(doc(db, "Photos", photoId), { likesCount: increment(1) });
    }

    if (!isLiked) {
        // Like the photo
        await setDoc(userLikeRef, { userId: auth.currentUser.uid, photoId, timestamp: new Date() });
        await logActivity(auth.currentUser.uid, "like", photoId);
    } else {
        // Unlike the photo
        await deleteDoc(userLikeRef);
        await logActivity(auth.currentUser.uid, "removed_like", photoId);
    }

    // Update the likes count display
    const photoDoc = await getDoc(doc(db, "Photos", photoId));
    likesCount.textContent = (photoDoc.data().likesCount || 0) + ' Likes';
}



// Function to adjust dropdown options based on whether the user is the photo uploader
async function adjustDropdownOptions(photoId) {
    const photoDocRef = doc(db, "Photos", photoId);
    const photoDocSnap = await getDoc(photoDocRef);
    if (!photoDocSnap.exists()) {
        console.error("Photo not found.");
        return;
    }

    const photoOwnerId = photoDocSnap.data().userId;
    const currentUserId = auth.currentUser.uid;
    const dropdownMenu = document.getElementById('image-options-dropdown');


    if (photoOwnerId === currentUserId) {
        // User is the uploader, show full options
        dropdownMenu.innerHTML = `
            <button class="dropdown-delete">Delete</button>
            <button class="dropdown-edit">Edit Photo</button>
            <button class="dropdown-vault">Move to Vault</button>
            <button class="dropdown-album">Move to Album</button>
            <button class="dropdown-report">Report Photo</button>
        `;
    } else {
        // User is not the uploader, show limited options
        dropdownMenu.innerHTML = `
            <button class="dropdown-album">Move to Album</button>
            <button class="dropdown-report">Report Photo</button>
        `;
    }

    const reportPhotoButton = dropdownMenu.querySelector('.dropdown-report');
    if (reportPhotoButton) {
        reportPhotoButton.dataset.photoId = photoId; // Set photoId in dataset
        reportPhotoButton.removeEventListener('click', handleReportPhoto); // Remove existing listener
        reportPhotoButton.addEventListener('click', handleReportPhoto);    // Attach new listener
    } else {
        console.error("Report Photo button not found in the dropdown.");
    }


    // Reattach event listeners for other dropdown interactions
    setupDropdownListeners(photoId);
}

/**
 * Event handler for the "Report Photo" button.
 */
function handleReportPhoto(event) {
    let photoId = event.target.dataset.photoId; // Check if photoId is passed
    if (!photoId) {
        console.warn("Photo ID missing in dataset. Falling back to localStorage.");
        photoId = localStorage.getItem('photoId'); // Fallback to localStorage
    }

    console.log("Report Photo clicked, photoId:", photoId); // Debug log

    if (!photoId) {
        console.error("Photo ID is missing.");
        return;
    }

    showPhotoReportPopup(photoId);
}




// Setup event listeners for dropdown interactions
function setupDropdownListeners(photoId) {
    const dropdownMenu = document.getElementById('image-options-dropdown');
    dropdownMenu.addEventListener('click', event => {
        const target = event.target;

        // Handler based on class of the button clicked
        switch (target.className) {
            case 'dropdown-delete':
                deletePhoto(photoId);  // Function to delete photo
                break;
            case 'dropdown-edit':
                showEditPhotoPopup(photoId);  // Function to show edit photo popup
                break;
            case 'dropdown-vault':
                moveToVault(photoId);  // Function to move photo to vault
                break;
            case 'dropdown-album':
                showMoveToAlbumPopup(photoId);  // Function to move photo to album
                break;
            case 'dropdown-report':
                showPhotoReportPopup(photoId);  // Function to report photo
                break;
            default:
                console.log("No action found for this option.");
                break;
        }
    });
}



//edit photo

/**
 * Show a popup to edit the caption and hashtags of a photo.
 * @param {string} photoId - The ID of the photo to edit.
 */
function showEditPhotoPopup(photoId) {
    const popup = document.createElement('div');
    popup.className = 'popup'; // Apply consistent style

    getPhotoData(photoId).then((photoData) => {
        if (!photoData) {
            alert("Photo data not found.");
            return;
        }

        popup.innerHTML = `
            <h3>Edit Photo Details</h3>
            <label for="edit-caption">Caption:</label>
            <textarea id="edit-caption" rows="3">${photoData.caption || ''}</textarea>
            <label for="edit-hashtags">Hashtags (comma-separated):</label>
            <input id="edit-hashtags" type="text" value="${photoData.hashtags ? photoData.hashtags.join(', ') : ''}" />
            <button id="save-edit">Save</button>
            <button id="cancel-edit">Cancel</button>
        `;

        document.body.appendChild(popup);

        document.getElementById('save-edit').addEventListener('click', async () => {
            const newCaption = document.getElementById('edit-caption').value.trim();
            const newHashtags = document.getElementById('edit-hashtags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);

            try {
                await updateDoc(doc(db, "Photos", photoId), {
                    caption: newCaption,
                    hashtags: newHashtags,
                });
                alert("Photo updated successfully!");
                window.location.reload();
            } catch (error) {
                alert("Failed to update photo.");
            } finally {
                document.body.removeChild(popup);
            }
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
    });
}



/**
 * Move a photo from the Photos collection to the VaultPhoto collection.
 * @param {string} photoId - The ID of the photo to move.
 */
async function moveToVault(photoId) {
    const userConfirmed = confirm("Are you sure you want to move this photo to the Vault?");
    if (!userConfirmed) {
        console.log("User canceled moving the photo to the Vault.");
        return;
    }

    try {
        // References to the Photo and VaultPhoto collections
        const photoDocRef = doc(db, "Photos", photoId);
        const photoDocSnap = await getDoc(photoDocRef);

        if (!photoDocSnap.exists()) {
            console.error("Photo not found in the Photos collection.");
            return;
        }

        // Fetch the photo data
        const photoData = photoDocSnap.data();

        // Add the photo data to the VaultPhoto collection
        const vaultPhotoDocRef = doc(db, "VaultPhoto", photoId);
        await setDoc(vaultPhotoDocRef, photoData);

        // Remove the photo from the Photos collection
        await deleteDoc(photoDocRef);

        console.log("Photo successfully moved to the Vault.");
        alert("Photo has been moved to the Vault successfully!");

        // Redirect to the user dashboard
        window.location.href = "../html/UserDashboard.html";

    } catch (error) {
        console.error("Error moving the photo to the Vault:", error);
        alert("Failed to move the photo to the Vault. Please try again.");
    }
}

/**
 * Show the report popup for a specific photo.
 * @param {string} photoId - The ID of the photo to report.
 */
function showPhotoReportPopup(photoId) {
    console.log("Displaying report popup for photoId:", photoId); // Debug log

    // Check if a popup already exists and remove it
    const existingPopup = document.querySelector('.popup');
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }

    // Create the popup element
    const popup = document.createElement('div');
    popup.className = 'popup';

    // Set the inner HTML of the popup
    popup.innerHTML = `
        <h3>Report Photo</h3>
        <textarea id="photo-report-details" placeholder="Describe the issue..." rows="5"></textarea>
        <div class="popup-actions">
            <button id="report-submit" class="popup-btn popup-submit">Submit</button>
            <button id="report-cancel" class="popup-btn popup-cancel">Cancel</button>
        </div>
    `;

    // Append the popup to the body
    document.body.appendChild(popup);

    // Get references to the Submit and Cancel buttons
    let submitButton = popup.querySelector('#report-submit');
    let cancelButton = popup.querySelector('#report-cancel');

    // Remove existing listeners and reattach
    submitButton.replaceWith(submitButton.cloneNode(true));
    cancelButton.replaceWith(cancelButton.cloneNode(true));
    submitButton = popup.querySelector('#report-submit');
    cancelButton = popup.querySelector('#report-cancel');

    // Add event listener for the Submit button
    submitButton.addEventListener('click', async () => {
        const reportDetails = document.getElementById('photo-report-details').value.trim();
        if (!reportDetails) {
            alert("Please provide details for your report.");
            return;
        }

        // Submit the report
        await submitPhotoReport(photoId, reportDetails);

        // Remove the popup after submission
        document.body.removeChild(popup);
    });

    // Add event listener for the Cancel button
    cancelButton.addEventListener('click', () => {
        // Remove the popup on cancel
        document.body.removeChild(popup);
    });
}


/**
 * Submit a report for a photo.
 * @param {string} photoId - The ID of the photo being reported.
 * @param {string} details - The details of the report.
 */
async function submitPhotoReport(photoId, details) {
    try {
        const userId = sessionStorage.getItem("userId"); // Get the user who is reporting

        if (!userId || !photoId) {
            alert("User or photo information is missing.");
            return;
        }

        // Prepare the report data
        const reportData = {
            photoId: photoId, // ID of the photo being reported
            reportedBy: userId, // ID of the user who made the report
            reason: details, // Details or reason provided for reporting
            category: "photo", // Category of the report (e.g., "photo")
            status: "Pending Review", // Default status for new reports
            timestamp: new Date().toISOString(), // Date and time of the report
        };

        // Add the report to Firestore's "Reports" collection
        const reportRef = await addDoc(collection(db, "Reports"), reportData);

        console.log(`Photo report added to Firestore with ID: ${reportRef.id}`);
        alert("Thank you for your report. We'll review it shortly.");
    } catch (error) {
        console.error("Error submitting the photo report:", error);
        alert("Failed to submit the report. Please try again.");
    }
}



/**
 * Show the popup for moving a photo to an album.
 * @param {string} photoId - The ID of the photo to be moved.
 */
function showMoveToAlbumPopup(photoId) {
    const popup = document.createElement('div');
    popup.className = 'popup'; // Apply consistent style

    popup.innerHTML = `
        <h3>Move to Album</h3>
        <input type="text" id="album-search" placeholder="Search albums..." />
        <div id="album-list" class="album-list"></div>
        <button id="create-album-btn">Create New Album</button>
        <button id="close-album-popup">Close</button>
    `;

    document.body.appendChild(popup);

    document.getElementById('close-album-popup').addEventListener('click', () => {
        document.body.removeChild(popup);
    });

    document.getElementById('create-album-btn').addEventListener('click', () => {
        createNewAlbum(photoId);
    });

    loadUserAlbums(photoId);
}




/**
 * Load albums created by the logged-in user and display them in the popup.
 * If no albums exist, prompt the user to create one.
 * @param {string} photoId - The ID of the photo to reference in an album.
 */
async function loadUserAlbums(photoId) {
    console.log("Loading albums for photoId:", photoId);

    const userId = sessionStorage.getItem("userId");
    console.log("UserId:", userId);
    if (!userId) {
        console.error("User ID not found in session storage.");
        return;
    }

    try {
        const albumListContainer = document.getElementById('album-list');
        if (!albumListContainer) {
            console.error("Album list container not found.");
            return;
        }

        albumListContainer.innerHTML = '<p>Loading albums...</p>';
        const albumsQuery = query(
            collection(db, "Albums"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        const albumsSnapshot = await getDocs(albumsQuery);

        if (albumsSnapshot.empty) {
            albumListContainer.innerHTML = '<p>No albums found.</p>';
            return;
        }

        albumListContainer.innerHTML = ''; // Clear loading text
        albumsSnapshot.forEach((doc) => {
            const albumData = doc.data();
            const albumOption = document.createElement('div');
            albumOption.className = 'album-option';

            // Check if the photo is already in the album
            const photoExistsInAlbum = albumData.photoIds?.includes(photoId);

            albumOption.innerHTML = `
                <div>
                    <strong>${albumData.name}</strong>
                    <button class="album-action-btn" data-id="${doc.id}" data-action="${photoExistsInAlbum ? 'remove' : 'add'}">
                        ${photoExistsInAlbum ? 'Remove Photo' : 'Add Photo'}
                    </button>
                </div>
            `;

            albumListContainer.appendChild(albumOption);
        });


        // Add event listeners to buttons
        albumListContainer.querySelectorAll('.album-action-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const albumId = button.dataset.id;
                const action = button.dataset.action;

                if (action === 'add') {
                    await addPhotoToAlbum(photoId, albumId);
                } else if (action === 'remove') {
                    await removePhotoFromAlbum(photoId, albumId);
                }

                // Refresh the album list after adding/removing
                await loadUserAlbums(photoId);
            });
        });
    } catch (error) {
        console.error("Error loading albums:", error);
    }
}



/**
 * Remove a photo from an album by updating the album's data.
 * @param {string} photoId - The ID of the photo to remove.
 * @param {string} albumId - The ID of the album to remove the photo from.
 */
async function removePhotoFromAlbum(photoId, albumId) {
    try {
        const albumDocRef = doc(db, "Albums", albumId);
        const albumDoc = await getDoc(albumDocRef);

        if (!albumDoc.exists()) {
            console.error("Album not found.");
            alert("Album not found.");
            return;
        }

        // Update the album's photo references
        const albumData = albumDoc.data();
        const updatedPhotos = (albumData.photoIds || []).filter(id => id !== photoId);
        await updateDoc(albumDocRef, { photoIds: updatedPhotos });

        // Log the activity
        await logActivity(sessionStorage.getItem("userId"), "removed_from_album", albumId, { photoId });

        alert("Photo removed from the album successfully!");
    } catch (error) {
        console.error("Error removing photo from album:", error);
        alert("Failed to remove the photo from the album. Please try again.");
    }
}



/**
 * Add a photo to an album by referencing it in the album's data.
 * @param {string} photoId - The ID of the photo to reference in the album.
 * @param {string} albumId - The ID of the album to add the photo to.
 */
async function addPhotoToAlbum(photoId, albumId) {
    try {
        const albumDocRef = doc(db, "Albums", albumId);
        const albumDoc = await getDoc(albumDocRef);

        if (!albumDoc.exists()) {
            console.error("Album not found.");
            alert("Album not found.");
            return;
        }

        // Update the album's photo references
        const albumData = albumDoc.data();
        const updatedPhotos = [...(albumData.photoIds || []), photoId];
        await updateDoc(albumDocRef, { photoIds: updatedPhotos });

        // Log the activity
        await logActivity(sessionStorage.getItem("userId"), "add_to_album", albumId, { photoId });

        alert("Photo added to the album successfully!");
        document.body.removeChild(document.querySelector('.move-to-album-popup')); // Close the popup
    } catch (error) {
        console.error("Error adding photo to album:", error);
        alert("Failed to add the photo to the album. Please try again.");
    }
}

/**
 * Filter albums in the popup based on the search input.
 * @param {string} searchText - The text to filter albums by.
 */
function filterAlbums(searchText) {
    const albumOptions = document.querySelectorAll('.album-option');
    albumOptions.forEach((option) => {
        const albumName = option.querySelector('.album-info strong').textContent.toLowerCase();
        if (albumName.includes(searchText)) {
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
        }
    });
}

/**
 * Create a new album and refresh the popup to display it.
 * @param {string} photoId - The ID of the photo to add to the new album.
 */
async function createNewAlbum(photoId) {
    const albumName = prompt("Enter a name for the new album:");
    if (!albumName) {
        alert("Album name cannot be empty.");
        return;
    }

    const userId = sessionStorage.getItem("userId"); // Get logged-in user ID
    if (!userId) {
        console.error("User ID not found in session storage.");
        return;
    }

    try {
        // Create a new album document
        const newAlbum = {
            name: albumName,
            description: "",
            userId,
            photoIds: photoId ? [photoId] : [], // Optionally include the photo
            createdAt: new Date().toISOString(),
        };

        await addDoc(collection(db, "Albums"), newAlbum);
        alert(`Album "${albumName}" created successfully!`);

        // Refresh the album list in the popup
        loadUserAlbums(photoId);
    } catch (error) {
        console.error("Error creating new album:", error);
        alert("Failed to create a new album. Please try again.");
    }
}


/**
 * Show the share popup with an autocomplete feature for recipient usernames.
 * @param {string} photoId - The ID of the photo to share.
 */
function showSharePopup(photoId) {
    const popup = document.createElement('div');
    popup.className = 'popup';

    // Create the share popup content
    popup.innerHTML = `
        <h3>Share Photo</h3>
        <input type="text" id="share-username" placeholder="Enter recipient's username" autocomplete="off" />
        <div id="username-suggestions" class="suggestions"></div>
        <textarea id="share-message" placeholder="Add a message (optional)" rows="4"></textarea>
        <div class="popup-actions">
            <button id="share-submit">Share</button>
            <button id="share-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(popup);

    const usernameInput = document.getElementById('share-username');
    const suggestionsContainer = document.getElementById('username-suggestions');

    // Fetch and display username suggestions as the user types
    usernameInput.addEventListener('input', async (e) => {
        const queryText = e.target.value.trim();
        if (queryText.length < 2) {
            suggestionsContainer.innerHTML = ''; // Clear suggestions if input is too short
            return;
        }

        const suggestions = await fetchUserSuggestions(queryText);
        displayUserSuggestions(suggestions, suggestionsContainer, usernameInput);
    });

    // Attach event listeners
    document.getElementById('share-submit').addEventListener('click', async () => {
        const recipientUsername = usernameInput.value.trim();
        const messageText = document.getElementById('share-message').value.trim();

        if (!recipientUsername) {
            alert('Please select a recipient username.');
            return;
        }

        // Handle the photo sharing
        await sharePhoto(photoId, recipientUsername, messageText);

        // Remove the popup after submission
        document.body.removeChild(popup);
    });

    document.getElementById('share-cancel').addEventListener('click', () => {
        document.body.removeChild(popup); // Remove the popup on cancel
    });
}

/**
 * Fetch matching usernames from Firestore based on user input.
 * @param {string} queryText - The text to search for in usernames.
 * @returns {Array<string>} - A list of matching usernames.
 */
async function fetchUserSuggestions(queryText) {
    try {
        const usersQuery = query(
            collection(db, "users"),
            where("status", "==", "active")
        );
        const usersSnapshot = await getDocs(usersQuery);

        const matchingUsernames = [];
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.username.toLowerCase().includes(queryText.toLowerCase())) {
                matchingUsernames.push(userData.username);
            }
        });

        return matchingUsernames;
    } catch (error) {
        console.error("Error fetching user suggestions:", error);
        return [];
    }
}

/**
 * Display username suggestions below the input field.
 * @param {Array<string>} suggestions - List of matching usernames.
 * @param {HTMLElement} container - The container to display suggestions in.
 * @param {HTMLInputElement} inputField - The input field for username entry.
 */
function displayUserSuggestions(suggestions, container, inputField) {
    container.innerHTML = ''; // Clear previous suggestions

    if (suggestions.length === 0) {
        container.innerHTML = '<p class="no-suggestions">No matching users found.</p>';
        return;
    }

    suggestions.forEach((username) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = username;

        // Allow the user to select a suggestion
        suggestionItem.addEventListener('click', () => {
            inputField.value = username; // Set the input value to the selected username
            container.innerHTML = ''; // Clear suggestions
        });

        container.appendChild(suggestionItem);
    });
}


/**
 * Share a photo with another user by saving the message in Firestore.
 * @param {string} photoId - The ID of the photo to share.
 * @param {string} recipientUsername - The username of the recipient.
 * @param {string} messageText - An optional message to accompany the shared photo.
 */
async function sharePhoto(photoId, recipientUsername, messageText) {
    try {
        const senderId = sessionStorage.getItem('userId'); // Get the logged-in user's ID

        if (!senderId || !photoId) {
            alert("User or photo information is missing.");
            return;
        }

        // Fetch the recipient's user ID based on their username
        const usersQuery = query(
            collection(db, "users"),
            where("username", "==", recipientUsername)
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (usersSnapshot.empty) {
            alert('Recipient username not found.');
            return;
        }

        const recipientDoc = usersSnapshot.docs[0];
        const recipientId = recipientDoc.id;

        // Prepare the message data
        const messageData = {
            senderId,
            receiverId: recipientId,
            messageText: messageText || 'Check out this photo!',
            photoId,
            status: 'Unread',
            timestamp: new Date().toISOString(),
        };

        // Save the message to Firestore
        await addDoc(collection(db, "Messages"), messageData);

        // Log the activity
        await logActivity(senderId, "share", photoId, { recipientUsername });

        alert(`Photo shared successfully with ${recipientUsername}!`);
    } catch (error) {
        console.error("Error sharing photo:", error);
        alert("Failed to share the photo. Please try again.");
    }
}




// Call loadComments when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const photoId = localStorage.getItem('photoId');

    // Load the logged-in user's profile picture
    await loadUserProfilePic();


    if (!photoId) {
        console.error("Photo ID not found in localStorage.");
        return;
    }

    // Attach the "Share" button click event
    const shareButton = document.getElementById('share-button');
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            showSharePopup(photoId);
        });
    }

    // Load the UI elements
    await setupUIAndListeners(photoId);

    // Setup like button
    await setupLikeButton(photoId);

    // Setup dropdown options
    adjustDropdownOptions(photoId);

    // Select the specific options icon for the image card
    const imageOptionsIcon = document.querySelector('#image-options-icon'); // Ensure the ID or class is correct
    const dropdownMenu = document.querySelector('#image-options-dropdown'); // Dropdown menu for the image card

    if (imageOptionsIcon && dropdownMenu) {
        imageOptionsIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            dropdownMenu.classList.toggle('hidden'); // Toggle the 'hidden' class
        });

        // Close dropdown when clicking anywhere else on the page
        document.addEventListener('click', () => {
            dropdownMenu.classList.add('hidden');
        });

        // Prevent dropdown menu from closing when clicking inside it
        dropdownMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

});



/**
 * Load the logged-in user's profile picture and update the top navigation bar.
 */
async function loadUserProfilePic() {
    const userId = sessionStorage.getItem("userId"); // Get the logged-in user's ID from session storage
    if (!userId) {
        console.error("User ID not found in session storage.");
        return;
    }

    try {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            console.error("User not found in Firestore for userId:", userId);
            return;
        }

        const userData = userDoc.data();

        // Update the profile picture in the navigation bar dynamically
        const profilePhotoContainer = document.querySelector('.profile-photo img#topnav-profile-image');
        if (profilePhotoContainer) {
            profilePhotoContainer.src = userData.profilePic || '../assets/Default_profile_icon.jpg';
        } else {
            console.error("Profile photo container not found in the DOM.");
        }
    } catch (error) {
        console.error("Error loading user profile picture:", error);
    }
}



/**
 * Log a user's activity in the ActivityLogs collection.
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} category - The category of the activity (e.g., "comment", "like", "share").
 * @param {string} targetId - The ID of the target object (e.g., photoId, commentId).
 * @param {object} [additionalData={}] - Additional data to include in the log (optional).
 */
async function logActivity(userId, category, targetId, additionalData = {}) {
    if (!userId || !category || !targetId) {
        console.error("Missing required fields for logging activity.");
        return;
    }

    try {
        const logData = {
            userId,
            category,
            targetId,
            timestamp: new Date().toISOString(),
            ...additionalData, // Include any additional data
        };

        // Add the log to the ActivityLogs collection
        await addDoc(collection(db, "ActivityLogs"), logData);

        console.log(`Activity logged: ${category} by user ${userId}`);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}


