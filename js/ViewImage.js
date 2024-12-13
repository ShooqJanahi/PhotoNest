import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, orderBy, deleteDoc, addDoc, getDocs, serverTimestamp, updateDoc, increment, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { createNotificationPopup, openPopup } from './Notification.js';
import { db } from './firebaseConfig.js';
import { logout } from './login.js';




//============= Notification popup section ==============================

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

//============= END of Notification popup section ==============================



// Fetch Photo Information by Photo ID
async function fetchPhotoData(photoId) {
    try {
        const photoRef = doc(db, "Photos", photoId);
        const photoDoc = await getDoc(photoRef);


        if (photoDoc.exists()) {
            const photoData = photoDoc.data();

            // Increment the view count
            incrementViewCount(photoRef, photoData.viewCount);

            // Fetch user details
            fetchUserDetails(photoData.userId);

            // Populate photo details
            populatePhotoDetails(photoData);
        } else {
            console.error("No such photo exists!");
            alert("This photo doesn't exist!");
        }
    } catch (error) {
        console.error("Error fetching photo data:", error);
    }
}


// Populate photo details in the HTML page
function populatePhotoDetails(photoData) {
    // Populate the photo image
    const photoDisplay = document.getElementById("photo-display");
    photoDisplay.src = photoData.imageUrl;
    photoDisplay.alt = "Photo";

    // Populate caption
    const captionElement = document.getElementById("photo-caption");
    captionElement.textContent = photoData.caption || "";

    // Populate hashtags
    const hashtagsElement = document.getElementById("photo-hashtags");
    hashtagsElement.innerHTML = ""; // Clear any existing hashtags
    if (photoData.hashtags) {
        photoData.hashtags.forEach((hashtag, index) => {
            const hashtagElement = document.createElement("span");
            hashtagElement.classList.add("hashtag");
            hashtagElement.textContent = `#${hashtag}`;

            hashtagsElement.appendChild(hashtagElement);

            // Add a space after each hashtag except the last one
            if (index < photoData.hashtags.length - 1) {
                const space = document.createTextNode(" ");
                hashtagsElement.appendChild(space);
            }
        });
    }

    // Populate likes count
    const likesCountElement = document.getElementById("likes-count");
    likesCountElement.textContent = `${photoData.likesCount || 0} Likes`;

    // Populate location (city and country)
    const locationElement = document.getElementById("photo-location-text");
    locationElement.textContent = `${photoData.city || "Unknown City"}, ${photoData.country || "Unknown Country"}`;

    // Populate date posted
    const dateElement = document.getElementById("photo-date-text");
    const uploadDate = new Date(photoData.uploadDate);
    dateElement.textContent = uploadDate.toLocaleDateString();



}





//=================== Function to Fetch and Populate User Details ===========
// Fetch User Details from Users Collection
async function fetchUserDetails(userId) {
    try {
        // Reference to the user document in Firestore
        const userRef = doc(db, "users", userId);

        // Fetch user document data
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Populate user details on the page
            populateUserDetails(userData);
        } else {
            console.warn("No user data found for userId:", userId);
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
    }
}

// Populate user details in the HTML
function populateUserDetails(userData) {
    const usernameElement = document.getElementById("photo-username");
    const profilePicElement = document.getElementById("photo-user-profile-pic");

    // Update the username and profile picture
    usernameElement.textContent = userData.username || "Unknown User";
    profilePicElement.src = userData.profilePic || "../assets/Default_profile_icon.jpg";
}


//=================== END of Function to Fetch and Populate User Details ===========




//================== Display Comment ==============


// Function to fetch and display comments for the photo
async function fetchAndDisplayComments(photoId) {
    try {
        // Reference the Comments collection and query by photoId
        const commentsRef = collection(db, "Comments");
        const commentsQuery = query(
            commentsRef, 
            where("photoId", "==", photoId),
            orderBy("timestamp", "desc") // Order comments by timestamp in descending order
        );
        
        const querySnapshot = await getDocs(commentsQuery);

        // Get the comments container
        const commentsContainer = document.getElementById("comments-container");
        commentsContainer.innerHTML = ""; // Clear existing comments

        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const commentData = doc.data();
                commentData.commentId = doc.id; // Add the Firestore document ID to the commentData
                const commentElement = createCommentElement(commentData);
                commentsContainer.appendChild(commentElement);
            });

        } else {
            commentsContainer.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
        }
    } catch (error) {
        console.error("Error fetching comments:", error);
    }
}

// Function to create a comment element
function createCommentElement(commentData) {
    const commentDiv = document.createElement("div");
    commentDiv.classList.add("comment-card"); // Matches the provided CSS class for the card

    // Comment header
    const commentHeader = document.createElement("div");
    commentHeader.classList.add("comment-header");
    commentHeader.style.display = "flex"; // Align items horizontally
    commentHeader.style.justifyContent = "space-between"; // Space out elements

    // Comment details (username and timestamp)
    const commentDetails = document.createElement("div");
    commentDetails.classList.add("comment-details");

    const username = document.createElement("strong");
    username.textContent = commentData.username || "Unknown User";

    const timestamp = document.createElement("span");
    timestamp.classList.add("comment-time");
    const commentTimestamp = commentData.timestamp
        ? new Date(commentData.timestamp.seconds * 1000)
        : new Date();
    timestamp.textContent = commentTimestamp.toLocaleString();

    // Add username and timestamp to the details
    commentDetails.appendChild(username);
    commentDetails.appendChild(timestamp);

    // Dropdown menu for comment options
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("comment-options-container");

    const optionsIcon = document.createElement("i");
    optionsIcon.classList.add("fas", "fa-ellipsis-v", "comment-options-icon"); // Font Awesome icon
    optionsIcon.style.cursor = "pointer";
    optionsIcon.style.marginLeft = "10px";

    const dropdownMenu = document.createElement("div");
    dropdownMenu.classList.add("dropdown-menu", "hidden"); // Initially hidden
    dropdownMenu.style.position = "absolute";
    dropdownMenu.style.backgroundColor = "#fff";
    dropdownMenu.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
    dropdownMenu.style.borderRadius = "5px";
    dropdownMenu.style.padding = "5px 0";
    dropdownMenu.style.zIndex = "10";
    dropdownMenu.style.width = "150px";

    // Add dropdown options
    const deleteOption = document.createElement("div");
    deleteOption.classList.add("dropdown-option");
    deleteOption.textContent = "Delete Comment";
    deleteOption.onclick = () => {
        console.log("Comment ID passed to deleteComment:", commentData.commentId); // Debugging log
        deleteComment(commentData.commentId);
    };


    const reportOption = document.createElement("div");
    reportOption.classList.add("dropdown-option");
    reportOption.textContent = "Report Comment";
    reportOption.onclick = () => reportComment(commentData.commentId); // Pass comment ID

    dropdownMenu.appendChild(deleteOption);
    dropdownMenu.appendChild(reportOption);

    // Toggle dropdown menu visibility
    optionsIcon.onclick = (event) => {
        event.stopPropagation(); // Prevent event bubbling
        dropdownMenu.classList.toggle("hidden");
    };

    // Hide dropdown when clicking elsewhere
    document.addEventListener("click", () => {
        dropdownMenu.classList.add("hidden");
    });

    // Append the dropdown menu to the container
    dropdownContainer.appendChild(optionsIcon);
    dropdownContainer.appendChild(dropdownMenu);

    // Append details and options to the header
    commentHeader.appendChild(commentDetails);
    commentHeader.appendChild(dropdownContainer);

    // Comment text
    const commentText = document.createElement("p");
    commentText.classList.add("comment-text");
    commentText.textContent = commentData.commentText;

    // Append header and text to the comment card
    commentDiv.appendChild(commentHeader);
    commentDiv.appendChild(commentText);

    return commentDiv;
}



