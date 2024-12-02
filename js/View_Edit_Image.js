// Importing necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc,deleteDoc, collection, query, where, getDocs, addDoc, increment, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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
            showReportPopup(commentDoc.id);
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
        // Delete the comment document
        await deleteDoc(doc(db, "Comments", commentId));

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
function showReportPopup(commentId) {
    const popup = document.createElement('div');
    popup.className = 'report-popup';

    popup.innerHTML = `
        <div class="report-popup-content">
            <h3>Report Comment</h3>
            <textarea id="report-details" placeholder="Describe the issue..." rows="5"></textarea>
            <button id="report-submit">Submit</button>
            <button id="report-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(popup);

    const submitButton = popup.querySelector('#report-submit');
    const cancelButton = popup.querySelector('#report-cancel');

    submitButton.addEventListener('click', async () => {
        const reportDetails = document.getElementById('report-details').value.trim();
        if (!reportDetails) {
            alert("Please provide details for your report.");
            return;
        }

        await submitReport(commentId, reportDetails);
        document.body.removeChild(popup); // Close the popup
    });

    cancelButton.addEventListener('click', () => {
        document.body.removeChild(popup); // Close the popup
    });
}

/**
 * Submit a report for a comment.
 * @param {string} commentId - The ID of the comment being reported.
 * @param {string} details - The details of the report.
 */
async function submitReport(commentId, details) {
    try {
        const userId = sessionStorage.getItem("userId"); // Get the user who is reporting
        const photoId = localStorage.getItem("photoId"); // Get the photo ID

        if (!userId || !photoId) {
            alert("User or photo information is missing.");
            return;
        }

        // Prepare the report data
        const reportData = {
            photoId, // ID of the photo being reported
            commentId, // ID of the comment being reported
            reportedBy: userId, // The user making the report
            reason: details, // Description of the issue
            status: "Pending Review", // Default status for new reports
            timestamp: new Date().toISOString(), // Time the report was created
        };

        // Add the report to the Firestore 'Reports' collection
        await addDoc(collection(db, "Reports"), reportData);
        console.log("Report submitted successfully.");
        alert("Thank you for your report. We'll review it shortly.");
    } catch (error) {
        console.error("Error submitting report:", error);
        alert("Failed to submit the report. Please try again.");
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

        // Add the comment to the database
        const docRef = await addDoc(collection(db, "Comments"), newComment);
        console.log("Comment added:", docRef.id);

        // Increment the comment count for the photo
        const photoDocRef = doc(db, "Photos", photoId);
        await updateDoc(photoDocRef, { commentsCount: increment(1) });

        console.log("Comments count updated.");

        // Reload the page after successful comment submission
        window.location.reload(); // Reload the page to refresh comments
    } catch (error) {
        console.error("Failed to add comment:", error);
        alert("Failed to add comment. Please try again.");
    }
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
    const userId = sessionStorage.getItem("userId");
    const photoId = localStorage.getItem("photoId");

    if (!userId || typeof userId !== "string" || !photoId) {
        console.error("Invalid or missing userId or photoId.");
        return;
    }

    const photoData = await getPhotoData(photoId);
    const userData = await getUserData(userId);

    if (!photoData || !userData) {
        console.error("Failed to load necessary data.");
        return;
    }

    updatePhotoDetails(photoData, userId);
    // Load hashtags
    loadHashtags(photoData.hashtags);

    // Load comments or other data
   
    handleCommentSubmission();
}

// Initialize the UI on page load
document.addEventListener('DOMContentLoaded', setupUIAndListeners);

/**
 * Update photo details on the page
 * @param {object} photoData - The photo data to display
 * @param {string} userId - The user ID associated with the photo
 */
async function updatePhotoDetails(photoData, userId) {
    if (!photoData || !userId) {
        console.error("Invalid data provided to updatePhotoDetails.");
        return;
    }

    // Update the photo details in the UI
    document.getElementById('photo-display').src = photoData.imageUrl || '../assets/default_image.png';
    document.getElementById('photo-caption').textContent = photoData.caption || "No caption provided.";
    document.getElementById('photo-location-text').textContent = `${photoData.city || "Unknown"}, ${photoData.country || ""}`;
    document.getElementById('photo-date-text').textContent = new Date(photoData.uploadDate).toLocaleDateString();
    document.getElementById('likes-count').textContent = `${photoData.likesCount || 0} Likes`;

    // Fetch and update user details
    const userData = await getUserData(userId);
    if (userData) {
        document.getElementById('photo-username').textContent = userData.username;
        document.getElementById('photo-user-profile-pic').src = userData.profilePic || '../assets/Default_profile_icon.jpg';
    }
}


/**
 * Load and display hashtags and comments for a given photo
 * @param {string} photoId - The ID of the photo to fetch data for
 */
async function loadPhotoData(photoId) {
    if (!photoId) {
        console.error("No photo ID provided for loading photo data.");
        return;
    }

    try {
        // Fetch the photo data
        const photoData = await getPhotoData(photoId);
        if (photoData) {
            console.log("Debug: photoData loaded:", photoData);
            loadHashtags(photoData.hashtags);
        }
        // Load comments
        await loadComments(photoId);
    } catch (error) {
        console.error("Error loading photo data:", error);
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


// Call loadComments when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const photoId = localStorage.getItem('photoId');
    if (photoId) {
        await loadComments(photoId); // Ensure this is called only once
    } else {
        console.error("Photo ID not found in localStorage.");
    }

    loadUserProfilePic();
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

        // Update the profile picture in the navigation bar
        const profileImgElement = document.getElementById('topnav-profile-image');
        if (profileImgElement) {
            profileImgElement.src = userData.profilePic || '../assets/Default_profile_icon.jpg';
        }
    } catch (error) {
        console.error("Error loading user profile picture:", error);
    }
}