// Function to handle adding a new comment
async function addComment(photoId, userId, username, commentText, photoData) {
    try {

        if (!photoData || !photoData.userId) {
            console.error("Invalid photoData or missing userId:", photoData);
            alert("Unable to add comment due to missing photo details.");
            return;
        }
        
        if (!commentText.trim()) {
            alert("Comment cannot be empty.");
            return;
        }

        const commentsRef = collection(db, "Comments");

        // Add the new comment to the Comments collection
        const newComment = await addDoc(commentsRef, {
            photoId: photoId,
            userId: userId,
            username: username,
            commentText: commentText.trim(),
            timestamp: serverTimestamp(), // Use server timestamp
        });

        // Increment the comment count in the Photos collection
        const photoRef = doc(db, "Photos", photoId);
        await updateDoc(photoRef, {
            commentsCount: increment(1),
        });

        // Send a notification to the photo owner
        await sendNotification(
            photoData.userId,   // Receiver: Photo owner
            userId,             // Sender: Current user
            "Comment",          // Category: Comment
            photoId             // Photo ID
        );

        // Log the comment action
        await logActivity(userId, photoId, "commented", `Comment ID: ${newComment.id}`);

        // Clear the input field and refresh the comments section
        document.getElementById("comment-input").value = "";
        fetchAndDisplayComments(photoId); // Refresh comments section
        console.log("Comment added successfully.");
    } catch (error) {
        console.error("Error adding comment:", error);
    }
}


// Add event listener for submitting a comment
document.getElementById("submit-comment").addEventListener("click", async () => {
    const photoId = localStorage.getItem("photoId");
    const currentUser = JSON.parse(sessionStorage.getItem("user"));

    if (!photoId || !currentUser) {
        alert("Error: Missing photo ID or user data.");
        return;
    }

    // Fetch photo data
    const photoRef = doc(db, "Photos", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
        console.error("Photo not found!");
        alert("Photo not found. Cannot add comment.");
        return;
    }

    const photoData = photoDoc.data(); // Extract the photo data
    const commentText = document.getElementById("comment-input").value;

    // Pass `photoData` to `addComment`
    await addComment(photoId, currentUser.uid, currentUser.username, commentText, photoData);
});





//================== END of Display Comment ==============


//================== function to  incrementing the viewCount field =======

async function incrementViewCount(photoRef, currentViewCount) {
    try {
        await updateDoc(photoRef, {
            viewCount: increment(1), // Increment viewCount by 1
        });
        console.log("View count incremented successfully");
    } catch (error) {
        console.error("Error incrementing view count:", error);
    }
}






//================== END of function to  incrementing the viewCount field =======




//=============== Likes ================

async function initializeLikeButton(photoId) {
    const currentUser = JSON.parse(sessionStorage.getItem("user")); // Parse the user object

    if (!currentUser || !currentUser.uid) {
        console.error("Error: User ID not found in sessionStorage.");
        alert("Please log in to like photos.");
        return;
    }


    const likeIcon = document.getElementById("like-icon");
    const likesCountElement = document.getElementById("likes-count");
    const photoRef = doc(db, "Photos", photoId);

    // Check if the user has already liked the photo
    const userLikeRef = collection(db, "Likes");
    const userLikeQuery = query(
        userLikeRef,
        where("photoId", "==", photoId),
        where("userId", "==", currentUser.uid)
    );

    let userLikeSnapshot = await getDocs(userLikeQuery);
    let hasLiked = !userLikeSnapshot.empty; // True if the user has already liked the photo

    // Update the like button color and likes count
    likeIcon.style.color = hasLiked ? "red" : "gray"; // Red if liked, gray if not

    // Fetch the current likes count from Firestore
    const photoDoc = await getDoc(photoRef);
    if (photoDoc.exists()) {
        const photoData = photoDoc.data();
        likesCountElement.textContent = `${photoData.likesCount || 0} Likes`;
    }

    // Attach click event to toggle like functionality
    likeIcon.onclick = async () => {
        try {
            if (hasLiked) {
                // Remove like
                if (!userLikeSnapshot.empty) {
                    await removeLike(photoId, currentUser, photoRef, userLikeSnapshot.docs[0]);
                    console.log("Photo unliked.");
                }
            } else {
                // Add like
                await addLike(photoId, currentUser, photoRef);
                console.log("Photo liked.");
            }

            // Refresh state dynamically after updating Firestore
            userLikeSnapshot = await getDocs(userLikeQuery);
            hasLiked = !userLikeSnapshot.empty; // Update the hasLiked state
            await updateLikeUI(photoId, currentUser, likeIcon, likesCountElement);
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };
}


async function addLike(photoId, currentUser, photoRef) {
    try {
        // Fetch the photo data to get the owner's userId
        const photoDoc = await getDoc(photoRef);
        if (!photoDoc.exists()) {
            console.error("Photo not found!");
            alert("Photo not found!");
            return;
        }
        const photoData = photoDoc.data(); // Get photo data from Firestore


        // Add the like to the Likes collection
        const likesRef = collection(db, "Likes");
        await addDoc(likesRef, {
            photoId: photoId,
            userId: currentUser.uid,
            timestamp: new Date().toISOString(),
        });

        // Increment the like count in the Photos collection
        await updateDoc(photoRef, {
            likesCount: increment(1),
        });

        await sendNotification(
            photoData.userId,           // Receiver: Photo owner
            currentUser.uid,            // Sender: Current user
            "Like",                     // Category: Like
            photoId,                    // Photo ID

        );


        // Log the like action
        await logActivity(currentUser.uid, photoId, "liked_photo");

        console.log("Photo liked successfully.");
    } catch (error) {
        console.error("Error liking photo:", error);
    }
}

async function removeLike(photoId, currentUser, photoRef, likeDoc) {
    try {
        // Remove the like from the Likes collection
        await deleteDoc(likeDoc.ref);

        // Decrement the like count in the Photos collection
        await updateDoc(photoRef, {
            likesCount: increment(-1),
        });

        // Delete the notification for this like
        await deleteNotification(currentUser.uid, photoId, "Like");

        // Log the remove action
        await logActivity(currentUser.uid, photoId, "removed_like");

        console.log("Photo unliked successfully.");
    } catch (error) {
        console.error("Error unliking photo:", error);
    }
}

async function updateLikeUI(photoId, currentUser, likeIcon, likesCountElement) {
    // Re-check if the user has liked the photo
    const userLikeRef = collection(db, "Likes");
    const userLikeQuery = query(
        userLikeRef,
        where("photoId", "==", photoId),
        where("userId", "==", currentUser.uid)
    );
    const userLikeSnapshot = await getDocs(userLikeQuery);
    const hasLiked = !userLikeSnapshot.empty;

    // Update the like button color
    likeIcon.style.color = hasLiked ? "red" : "gray";

    // Update the like count dynamically
    const photoRef = doc(db, "Photos", photoId);
    const photoDoc = await getDoc(photoRef);
    if (photoDoc.exists()) {
        const photoData = photoDoc.data();
        likesCountElement.textContent = `${photoData.likesCount || 0} Likes`;
    }
}



//=============== END of Likes ================





//================== Dropdown Menu ==================

// Function to populate the dropdown menu based on user role
function populateDropdownMenu(userRole, isPhotoOwner) {
    const dropdownMenu = document.getElementById("image-options-dropdown");

    // Clear any existing dropdown menu options
    dropdownMenu.innerHTML = "";

    // Options for the owner of the photo
    if (isPhotoOwner) {
        dropdownMenu.appendChild(createDropdownOption("Delete Photo", "delete-photo"));
        dropdownMenu.appendChild(createDropdownOption("Edit Photo", "edit-photo"));
        dropdownMenu.appendChild(createDropdownOption("Move to Vault", "move-to-vault"));
        dropdownMenu.appendChild(createDropdownOption("Move to Album", "move-to-album"));
        dropdownMenu.appendChild(createDropdownOption("Report Photo", "report-photo"));
    }
    // Options for admin users
    else if (userRole === "admin") {
        dropdownMenu.appendChild(createDropdownOption("Delete Photo", "delete-photo"));
    }
    // Options for other users
    else {
        dropdownMenu.appendChild(createDropdownOption("Move to Album", "move-to-album"));
        dropdownMenu.appendChild(createDropdownOption("Report Photo", "report-photo"));
    }

    // Show the dropdown menu when clicked
    const optionsIcon = document.getElementById("image-options-icon");
    optionsIcon.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent the event from bubbling up
        dropdownMenu.classList.toggle("active"); // Toggle visibility
    });

    // Hide dropdown if clicked anywhere else
    document.addEventListener("click", () => {
        dropdownMenu.classList.remove("active");
    });

    // Stop closing dropdown when clicking inside it
    dropdownMenu.addEventListener("click", (e) => e.stopPropagation());
}


// Utility function to create a dropdown option
function createDropdownOption(optionText, optionId) {
    const option = document.createElement("div");
    option.classList.add("dropdown-option");
    option.id = optionId;
    option.textContent = optionText;

    // Add click event for each option
    option.addEventListener("click", () => {
        handleDropdownAction(optionId);
    });

    return option;
}

// Handle actions for each dropdown option
function handleDropdownAction(actionId) {
    const photoId = localStorage.getItem("photoId"); // Get the photo ID
    const photoRef = doc(db, "Photos", photoId);
    switch (actionId) {

        case "delete-photo":
            // Display a confirmation system message
            const isConfirmed = confirm("Are you sure you want to delete this photo? This action cannot be undone.");
            if (isConfirmed) {
                deletePhoto(photoId);
            }
            console.log("Move to delete photo clicked");
            break;


        case "edit-photo":
            // Logic for editing the photo
            // Fetch current photo details to populate the popup
            getDoc(photoRef)
                .then(photoDoc => {
                    if (photoDoc.exists()) {
                        const photoData = photoDoc.data();
                        createEditPhotoPopup(photoId, photoData.caption, photoData.hashtags || []);
                    } else {
                        console.error("Photo not found!");
                        alert("Photo not found!");
                    }
                })
                .catch(error => {
                    console.error("Error fetching photo details:", error);
                });
            console.log("Edit Photo clicked");
            break;

        case "move-to-vault":
            // Ask for confirmation before moving the photo
            const isConfirmedVault = confirm("Are you sure you want to move this photo to the vault?");
            if (isConfirmedVault) {
                moveToVault(photoId);
            }
            console.log("Move to Vault clicked");
            break;

        case "move-to-album":
            createMoveToAlbumPopup();
            console.log("Move to Album clicked");
            break;

        case "report-photo":
            createReportPhotoPopup(photoId);
            console.log("Report Photo clicked");
            break;


        default:
            console.error("Unknown action:", actionId);
    }
}





//================== END of Dropdown Menu ==================









//============== Create popup to call for  different sections ======

function createViewImagePopup(content, title = "Popup", onCloseCallback = null) {
    // Check if a popup already exists to prevent duplicates
    let existingPopup = document.getElementById("view-image-popup");
    if (existingPopup) {
        existingPopup.remove(); // Clean up previous popup if any
    }

    // Create the popup container
    const popupOverlay = document.createElement("div");
    popupOverlay.id = "view-image-popup";
    popupOverlay.style.position = "fixed";
    popupOverlay.style.top = "0";
    popupOverlay.style.left = "0";
    popupOverlay.style.width = "100%";
    popupOverlay.style.height = "100%";
    popupOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    popupOverlay.style.zIndex = "1000";
    popupOverlay.style.display = "flex";
    popupOverlay.style.alignItems = "center";
    popupOverlay.style.justifyContent = "center";

    // Prevent popup from closing when clicking on the overlay
    popupOverlay.addEventListener("click", (event) => {
        event.stopPropagation(); // Stop event bubbling
    });

    // Create the popup content container
    const popupContent = document.createElement("div");
    popupContent.style.backgroundColor = "#fff";
    popupContent.style.borderRadius = "10px";
    popupContent.style.padding = "20px";
    popupContent.style.width = "90%";
    popupContent.style.maxWidth = "500px";
    popupContent.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.3)";
    popupContent.style.position = "relative";
    popupContent.style.textAlign = "center"; // Center-align content

    // Add title
    const popupTitle = document.createElement("h2");
    popupTitle.textContent = title;
    popupTitle.style.marginTop = "0";
    popupTitle.style.fontSize = "1.5rem";
    popupTitle.style.fontWeight = "600";
    popupTitle.style.color = "#333";
    popupContent.appendChild(popupTitle);

    // Add the content
    const popupBody = document.createElement("div");
    popupBody.innerHTML = content;
    popupBody.style.marginTop = "15px";
    popupBody.style.color = "#555";
    popupBody.style.fontSize = "1rem";
    popupContent.appendChild(popupBody);

    // Add close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.backgroundColor = "#e74c3c";
    closeButton.style.color = "#fff";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "5px";
    closeButton.style.padding = "5px 10px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "0.9rem";

    closeButton.addEventListener("click", () => {
        popupOverlay.remove(); // Remove the popup
        if (onCloseCallback) {
            onCloseCallback(); // Execute the callback if provided
        }
    });

    popupContent.appendChild(closeButton);

    // Append popup content to the overlay
    popupOverlay.appendChild(popupContent);

    // Append the overlay to the body
    document.body.appendChild(popupOverlay);

    // Focus trap for accessibility
    popupContent.tabIndex = -1;
    popupContent.focus();
}



// Function to handle editing photo
function createEditPhotoPopup(photoId, currentCaption, currentHashtags) {
    
    const popupContent = `
      <form id="edit-photo-form">
        <label for="edit-caption">Caption:</label>
        <textarea id="edit-caption" style="width: 100%; height: 60px; margin-bottom: 10px;">${currentCaption}</textarea>
        <label for="edit-hashtags">Hashtags (comma-separated):</label>
        <input 
          type="text" 
          id="edit-hashtags" 
          style="width: 100%; margin-bottom: 20px;" 
          value="${currentHashtags.join(', ')}"
        />
        <button type="button" id="save-edits-btn" style="background-color: #4CAF50; color: #fff; border: none; border-radius: 5px; padding: 10px 20px; cursor: pointer;">Save</button>
      </form>
    `;

    createViewImagePopup(popupContent, "Edit Photo");

    // Handle Save button click
    document.getElementById("save-edits-btn").addEventListener("click", async () => {
        const newCaption = document.getElementById("edit-caption").value.trim();
        const newHashtags = document.getElementById("edit-hashtags").value
            .split(",")
            .map(tag => tag.trim().toLowerCase()) // Normalize hashtags
            .filter(tag => tag.length > 0); // Remove empty tags

        // Ask for confirmation
        const confirmation = confirm("Are you sure you want to save these changes?");
        if (confirmation) {
            try {
                const photoRef = doc(db, "Photos", photoId);
                const photoDoc = await getDoc(photoRef);

                if (photoDoc.exists()) {
                    const photoData = photoDoc.data();
                    const oldHashtags = photoData.hashtags || [];

                     // Decrement counts for old hashtags
                     const hashtagsToRemove = oldHashtags.filter(tag => !newHashtags.includes(tag));
                     for (const hashtag of hashtagsToRemove) {
                         await reduceHashtagCount(hashtag);
                     }


                await updateDoc(photoRef, {
                    caption: newCaption,
                    hashtags: newHashtags,
                });

                 // Increment counts for new hashtags
                 const hashtagsToAdd = newHashtags.filter(tag => !oldHashtags.includes(tag));
                 await processHashtags(hashtagsToAdd);

                alert("Photo updated successfully!");
                document.getElementById("view-image-popup").remove(); // Close popup
                fetchPhotoData(photoId); // Refresh photo details on the page
            } else {
                console.error("Photo does not exist.");
                alert("Photo not found.");
            }
            } catch (error) {
                console.error("Error updating photo:", error);
                alert("Failed to update the photo. Please try again.");
            }
        }
    });
}

//delete photo
async function deletePhoto(photoId) {
    try {
        // Reference the photo document in the Photos collection
        const photoRef = doc(db, "Photos", photoId);
        const photoDoc = await getDoc(photoRef);

        if (!photoDoc.exists()) {
            console.error("Photo does not exist.");
            alert("Photo not found. Please try again.");
            return;
        }

        // Get the userId (owner of the photo) from the photo document
        const photoData = photoDoc.data();
        const userId = photoData.userId;

        // Reduce hashtag counts
        if (photoData.hashtags && photoData.hashtags.length > 0) {
            for (const hashtag of photoData.hashtags) {
                await reduceHashtagCount(hashtag);
            }
        }

        // Delete the photo document
        await deleteDoc(photoRef);
        console.log(`Photo with ID ${photoId} deleted from Photos collection.`);

        // Delete all references to the photo in other collections
        await deletePhotoReferences(photoId);

        // Decrement the postsCount in the users collection
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            postsCount: increment(-1), // Decrease postsCount by 1
        });
        console.log(`postsCount decremented for user ${userId}`);

        // Log the delete action
        await logActivity(sessionStorage.getItem("userId"), photoId, "deleted_photo");

        // Display success system message
        alert("Photo deleted successfully!");

        // Redirect the user to the UserDashboard.html
        window.location.href = "UserDashboard.html";
    } catch (error) {
        console.error("Error deleting photo:", error);

        // Display error system message
        alert("Failed to delete the photo. Please try again.");
    }
}

// Function to decrement hashtag photoCount or remove the hashtag if the count reaches 0
async function reduceHashtagCount(hashtag) {
    try {
        // Query the database for the hashtag in the "hashtag" field
        const hashtagRef = collection(db, "Hashtag");
        const hashtagQuery = query(hashtagRef, where("hashtag", "==", hashtag));
        const querySnapshot = await getDocs(hashtagQuery);

        querySnapshot.forEach(async (docSnapshot) => {
            const hashtagDocRef = doc(db, "Hashtag", docSnapshot.id);
            const hashtagData = docSnapshot.data();

            if (hashtagData.photoCount > 1) {
                // Decrement photoCount if it's greater than 1
                await updateDoc(hashtagDocRef, { photoCount: increment(-1) });
                console.log(`Decremented photoCount for hashtag: ${hashtag}`);
            } else {
                // Remove the hashtag document if photoCount becomes 0
                await deleteDoc(hashtagDocRef);
                console.log(`Deleted hashtag: ${hashtag} (no photos remaining)`);
            }
        });
    } catch (error) {
        console.error("Error reducing hashtag count:", error);
    }
}



//This function ensures that all references to the photo in other collections (except ActivityLogs) are removed

async function deletePhotoReferences(photoId) {
    const collectionsToClean = ["Comments", "Likes"]; // Collections to clean up references

    try {
        for (const collectionName of collectionsToClean) {
            // Query to find documents that reference the photoId
            const collectionRef = collection(db, collectionName);
            const querySnapshot = await getDocs(query(collectionRef, where("photoId", "==", photoId)));

            // Delete all documents referencing the photoId
            for (const docSnapshot of querySnapshot.docs) {
                await deleteDoc(docSnapshot.ref);
                console.log(`Deleted reference in ${collectionName}:`, docSnapshot.id);
            }
        }
    } catch (error) {
        console.error(`Error deleting references in collections: ${collectionsToClean}`, error);
    }
}


//This function will copy the photo's document from the Photos collection to the VaultPhoto collection and then delete it from the Photos collection.
async function moveToVault(photoId) {
    try {
        const photoRef = doc(db, "Photos", photoId);
        const photoDoc = await getDoc(photoRef);

        if (!photoDoc.exists()) {
            console.error(`Photo with ID ${photoId} does not exist.`);
            alert("Photo not found. Please try again.");
            return;
        }
        console.log("Photo document fetched successfully.");

        const photoData = photoDoc.data();
        console.log("Photo data:", photoData);

        const vaultPhotoRef = doc(db, "VaultPhoto", photoId);
        console.log("Attempting to add photo to VaultPhoto collection...");
        await setDoc(vaultPhotoRef, photoData);
        console.log("Photo added to VaultPhoto collection successfully.");

        await deleteDoc(photoRef);
        console.log("Photo deleted from Photos collection successfully.");

        alert("Photo moved to the vault successfully!");

        // Log the delete action
        await logActivity(sessionStorage.getItem("userId"), photoId, "move_to_vault");

        // Redirect to UserDashboard.html
        window.location.href = "UserDashboard.html";
    } catch (error) {
        console.error("Error moving photo to the vault:", error);
        alert("Failed to move the photo to the vault. Please try again.");
    }
}


// Function to create the "Move to Album" popup
//Only albums belonging to the current user are displayed.
async function createMoveToAlbumPopup() {
    const photoId = localStorage.getItem("photoId");
    if (!photoId) {
        console.error("Photo ID is missing or undefined.");
        alert("Error: Photo ID is missing.");
        return;
    }




    const currentUser = JSON.parse(sessionStorage.getItem("user")); // Parse the stored user object

    if (!currentUser || !currentUser.uid) {
        console.error("Error: User ID not found in sessionStorage.");
        alert("Failed to load albums. Please log in again.");
        return;
    }

    try {
        console.log("Current User ID:", currentUser.uid);

        // Fetch all albums belonging to the current user
        const albumsRef = collection(db, "Albums");
        const userAlbumsQuery = query(albumsRef, where("userId", "==", currentUser.uid)); // Use userId directly
        const albumsSnapshot = await getDocs(userAlbumsQuery);

        console.log("Query executed. Snapshot size:", albumsSnapshot.size);

        // Generate album cards
        let albumCardsHTML = "";

        if (!albumsSnapshot.empty) {
            albumsSnapshot.forEach((docSnapshot) => {
                const album = docSnapshot.data();
                const albumId = docSnapshot.id;
                const isPhotoInAlbum = album.photoIds?.includes(photoId);

                const photoActionButton = isPhotoInAlbum
                    ? `<button class="add-to-album-btn" data-action="remove" data-album-id="${albumId}" data-photo-id="${photoId}" style="background-color: #d9534f;">Remove Photo</button>`
                    : `<button class="add-to-album-btn" data-action="add" data-album-id="${albumId}" data-photo-id="${photoId}">Add Photo</button>`;


                albumCardsHTML += `
                    <div class="album-option">
                        <div>
                            <strong>${album.name}</strong>
                            <p>${album.description || "No description available."}</p>
                        </div>
                        ${photoActionButton}
                    </div>
                `;
            });
        } else {
            albumCardsHTML = `<p class="no-suggestions">No albums available. Create one to get started!</p>`;
        }

        // Build and display popup content
        const popupContent = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <input type="text" id="album-search" placeholder="Search Albums" style="flex: 1; margin-right: 10px; padding: 5px;">
                    <button id="create-new-album-btn" style="padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Create New Album</button>
                </div>
                <div class="album-list">
                    ${albumCardsHTML}
                </div>
            </div>
        `;

        createViewImagePopup(popupContent, "Move to Album");

        // Add event listener for search
        document.getElementById("album-search").addEventListener("input", (e) => {
            const searchQuery = e.target.value.toLowerCase();
            const albumOptions = document.querySelectorAll(".album-option");

            albumOptions.forEach((option) => {
                const albumName = option.querySelector("strong").textContent.toLowerCase();
                if (albumName.includes(searchQuery)) {
                    option.style.display = "flex";
                } else {
                    option.style.display = "none";
                }
            });
        });

        // Add event listener for the Create Album button
        document.getElementById("create-new-album-btn").addEventListener("click", () => {
            createNewAlbumPopup(photoId); // Pass photoId in case you want to add it immediately to the new album
        });

        // Add event listeners for Add/Remove buttons
        document.querySelectorAll(".add-to-album-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
                const albumId = button.getAttribute("data-album-id");
                const action = button.getAttribute("data-action");
                const photoId = button.getAttribute("data-photo-id"); // Retrieve photoId here

                if (!photoId) {
                    console.error("Photo ID is missing or undefined.");
                    alert("Error: Photo ID is missing.");
                    return;
                }

                if (action === "add") {
                    await addPhotoToAlbum(albumId, photoId);
                    button.textContent = "Remove Photo";
                    button.setAttribute("data-action", "remove");
                    button.style.backgroundColor = "#d9534f"; // Change to red
                } else {
                    await removePhotoFromAlbum(albumId, photoId);
                    button.textContent = "Add Photo";
                    button.setAttribute("data-action", "add");
                    button.style.backgroundColor = "#a74fcb"; // Change to purple
                }
            });
        });

    } catch (error) {
        console.error("Error fetching albums:", error.message, error.stack);
        alert("Failed to load albums. Please try again.");
    }
}




// Function to create a new album
async function createNewAlbumPopup() {
    const currentUser = JSON.parse(sessionStorage.getItem("user"));
    const userId = currentUser?.uid; // Safely access uid


    if (!userId) {
        console.error("Error: User ID not found in sessionStorage.");
        alert("Failed to create album. Please log in again.");
        return;
    }

    const popupContent = `
       <form id="create-album-form">
            <label for="album-name">Album Name:</label>
            <input type="text" id="album-name" placeholder="Enter album name" style="width: 100%; margin-bottom: 10px;" required>
            <button type="submit" style="background-color: #4CAF50; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">Create Album</button>
        </form>
    `;

    createViewImagePopup(popupContent, "Create New Album");

    document.getElementById("create-album-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const albumName = document.getElementById("album-name").value.trim();

        console.log("Album Name:", albumName); // Debug log
        console.log("User ID:", userId);       // Debug log

        if (!albumName) {
            alert("Album name cannot be empty.");
            return;
        }



        try {
            const newAlbumRef = await addDoc(collection(db, "Albums"), {
                name: albumName,
                photoIds: [], // Initialize with an empty array
                userId: userId,
                createdAt: serverTimestamp(),
            });

            alert("Album created successfully!");
            document.getElementById("view-image-popup").remove();
            createMoveToAlbumPopup("", currentUser); // Refresh album list
        } catch (error) {
            console.error("Error creating album:", error);
            alert("Failed to create album. Please try again.");
        }
    });
}


// Function to add a photo to an album
async function addPhotoToAlbum(albumId, photoId) {
    console.log("Photo ID:", photoId);

    if (!photoId) {
        console.error("Invalid photo ID:", photoId);
        alert("Error: Photo ID is invalid.");
        return;
    }


    try {
        const albumRef = doc(db, "Albums", albumId);
        const albumDoc = await getDoc(albumRef);

        if (albumDoc.exists()) {
            const albumData = albumDoc.data();

            console.log("Album Data:", albumData);

            const existingPhotoIds = Array.isArray(albumData.photoIds) ? albumData.photoIds : [];

            // Check if the photoId already exists to avoid duplicates
            if (existingPhotoIds.includes(photoId)) {
                console.warn(`Photo ${photoId} is already in album ${albumId}`);
                alert("Photo is already in the album.");
                return;
            }

            // Add the photoId to the array
            const updatedPhotoIds = [...existingPhotoIds, photoId];
            console.log("Updated photoIds:", updatedPhotoIds);

            // Update Firestore
            await updateDoc(albumRef, { photoIds: updatedPhotoIds });

            await sendNotification(
                currentUser.uid,            // Receiver: Current user (notify themselves)
                currentUser.uid,            // Sender: Current user
                "Move to Album",            // Category: Move to Album
                photoId,                    // Photo ID

            );


            console.log(`Photo ${photoId} added to album ${albumId}`);
            alert("Photo added to album successfully!");
        } else {
            console.error("Album does not exist.");
            alert("Album not found. Please try again.");
        }
    } catch (error) {
        console.error("Error adding photo to album:", error);
        alert("Failed to add photo to album. Please try again.");
    }
}




// Function to remove a photo from an album
async function removePhotoFromAlbum(albumId, photoId) {
    try {
        const albumRef = doc(db, "Albums", albumId);
        const albumDoc = await getDoc(albumRef);

        if (albumDoc.exists()) {
            const albumData = albumDoc.data();

            // Safely filter out the photoId
            const updatedPhotoIds = (albumData.photoIds || []).filter((id) => id !== photoId && Boolean(id)); // Remove undefined values

            console.log("Updating album after removing photo:", updatedPhotoIds); // Debugging log

            // Update the album in Firestore
            await updateDoc(albumRef, { photoIds: updatedPhotoIds });

            // Log the remove from album action
            await logActivity(sessionStorage.getItem("userId"), photoId, "removed_from_album", `Removed from Album ID: ${albumId}`);


            console.log(`Photo ${photoId} removed from album ${albumId}`);
        } else {
            console.error("Album does not exist.");
            alert("Album not found. Please try again.");
        }
    } catch (error) {
        console.error("Error removing photo from album:", error);
        alert("Failed to remove photo from album. Please try again.");
    }
}




//report  photo popup

// Function to create the Report Photo popup
async function createReportPhotoPopup(photoId) {
    const userId = sessionStorage.getItem("userId");
    if (!userId) {
        console.error("Error: User ID not found in sessionStorage.");
        alert("Please log in to report this photo.");
        return;
    }

    try {
        // Fetch the photo data to get owner information
        const photoRef = doc(db, "Photos", photoId);
        const photoDoc = await getDoc(photoRef);

        if (!photoDoc.exists()) {
            console.error("Photo not found!");
            alert("Photo not found. Cannot report.");
            return;
        }

        const photoData = photoDoc.data();
        const photoOwnerId = photoData.userId;
        const photoOwnerUsername = photoData.username || "Unknown";

        // Popup content
        const popupContent = `
            <form id="report-photo-form">
                <label for="report-reason">Reason for reporting:</label>
                <textarea 
                    id="report-reason" 
                    placeholder="Enter your reason for reporting this photo" 
                    style="width: 100%; height: 80px; margin-bottom: 10px;" 
                    required>
                </textarea>
                <button 
                    type="submit" 
                    style="background-color: #e74c3c; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                    Submit Report
                </button>
            </form>
        `;

        createViewImagePopup(popupContent, "Report Photo");

        // Handle form submission
        document.getElementById("report-photo-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const reason = document.getElementById("report-reason").value.trim();


            if (!reason) {
                alert("Please provide a reason for reporting.");
                return;
            }


            try {
                const reportsRef = collection(db, "Reports");
                const reportData = {
                    category: "Photo",
                    messageId: photoId,
                    reason: reason,
                    reportedBy: userId,
                    reportedAt: serverTimestamp(),
                    status: "Pending Review",
                    ownerId: photoOwnerId,
                    ownerUsername: photoOwnerUsername,
                };

                await addDoc(reportsRef, reportData); // Submit the report
                console.log("Report submitted successfully:", reportData);

                alert("Report submitted successfully.");

                // Log the delete action
                await logActivity(sessionStorage.getItem("userId"), photoId, "report_photo");

                document.getElementById("view-image-popup").remove(); // Close the popup
            } catch (error) {
                console.error("Error submitting report:", error);
                alert("Failed to submit the report. Please try again.");
            }

        });
    } catch (error) {
        console.error("Error fetching photo details:", error);
        alert("Failed to load the photo details. Please try again.");
    }
}







//============== END of Create popup to call for  different sections ======



//================= Comment dropdown oprtions ==================
async function deleteComment(commentId) {
    try {
        console.log("Deleting comment with ID:", commentId); // Debugging log
        if (!commentId) {
            throw new Error("Comment ID is missing.");
        }

        // Get the photo ID from local storage
        const photoId = localStorage.getItem("photoId");
        if (!photoId) {
            throw new Error("Photo ID is missing.");
        }

        // Reference the specific comment and delete it
        const commentRef = doc(db, "Comments", commentId);
        await deleteDoc(commentRef); // Delete the comment from Firestore
        console.log("Comment deleted successfully!");

        // Decrement the commentsCount in the Photos collection
        const photoRef = doc(db, "Photos", photoId);
        await updateDoc(photoRef, {
            commentsCount: increment(-1), // Decrement by 1
        });
        console.log("Comments count decremented successfully!");

        // Delete the notification for this comment
        await deleteNotification(commentData.userId, photoId, "Comment");

        // Log the delete action
        await logActivity(sessionStorage.getItem("userId"), photoId, "deleted_comment");

        // Refresh the comments section
        fetchAndDisplayComments(photoId);

        alert("Comment deleted successfully!");
    } catch (error) {
        console.error("Error deleting comment:", error);
        alert("Failed to delete the comment. Please try again.");
    }
}



async function reportComment(commentId) {
    if (!commentId) {
        console.error("Comment ID is missing.");
        alert("Cannot report comment. Please try again.");
        return;
    }

    const currentUser = JSON.parse(sessionStorage.getItem("user"));
    if (!currentUser || !currentUser.uid) {
        console.error("User is not logged in.");
        alert("Please log in to report comments.");
        return;
    }

    try {
        // Fetch comment data to get details of the comment's creator
        const commentRef = doc(db, "Comments", commentId);
        const commentDoc = await getDoc(commentRef);

        if (!commentDoc.exists()) {
            console.error("Comment not found.");
            alert("Comment not found. Please try again.");
            return;
        }

        const commentData = commentDoc.data();
        const commentOwnerId = commentData.userId;
        const commentOwnerUsername = commentData.username || "Unknown User";

        // Create popup content
        const popupContent = `
            <form id="report-comment-form">
                <label for="report-reason">Reason for reporting this comment:</label>
                <textarea 
                    id="report-reason" 
                    placeholder="Enter your reason for reporting" 
                    style="width: 100%; height: 80px; margin-bottom: 10px;" 
                    required>
                </textarea>
                <button 
                    type="submit" 
                    style="background-color: #e74c3c; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                    Submit Report
                </button>
            </form>
        `;

        createViewImagePopup(popupContent, "Report Comment");

        // Handle form submission
        document.getElementById("report-comment-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const reason = document.getElementById("report-reason").value.trim();

            if (!reason) {
                alert("Please provide a reason for reporting.");
                return;
            }

            try {
                const reportsRef = collection(db, "Reports");

                // Add report to Firestore with additional details
                await addDoc(reportsRef, {
                    category: "Comment",
                    messageId: commentId,
                    reason: reason,
                    reportedBy: currentUser.uid, // ID of the user reporting the comment
                    reportedByUsername: currentUser.username || "Unknown User", // Username of the user reporting
                    reportedAt: serverTimestamp(),
                    commentOwnerId: commentOwnerId, // ID of the user who created the comment
                    commentOwnerUsername: commentOwnerUsername, // Username of the user who created the comment
                    status: "Pending Review",
                });

                alert("Comment reported successfully.");

                // Log 
                await logActivity(sessionStorage.getItem("userId"), photoId, "report_comment");


                document.getElementById("view-image-popup").remove(); // Close popup
            } catch (error) {
                console.error("Error reporting comment:", error);
                alert("Failed to report the comment. Please try again.");
            }
        });
    } catch (error) {
        console.error("Error fetching comment details:", error);
        alert("Failed to fetch the comment details. Please try again.");
    }
}



//================= END of Comment dropdown oprtions ==================

//========================== Share Photo ==========================

// Function to create the Share Popup
async function createSharePopup(photoId) {
    const currentUser = JSON.parse(sessionStorage.getItem("user"));
    if (!currentUser || !currentUser.uid) {
        console.error("User is not logged in.");
        alert("Please log in to share this photo.");
        return;
    }

    const popupContent = `
    <div>
        <label for="user-search">Search Username:</label>
        <input 
            type="text" 
            id="user-search" 
            placeholder="Enter username to share with..." 
            style="width: 100%; margin-bottom: 10px;" 
        />
        <ul id="user-results" style="list-style-type: none; padding: 0; max-height: 200px; overflow-y: auto; border: 1px solid #ddd; background-color: #fff;"></ul>
        <label for="message-input">Add a Message (Optional):</label>
        <textarea 
            id="message-input" 
            placeholder="Add your message here..." 
            style="width: 100%; height: 60px; margin-bottom: 10px;">
        </textarea>
        <button 
            id="send-share" 
            style="background-color: #4CAF50; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
            Send
        </button>
    </div>
`;

    createViewImagePopup(popupContent, "Share Photo");

    // Add event listener to search input
    document.getElementById("user-search").addEventListener("input", async (e) => {
        const queryText = e.target.value.trim().toLowerCase();
        const userResults = document.getElementById("user-results");
        userResults.innerHTML = ""; // Clear previous results

        if (queryText) {
            const usersRef = collection(db, "users");
            const usersQuery = query(
                usersRef,
                where("role", "==", "user"), // Filter by "user" role
                where("username", ">=", queryText),
                where("username", "<=", queryText + "\uf8ff")
            );
            const userSnapshots = await getDocs(usersQuery);

            if (!userSnapshots.empty) {
                userSnapshots.forEach((doc) => {
                    const user = doc.data();
                    const userId = doc.id;

                    // Create user suggestion item
                    const listItem = document.createElement("li");
                    listItem.style.display = "flex";
                    listItem.style.alignItems = "center";
                    listItem.style.padding = "5px";
                    listItem.style.borderBottom = "1px solid #ddd";
                    listItem.style.cursor = "pointer";
                    listItem.setAttribute("data-user-id", userId); // Ensure the ID is set here

                    // Add profile picture
                    const profilePic = document.createElement("img");
                    profilePic.src = user.profilePic || "../assets/Default_profile_icon.jpg";
                    profilePic.alt = "Profile Picture";
                    profilePic.style.width = "40px";
                    profilePic.style.height = "40px";
                    profilePic.style.borderRadius = "50%";
                    profilePic.style.marginRight = "10px";

                    // Add username
                    const username = document.createElement("span");
                    username.textContent = user.username || "Unknown";

                    listItem.appendChild(profilePic);
                    listItem.appendChild(username);

                    listItem.addEventListener("click", () => {
                        // Set the selected user details
                        document.getElementById("user-search").value = user.username;
                        userResults.innerHTML = ""; // Clear results
                        userResults.setAttribute("data-selected-user-id", userId); // Correctly set the selected ID
                    });

                    userResults.appendChild(listItem);
                });
            } else {
                userResults.innerHTML = `<li style="padding: 5px;">No users found</li>`;
            }
        }
    });

    // Add event listener to send button
    document.getElementById("send-share").addEventListener("click", async () => {
        const receiverUsername = document.getElementById("user-search").value.trim();
        const message = document.getElementById("message-input").value.trim();
        const selectedUserId = document.getElementById("user-results").getAttribute("data-selected-user-id");

        if (!receiverUsername || !selectedUserId) {
            alert("Please select a valid user to share with.");
            return;
        }

        try {
            // Add message to the Messages collection
            await addDoc(collection(db, "Messages"), {
                senderId: currentUser.uid,
                receiverId: selectedUserId,
                messageText: message,
                photoId: photoId,
                subject: "Shared Photo",
                status: "Unread",
                timestamp: serverTimestamp(),
            });

            await sendNotification(
                selectedUserId,             // Receiver: Selected user to share with
                currentUser.uid,            // Sender: Current user
                "Share",                    // Category: Share
                photoId,                    // Photo ID

            );


            // Log the share action
            await logActivity(currentUser.uid, photoId, "shared_photo", `Shared with ${receiverUsername}`);

            alert("Photo shared successfully!");
            document.getElementById("view-image-popup").remove(); // Close popup
        } catch (error) {
            console.error("Error sharing photo:", error);
            alert("Failed to share the photo. Please try again.");
        }
    });

}

document.getElementById("share-button").addEventListener("click", () => {
    const photoId = localStorage.getItem("photoId");
    if (!photoId) {
        alert("Error: Photo ID is missing.");
        return;
    }

    createSharePopup(photoId);
});





//======================== END of Share Photo ==========================


// Fetch user and photo details on page load
document.addEventListener("DOMContentLoaded", async () => {
    try {

        //Logout button
        const logoutButton = document.getElementById('logout-button'); // Ensure this matches the ID in your HTML

        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                logout(); // Call the logout function from login.js
            });
        } else {
            console.error("Logout button not found in the DOM.");
        }



        // Retrieve user and photo data
        const photoId = localStorage.getItem("photoId");
        const currentUser = JSON.parse(sessionStorage.getItem("user"));


        if (!currentUser || !currentUser.uid) {
            console.error("Error: User data not found in sessionStorage.");
            alert("Please log in to view this photo.");
            return;
        }

        if (!photoId) {
            console.warn("No photo ID found in local storage.");
            return;
        }


        if (photoId) {
            fetchAndDisplayComments(photoId);
            fetchPhotoData(photoId);
        } else {
            console.warn("No photo ID found in local storage.");
        }


        console.log("Photo ID:", photoId);
        console.log("Current User:", currentUser);

        // Fetch photo details
        const photoRef = doc(db, "Photos", photoId);
        const photoDoc = await getDoc(photoRef);

        if (photoDoc.exists()) {
            const photoData = photoDoc.data();
            const isPhotoOwner = currentUser.uid === photoData.userId;

            await updateUserProfilePicture()
            //for the like
            initializeLikeButton(photoId, currentUser);

            // Populate dropdown menu based on role and ownership
            populateDropdownMenu(currentUser.role, isPhotoOwner);
        } else {
            console.error("Photo not found!");
            alert("Photo data could not be found. Please try again later.");
        }
    } catch (error) {
        console.error("Error fetching photo data:", error);
    }
});


//======================== Activity Log ==========================

// Function to log user activities to Firestore ActivityLogs collection
async function logActivity(userId, targetId, category, message = "") {
    try {
        const activityRef = collection(db, "ActivityLogs");
        await addDoc(activityRef, {
            userId: userId,
            targetId: targetId, // ID of the target (photo, comment, etc.)
            category: category, // Type of activity (e.g., liked_photo, removed_like, etc.)
            message: message, // Optional message
            timestamp: new Date().toISOString() // ISO timestamp
        });
        console.log(`Activity logged: ${category}`);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}

//======================== END of Activity Log ==========================

//============ Setting Logged-In User's Profile Picture in the header ============
// Function to update the user's profile picture dynamically
async function updateUserProfilePicture() {
    try {
        // Retrieve the current user from sessionStorage
        const currentUser = JSON.parse(sessionStorage.getItem("user"));

        if (!currentUser || !currentUser.uid) {
            console.error("Error: User data not found in sessionStorage.");
            return;
        }

        // Reference to the user's Firestore document
        const userRef = doc(db, "users", currentUser.uid);

        // Fetch user data from Firestore
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Update the profile image
            const profileImage = document.getElementById("profile-image");
            profileImage.src = userData.profilePic || "../assets/Default_profile_icon.jpg";
            profileImage.alt = userData.username || "User Profile";

            console.log("Profile picture updated successfully.");
        } else {
            console.warn("No user data found for UID:", currentUser.uid);
        }
    } catch (error) {
        console.error("Error updating profile picture:", error);
    }
}



//============ END of Setting Logged-In User's Profile Picture in the header ============


//=========== Notification function =====================

// Function to send notifications to Firestore
async function sendNotification(receiverId, senderId, category, photoId, message = "") {
    try {
        // Add a new notification document to the Firestore Notifications collection
        const notificationRef = collection(db, "Notifications");
        await addDoc(notificationRef, {
            receiverId: receiverId,       // User receiving the notification
            senderId: senderId,           // User performing the action
            category: category,           // Type of notification: "Like", "Comment", "Share", "Move to Album"
            photoId: photoId,             // Related photo ID
            status: "unopen",

            timestamp: serverTimestamp()  // Firestore server timestamp
        });
        console.log(`Notification sent: ${category}`);
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}


//This function handles deleting a specific notification
async function deleteNotification(senderId, photoId, category) {
    try {
        const notificationsRef = collection(db, "Notifications");
        const notificationsQuery = query(
            notificationsRef,
            where("senderId", "==", senderId),
            where("photoId", "==", photoId),
            where("category", "==", category)
        );

        const querySnapshot = await getDocs(notificationsQuery);

        if (!querySnapshot.empty) {
            querySnapshot.forEach(async (docSnapshot) => {
                await deleteDoc(docSnapshot.ref); // Delete each matching notification
                console.log(`Notification deleted: ${docSnapshot.id}`);
            });
        } else {
            console.log("No matching notifications found for deletion.");
        }
    } catch (error) {
        console.error("Error deleting notification:", error);
    }
}






//=========== END of Notification function =====================




//========== check if a hashtag exists, increment its photoCount by 1 if it does, or create it with an initial photoCount of 1 if it doesn't=========================

// Function to manage hashtags
async function handleHashtag(hashtag) {
    try {
        // Query the database for the hashtag in the "hashtag" field
        const hashtagRef = collection(db, "Hashtag");
        const hashtagQuery = query(hashtagRef, where("hashtag", "==", hashtag));
        const querySnapshot = await getDocs(hashtagQuery);

        if (!querySnapshot.empty) {
            // If hashtag exists, increment its photoCount
            querySnapshot.forEach(async (docSnapshot) => {
                const hashtagDocRef = doc(db, "Hashtag", docSnapshot.id);
                await updateDoc(hashtagDocRef, { photoCount: increment(1) });
                console.log(`Hashtag '${hashtag}' exists. Incremented photoCount.`);
            });
        } else {
            // If hashtag doesn't exist, create it with photoCount = 1
            await addDoc(hashtagRef, { hashtag: hashtag, photoCount: 1 });
            console.log(`Hashtag '${hashtag}' created with photoCount = 1.`);
        }
    } catch (error) {
        console.error("Error handling hashtag:", error);
    }
}



// Process multiple hashtags in bulk
async function processHashtags(hashtags) {
    const uniqueHashtags = [...new Set(hashtags)]; // Remove duplicates
    try {
        for (const hashtag of uniqueHashtags) {
            await handleHashtag(hashtag);
        }
    } catch (error) {
        console.error("Error processing hashtags:", error);
    }
}












//=========== END of the hashtag section ===============