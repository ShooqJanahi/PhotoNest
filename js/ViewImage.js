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
        // Reference the photo document in the database using the photo ID
        const photoRef = doc(db, "Photos", photoId);

        // Fetch the document data from Firestore
        const photoDoc = await getDoc(photoRef);

        // Check if the document exists
        if (photoDoc.exists()) {

            // Extract data from the photo document
            const photoData = photoDoc.data();

            // Increment the view count for the photo
            incrementViewCount(photoRef, photoData.viewCount);

            // Fetch details of the user who posted the photo
            fetchUserDetails(photoData.userId);

            // Adding a redirection feature to the user's profile
            addProfileRedirection(photoData.userId);

            // Populate the UI with the fetched photo details
            populatePhotoDetails(photoData);
        } else {
            //log if the photo doesn't exist
            console.error("No such photo exists!");
            //alert the user if the photo doesn't exist
            alert("This photo doesn't exist!");
        }
    } catch (error) {
        // Log any errors encountered during the fetch operation
        console.error("Error fetching photo data:", error);
    }
}


// Populate photo details in the HTML page
function populatePhotoDetails(photoData) {
    // Populate the photo image
    const photoDisplay = document.getElementById("photo-display");
    photoDisplay.src = photoData.imageUrl; // Set the image source to the photo's URL
    photoDisplay.alt = "Photo"; // Provide a default alt text for accessibility

    // Populate caption
    const captionElement = document.getElementById("photo-caption");
    captionElement.textContent = photoData.caption || ""; // Insert the caption or an empty string if not available

    // Populate hashtags
    const hashtagsElement = document.getElementById("photo-hashtags");
    hashtagsElement.innerHTML = ""; // Clear any existing hashtags
    if (photoData.hashtags) {
        photoData.hashtags.forEach((hashtag, index) => {
            const hashtagElement = document.createElement("span"); // Create a <span> for each hashtag
            hashtagElement.classList.add("hashtag"); // To add a CSS class for styling
            hashtagElement.textContent = `#${hashtag}`; // Format the hashtag with a `#`

            hashtagsElement.appendChild(hashtagElement); // Append the hashtag to the container

            // Add a space after each hashtag except the last one
            if (index < photoData.hashtags.length - 1) {
                const space = document.createTextNode(" "); // Creating a text node for the space
                hashtagsElement.appendChild(space); // Append the space
            }
        });
    }

    // Populate likes count
    const likesCountElement = document.getElementById("likes-count");
    likesCountElement.textContent = `${photoData.likesCount || 0} Likes`; // Insert the number of likes, default to 0

    // Populate location (city and country)
    const locationElement = document.getElementById("photo-location-text");
    locationElement.textContent = `${photoData.city || "Unknown City"}, ${photoData.country || "Unknown Country"}`; // Display city and country or default text

    // Populate date posted
    const dateElement = document.getElementById("photo-date-text");
    const uploadDate = new Date(photoData.uploadDate); // Convert the upload date to a Date object
    dateElement.textContent = uploadDate.toLocaleDateString(); // Format the date as a human-readable string
}





//=================== Function to Fetch and Populate User Details ===========
// Fetch User Details from Users Collection
async function fetchUserDetails(userId) {
    try {
        // Reference to the user document in Firestore
        const userRef = doc(db, "users", userId);

        // Fetch user document data
        const userDoc = await getDoc(userRef);

        // Check if the document exists in Firestore
        if (userDoc.exists()) {

            // Extract the user data from the document
            const userData = userDoc.data();

            // Populate user details on the page
            populateUserDetails(userData); // Calls a separate function to update the UI with the retrieved user details.
        } else {
            // If no document exists for the given userId, log a warning message
            console.warn("No user data found for userId:", userId);
        }
    } catch (error) {
        // Log any errors encountered during the Firestore operations
        console.error("Error fetching user details:", error);
    }
}

// Populate user details in the HTML
function populateUserDetails(userData) {
    // Get the HTML element for displaying the username
    const usernameElement = document.getElementById("photo-username");

    // Get the HTML element for displaying the user's profile picture
    const profilePicElement = document.getElementById("photo-user-profile-pic");

    // If the username is available in the userData, display it; otherwise, use a default "Unknown User"
    usernameElement.textContent = userData.username || "Unknown User";

    // If a profile picture URL is available in userData, use it; otherwise, fall back to a default profile icon
    profilePicElement.src = userData.profilePic || "../assets/Default_profile_icon.jpg";
}


//=================== END of Function to Fetch and Populate User Details ===========




//================== Display Comment ==============


// Function to fetch and display comments for the photo
async function fetchAndDisplayComments(photoId) {
    try {
        // Reference the Comments collection in Firestore
        const commentsRef = collection(db, "Comments");

        // Query to fetch comments for the given photoId, ordered by timestamp (most recent first)
        const commentsQuery = query(
            commentsRef,
            where("photoId", "==", photoId), // Filter comments by photoId
            orderBy("timestamp", "desc") // Sort by timestamp in descending order
        );

        // Execute the query and get a snapshot of the matching documents
        const querySnapshot = await getDocs(commentsQuery);

        // Get the HTML container for displaying comments
        const commentsContainer = document.getElementById("comments-container");

        commentsContainer.innerHTML = ""; // Clear any existing comments in the container

        // Check if there are any comments
        if (!querySnapshot.empty) {
            // Loop through each document in the query snapshot
            querySnapshot.forEach((doc) => {
                const commentData = doc.data(); // Retrieve the comment data
                commentData.commentId = doc.id; // Add the Firestore document ID to the commentData
                const commentElement = createCommentElement(commentData); // Create a comment DOM element
                commentsContainer.appendChild(commentElement); // Add the comment to the container
            });

        } else {
            // Display a placeholder message if no comments are found
            commentsContainer.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
        }
    } catch (error) {
        // Log any errors encountered during the fetch process
        console.error("Error fetching comments:", error);
    }
}

// Function to create a comment element
function createCommentElement(commentData) {
    // Create the main container for the comment card
    const commentDiv = document.createElement("div");
    commentDiv.classList.add("comment-card"); // Style the card with the CSS class

    // Comment header section
    const commentHeader = document.createElement("div");
    commentHeader.classList.add("comment-header");
    commentHeader.style.display = "flex"; // Align username and dropdown horizontally
    commentHeader.style.justifyContent = "space-between"; // Space out username and options icon

    // Comment details container (for username and timestamp)
    const commentDetails = document.createElement("div");
    commentDetails.classList.add("comment-details");

    // Username element
    const username = document.createElement("strong");
    username.textContent = commentData.username || "Unknown User"; // Default to "Unknown User" if no username

    // Timestamp element
    const timestamp = document.createElement("span");
    timestamp.classList.add("comment-time");
    const commentTimestamp = commentData.timestamp
        ? new Date(commentData.timestamp.seconds * 1000) // Convert Firestore timestamp to JavaScript Date
        : new Date();  // Default to current time if no timestamp
    timestamp.textContent = commentTimestamp.toLocaleString(); // Format as a readable date/time string

    // Append username and timestamp to the details container
    commentDetails.appendChild(username);
    commentDetails.appendChild(timestamp);

    // Dropdown container for options
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("comment-options-container");

    // Options icon (ellipsis)
    const optionsIcon = document.createElement("i");
    optionsIcon.classList.add("fas", "fa-ellipsis-v", "comment-options-icon"); // Font Awesome icon
    optionsIcon.style.cursor = "pointer"; // Pointer cursor for interactivity
    optionsIcon.style.marginLeft = "10px"; // Spacing between icon and other elements

    // Dropdown menu container
    const dropdownMenu = document.createElement("div");
    dropdownMenu.classList.add("dropdown-menu", "hidden"); // Initially hidden
    dropdownMenu.style.position = "absolute"; // Positioned relative to the container
    dropdownMenu.style.backgroundColor = "#fff"; // White background for visibility
    dropdownMenu.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)"; // Subtle shadow for depth
    dropdownMenu.style.borderRadius = "5px"; // Rounded corners
    dropdownMenu.style.padding = "5px 0"; // Inner padding for dropdown items
    dropdownMenu.style.zIndex = "10"; // Ensure the dropdown appears above other elements
    dropdownMenu.style.width = "150px"; // Fixed width for dropdown

    // Dropdown options: Delete Comment
    const deleteOption = document.createElement("div");
    deleteOption.classList.add("dropdown-option");
    deleteOption.textContent = "Delete Comment"; // Display text
    deleteOption.onclick = () => {
        console.log("Comment ID passed to deleteComment:", commentData.commentId); // Debugging log
        deleteComment(commentData.commentId); // Call deleteComment function with the comment ID
    };

    // Dropdown options: Report Comment
    const reportOption = document.createElement("div");
    reportOption.classList.add("dropdown-option");
    reportOption.textContent = "Report Comment"; // Display text
    reportOption.onclick = () => reportComment(commentData.commentId); // Call reportComment function with the comment ID

    // Append options to the dropdown menu
    dropdownMenu.appendChild(deleteOption);
    dropdownMenu.appendChild(reportOption);

    // Toggle dropdown menu visibility on click
    optionsIcon.onclick = (event) => {
        event.stopPropagation(); // Prevent click event from propagating to the document
        dropdownMenu.classList.toggle("hidden"); // Show/hide the dropdown menu
    };

    // Hide the dropdown menu when clicking elsewhere on the document
    document.addEventListener("click", () => {
        dropdownMenu.classList.add("hidden"); // Hide the menu
    });

    // Append the dropdown icon and menu to the container
    dropdownContainer.appendChild(optionsIcon);
    dropdownContainer.appendChild(dropdownMenu);

    // Add the details and dropdown to the comment header
    commentHeader.appendChild(commentDetails);
    commentHeader.appendChild(dropdownContainer);

    // Comment text
    const commentText = document.createElement("p");
    commentText.classList.add("comment-text");
    commentText.textContent = commentData.commentText; // Display the comment's text

    // Append header and text to the main comment card
    commentDiv.appendChild(commentHeader);
    commentDiv.appendChild(commentText);

    // Return the constructed comment element
    return commentDiv;
}



// Function to handle adding a new comment
async function addComment(photoId, userId, username, commentText, photoData) {
    try {
        // Ensure valid photo data and non-empty comment
        if (!photoData || !photoData.userId) {
            console.error("Invalid photoData or missing userId:", photoData);
            alert("Unable to add comment due to missing photo details.");
            return;
        }

        if (!commentText.trim()) {
            alert("Comment cannot be empty."); // Prevent adding empty comments
            return;
        }
        // Reference the Comments collection
        const commentsRef = collection(db, "Comments");

        // Add the new comment to the Comments collection in firestore
        const newComment = await addDoc(commentsRef, {
            photoId: photoId, // ID of the photo being commented on
            userId: userId, // ID of the user adding the comment
            username: username, // Username of the commenter
            commentText: commentText.trim(), // Cleaned-up comment text
            timestamp: serverTimestamp(), // Firestore server timestamp
        });
        // Increment the comment count in the Photos collection
        const photoRef = doc(db, "Photos", photoId);
        await updateDoc(photoRef, {
            commentsCount: increment(1), // Increment the comment count atomically
        });
        // Send a notification to the photo owner
        await sendNotification(
            photoData.userId,   // Receiver: Photo owner
            userId,             // Sender: Current user
            "Comment",          // Notification category
            photoId             // Reference to the photo
        );
        // Log the user's activity
        await logActivity(userId, photoId, "commented", `Comment ID: ${newComment.id}`);

        // Clear the input field for better UX
        document.getElementById("comment-input").value = "";

        // Refresh the comments section to show the new comment
        fetchAndDisplayComments(photoId);
        console.log("Comment added successfully.");
    } catch (error) {
        console.error("Error adding comment:", error); // Log errors for debugging
    }
}


// Added event listener for submitting a comment
document.getElementById("submit-comment").addEventListener("click", async () => {
    // Fetch photo ID from localStorage and current user from sessionStorage
    const photoId = localStorage.getItem("photoId");
    const currentUser = JSON.parse(sessionStorage.getItem("user"));

    if (!photoId || !currentUser) {
        alert("Error: Missing photo ID or user data."); // Alert if required data is missing

        return;
    }

    // Fetch photo data from Firestore
    const photoRef = doc(db, "Photos", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
        console.error("Photo not found!"); // Log if the photo doesn't exist
        alert("Photo not found. Cannot add comment.");
        return;
    }

    const photoData = photoDoc.data(); // Extract the photo details
    const commentText = document.getElementById("comment-input").value; // Get comment text

    // Pass data to `addComment` function
    await addComment(photoId, currentUser.uid, currentUser.username, commentText, photoData);
});





//================== END of Display Comment ==============


//================== function to  incrementing the viewCount field =======

async function incrementViewCount(photoRef, currentViewCount) {
    try {
        // Update the 'viewCount' field in the Photos Firestore collection
        await updateDoc(photoRef, {
            viewCount: increment(1), // Increment viewCount by 1
        });
        // Log a success message to the console
        console.log("View count incremented successfully");
    } catch (error) {
        // Log an error message to the console if the operation fails
        console.error("Error incrementing view count:", error);
    }
}






//================== END of function to  incrementing the viewCount field =======




//=============== Likes ================

async function initializeLikeButton(photoId) {
    const currentUser = JSON.parse(sessionStorage.getItem("user")); // Retrieve logged-in user details

    if (!currentUser || !currentUser.uid) {
        console.error("Error: User ID not found in sessionStorage.");
        alert("Please log in to like photos.");
        return; // Exit if user is not logged in
    }

    // Reference the like icon and likes count elements in the DOM
    const likeIcon = document.getElementById("like-icon");
    const likesCountElement = document.getElementById("likes-count");
    const photoRef = doc(db, "Photos", photoId); // Reference to the photo document

    // Query to check if the current user has already liked the photo
    const userLikeRef = collection(db, "Likes");
    const userLikeQuery = query(
        userLikeRef,
        where("photoId", "==", photoId),
        where("userId", "==", currentUser.uid)
    );

    let userLikeSnapshot = await getDocs(userLikeQuery); // Fetch user's like state
    let hasLiked = !userLikeSnapshot.empty; /// Determine if the user has liked the photo

    // Update the like button color based on like state
    likeIcon.style.color = hasLiked ? "red" : "gray"; // Red if liked, gray if not

    // Fetch the current likes count and display it
    const photoDoc = await getDoc(photoRef);
    if (photoDoc.exists()) {
        const photoData = photoDoc.data();
        likesCountElement.textContent = `${photoData.likesCount || 0} Likes`;
    }

    // Attach click event to toggle the like
    likeIcon.onclick = async () => {
        try {
            if (hasLiked) {
                // Unlike the photo
                if (!userLikeSnapshot.empty) {
                    await removeLike(photoId, currentUser, photoRef, userLikeSnapshot.docs[0]);
                    console.log("Photo unliked.");
                }
            } else {
                // Like the photo
                await addLike(photoId, currentUser, photoRef);
                console.log("Photo liked.");
            }

            // Refresh the like state dynamically
            userLikeSnapshot = await getDocs(userLikeQuery); // Re-fetch like state
            hasLiked = !userLikeSnapshot.empty; // Update the hasLiked state
            await updateLikeUI(photoId, currentUser, likeIcon, likesCountElement); // Refresh the UI
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };
}


async function addLike(photoId, currentUser, photoRef) {
    try {
        // Fetch photo data for the owner ID
        const photoDoc = await getDoc(photoRef);
        if (!photoDoc.exists()) {
            console.error("Photo not found!");
            alert("Photo not found!");
            return;
        }
        const photoData = photoDoc.data(); // Get photo data from Firestore

        // Add a new like to the Likes collection
        const likesRef = collection(db, "Likes");
        await addDoc(likesRef, {
            photoId: photoId,
            userId: currentUser.uid,
            timestamp: new Date().toISOString(), // Store the like timestamp
        });

        // Increment the like count in the Photos collection
        await updateDoc(photoRef, {
            likesCount: increment(1),
        });

        // Send a notification to the photo owner
        await sendNotification(
            photoData.userId,           // Receiver: Photo owner
            currentUser.uid,            // Sender: Current user
            "Like",                     // Category: Like
            photoId,                    // Photo ID

        );


        // Log the activity
        await logActivity(currentUser.uid, photoId, "liked_photo");

        console.log("Photo liked successfully.");
    } catch (error) {
        console.error("Error liking photo:", error);
    }
}

async function removeLike(photoId, currentUser, photoRef, likeDoc) {
    try {
        // Delete the like document from the Likes collection
        await deleteDoc(likeDoc.ref);

        // Decrement the like count in the Photos collection
        await updateDoc(photoRef, {
            likesCount: increment(-1),
        });

        // Delete the notification for this like
        await deleteNotification(currentUser.uid, photoId, "Like");

        // Log the remove like activity
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









//============== general popup to call for  different sections ======
function createViewImagePopup(content, title = "Popup", onCloseCallback = null) {
    // Check if a popup already exists to prevent duplicates
    let existingPopup = document.getElementById("view-image-popup");
    if (existingPopup) {
        existingPopup.remove(); // Clean up the previous popup if it exists
    }

    // Creating the popup overlay (background)
    const popupOverlay = document.createElement("div");
    popupOverlay.id = "view-image-popup"; // Assign a unique ID to the popup
    popupOverlay.style.position = "fixed"; // Keeps the popup overlay in a fixed position
    popupOverlay.style.top = "0"; // Aligns the top edge to the viewport
    popupOverlay.style.left = "0"; // Aligns the left edge to the viewport
    popupOverlay.style.width = "100%"; // Covers the entire viewport horizontally
    popupOverlay.style.height = "100%"; // Covers the entire viewport vertically
    popupOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)"; // Semi-transparent dark background for focus
    popupOverlay.style.zIndex = "1000"; // Ensures the popup is above other elements
    popupOverlay.style.display = "flex"; // Centers the popup content using flexbox
    popupOverlay.style.alignItems = "center"; // Vertically centers the content
    popupOverlay.style.justifyContent = "center"; // Horizontally centers the content

    // Prevent popup from closing when clicking inside the popup itself
    popupOverlay.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevents the click event from bubbling up to the overlay
    });

    // Creating the popup content container
    const popupContent = document.createElement("div");
    popupContent.style.backgroundColor = "#fff"; // White background for the popup
    popupContent.style.borderRadius = "10px"; // Rounded corners for a modern look
    popupContent.style.padding = "20px"; // Padding for content spacing
    popupContent.style.width = "90%"; // Responsive width for smaller screens
    popupContent.style.maxWidth = "500px"; // Limits the maximum width for larger screens
    popupContent.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.3)"; // Adds depth with shadow
    popupContent.style.position = "relative"; // Ensures close button is positioned relative to the content
    popupContent.style.textAlign = "center"; // Center-aligns all text inside the popup

    // Add title to the popup
    const popupTitle = document.createElement("h2");
    popupTitle.textContent = title; // Sets the title text
    popupTitle.style.marginTop = "0"; // Removes default margin for the title
    popupTitle.style.fontSize = "1.5rem"; // Adjusts font size for emphasis
    popupTitle.style.fontWeight = "600"; // Makes the title bold
    popupTitle.style.color = "#333"; // Darker text color for readability
    popupContent.appendChild(popupTitle); // Add the title to the popup content

    // Add the main content to the popup
    const popupBody = document.createElement("div");
    popupBody.innerHTML = content; // Injects the provided content as HTML
    popupBody.style.marginTop = "15px"; // Adds space between the title and the content
    popupBody.style.color = "#555"; // Subtle text color for body content
    popupBody.style.fontSize = "1rem"; // Standard font size for readability
    popupContent.appendChild(popupBody); // Add the body to the popup content

    // Create and style the close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close"; // Button label
    closeButton.style.position = "absolute"; // Positions the button inside the popup
    closeButton.style.top = "10px";  // Distance from the top of the popup
    closeButton.style.right = "10px"; // Distance from the right edge
    closeButton.style.backgroundColor = "#e74c3c"; // Red background for the close button
    closeButton.style.color = "#fff"; // White text color for contrast
    closeButton.style.border = "none"; // Removes default button border
    closeButton.style.borderRadius = "5px"; // Smooth corners
    closeButton.style.padding = "5px 10px"; // Adds padding for better appearance
    closeButton.style.cursor = "pointer"; // Changes cursor to pointer for interactivity
    closeButton.style.fontSize = "0.9rem"; // Slightly smaller font for the button text

    // Close button functionality
    closeButton.addEventListener("click", () => {
        popupOverlay.remove(); // Removes the popup from the DOM
        if (onCloseCallback) {
            onCloseCallback(); // Executes the callback if provided
        }
    });

    popupContent.appendChild(closeButton); // Add the close button to the popup content

    // Append the popup content to the overlay
    popupOverlay.appendChild(popupContent);

    // Append the overlay to the document body
    document.body.appendChild(popupOverlay);

    // Accessibility: Focus trap
    popupContent.tabIndex = -1; // Makes the popup content focusable
    popupContent.focus(); // Automatically focuses on the popup for accessibility
}



// Function to handle editing photo
function createEditPhotoPopup(photoId, currentCaption, currentHashtags) {
    // Generate the popup form with the current caption and hashtags pre-filled
    const popupContent = `
      <form id="edit-photo-form">

        <!-- Caption Input -->
        <label for="edit-caption">Caption:</label>
        <textarea 
        id="edit-caption" 
        style="width: 100%; height: 60px; margin-bottom: 10px;">
        ${currentCaption}</textarea>
        
        <!-- Hashtags Input -->
        <label for="edit-hashtags">Hashtags (comma-separated):</label>
        <input 
          type="text" 
          id="edit-hashtags" 
          style="width: 100%; margin-bottom: 20px;" 
          value="${currentHashtags.join(', ')}"
        />

        <!-- Save Button -->
        <button
         type="button" 
         id="save-edits-btn" 
         style="background-color: #4CAF50; color: #fff; border: none; border-radius: 5px; padding: 10px 20px; cursor: pointer;">
         Save</button>
      </form>
    `;

    // Creating and display the popup using the reusable createViewImagePopup function
    createViewImagePopup(popupContent, "Edit Photo");

    // Adding event listener to handle Save button click
    document.getElementById("save-edits-btn").addEventListener("click", async () => {
        // Retrieve the updated caption and hashtags from the form
        const newCaption = document.getElementById("edit-caption").value.trim(); // Remove unnecessary whitespace
        const newHashtags = document.getElementById("edit-hashtags").value
            .split(",") // Split input by commas
            .map(tag => tag.trim().toLowerCase()) // Normalize hashtags: trim whitespace and convert to lowercase
            .filter(tag => tag.length > 0); // Remove empty or invalid hashtags

        // Confirm the user's intention to save changes
        const confirmation = confirm("Are you sure you want to save these changes?");
        if (confirmation) {
            try {
                // Reference the photo document in Firestore
                const photoRef = doc(db, "Photos", photoId);

                // Fetch the photo document from Firestore
                const photoDoc = await getDoc(photoRef);

                // Check if the photo exists
                if (photoDoc.exists()) {
                    const photoData = photoDoc.data(); // Extract the photo data
                    const oldHashtags = photoData.hashtags || []; // Retrieve the current hashtags or default to an empty array



                    // Step 1: Update Firestore Photo document
                    await updateDoc(photoRef, {
                        caption: newCaption,
                        hashtags: newHashtags
                    });

                    // Step 2: Manage old hashtags (remove photo ID)
                    const hashtagsToRemove = oldHashtags.filter(tag => !newHashtags.includes(tag));
                    for (const hashtag of hashtagsToRemove) {
                        await removePhotoFromHashtagAlbum(photoId, hashtag);
                    }

                    // Step 3: Manage new hashtags (add photo ID)
                    const hashtagsToAdd = newHashtags.filter(tag => !oldHashtags.includes(tag));
                    for (const hashtag of hashtagsToAdd) {
                        await addPhotoToHashtagAlbum(photoId, hashtag);
                    }

                    // Determine hashtags to add (present in newHashtags but not in oldHashtags)

                    await processHashtags(hashtagsToAdd, photoId); // Increment the count for new hashtags

                    // Notify the user of success and close the popup
                    alert("Photo updated successfully!");
                    document.getElementById("view-image-popup").remove(); // Close popup


                    fetchPhotoData(photoId); // Refresh photo details on the page
                } else {
                    // If the photo doesn't exist, log an error and notify the user
                    console.error("Photo does not exist.");
                    alert("Photo not found.");
                }
            } catch (error) {
                // Handle any errors that occur during the update
                console.error("Error updating photo:", error);
                alert("Failed to update the photo. Please try again.");
            }
        }
    });
}


/**
 * Add the photo ID to a hashtag album. Create the album if it doesn't exist.
 */
async function addPhotoToHashtagAlbum(photoId, hashtag) {
    try {
        const albumsRef = collection(db, "Albums");
        const q = query(albumsRef, where("name", "==", hashtag));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // If album doesn't exist, create it
            await addDoc(albumsRef, {
                name: hashtag,
                photoIds: [photoId],
                public: true, // Public field for hashtag albums
                createdAt: new Date().toISOString(),
            });
            console.log(`Created new album for hashtag: ${hashtag}`);
        } else {
            // If album exists, update it by adding photoId
            const albumDoc = querySnapshot.docs[0];
            const albumRef = doc(db, "Albums", albumDoc.id);
            await updateDoc(albumRef, {
                photoIds: firebase.firestore.FieldValue.arrayUnion(photoId),
            });
            console.log(`Added photo ${photoId} to existing album: ${hashtag}`);
        }
    } catch (error) {
        console.error(`Error adding photo to hashtag album ${hashtag}:`, error);
    }
}

/**
 * Remove the photo ID from a hashtag album. Delete the album if no photos remain.
 */
async function removePhotoFromHashtagAlbum(photoId, hashtag) {
    try {
        const albumsRef = collection(db, "Albums");
        const q = query(albumsRef, where("name", "==", hashtag));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const albumDoc = querySnapshot.docs[0];
            const albumRef = doc(db, "Albums", albumDoc.id);
            const albumData = albumDoc.data();

            // Remove the photoId from the album
            const updatedPhotoIds = albumData.photoIds.filter(id => id !== photoId);

            if (updatedPhotoIds.length > 0) {
                // Update the album with the remaining photo IDs
                await updateDoc(albumRef, { photoIds: updatedPhotoIds });
                console.log(`Removed photo ${photoId} from album: ${hashtag}`);
            } else {
                // Delete the album if no photos remain
                await deleteDoc(albumRef);
                console.log(`Deleted album ${hashtag} as no photos remain.`);
            }
        }
    } catch (error) {
        console.error(`Error removing photo from hashtag album ${hashtag}:`, error);
    }
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
        // Reference to the "Hashtag" collection in Firestore
        const hashtagRef = collection(db, "Hashtag");

        // Query to find the document where the "hashtag" field matches the given hashtag
        const hashtagQuery = query(hashtagRef, where("hashtag", "==", hashtag));

        // Execute the query and get the matching documents
        const querySnapshot = await getDocs(hashtagQuery);

        // Iterate through the matching documents (should typically be only one)
        querySnapshot.forEach(async (docSnapshot) => {

            // Get the document reference for the specific hashtag
            const hashtagDocRef = doc(db, "Hashtag", docSnapshot.id);

            // Extract the data from the document
            const hashtagData = docSnapshot.data();

            // Check if the photoCount is greater than 1
            if (hashtagData.photoCount > 1) {

                // Decrement the photoCount field by 1
                await updateDoc(hashtagDocRef, { photoCount: increment(-1) });
                console.log(`Decremented photoCount for hashtag: ${hashtag}`);
            } else {
                // If photoCount is 1 or less, delete the hashtag document
                await deleteDoc(hashtagDocRef);
                console.log(`Deleted hashtag: ${hashtag} (no photos remaining)`);
            }
        });
    } catch (error) {
        // Log any errors encountered during the process
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
        // Reference to the photo document in the Photos collection
        const photoRef = doc(db, "Photos", photoId);
        const photoDoc = await getDoc(photoRef);

        // Ensure the photo exists
        if (!photoDoc.exists()) {
            console.error(`Photo with ID ${photoId} does not exist.`);
            alert("Photo not found. Please try again.");
            return;
        }

        console.log("Photo document fetched successfully.");

        // Extract photo data
        const photoData = photoDoc.data();
        console.log("Photo data:", photoData);

        // Reference to the VaultPhoto collection
        const vaultPhotoRef = doc(db, "VaultPhoto", photoId); // Target document in VaultPhoto collection
        console.log("Attempting to add photo to VaultPhoto collection...");

        // Copy the photo data to the VaultPhoto collection
        await setDoc(vaultPhotoRef, photoData);
        console.log("Photo added to VaultPhoto collection successfully.");

        // Delete the photo from the Photos collection
        await deleteDoc(photoRef);
        console.log("Photo deleted from Photos collection successfully.");

        // Notify the user of success
        alert("Photo moved to the vault successfully!");

        // Log the activity of moving the photo to the vault
        await logActivity(sessionStorage.getItem("userId"), photoId, "move_to_vault");

        // Redirect to the user dashboard
        window.location.href = "UserDashboard.html";
    } catch (error) {
        // Handle errors
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

        // Search functionality
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

        //event listener for the Create Album button
        document.getElementById("create-new-album-btn").addEventListener("click", () => {
            createNewAlbumPopup(photoId); // Pass photoId in case you want to add it immediately to the new album
        });

        // Add/Remove photo buttons functionality
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
                // Add report document to "Reports" collection
                await addDoc(collection(db, "Reports"), {
                    category: "Photo",
                    messageId: photoId,
                    reason: reason,
                    reportedBy: userId,
                    reportedAt: serverTimestamp(),
                    ownerId: photoOwnerId,
                    ownerUsername: photoOwnerUsername,
                    status: "Pending Review",
                });


                console.log("Report submitted successfully");

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
// Function to delete a comment
async function deleteComment(commentId) {
    try {
        console.log("Deleting comment with ID:", commentId); // Debug log to show the comment ID being deleted

        // Validate if the comment ID is provided
        if (!commentId) {
            throw new Error("Comment ID is missing."); // Throw an error if no comment ID is provided
        }

        // Get the photo ID associated with the comment from localStorage
        const photoId = localStorage.getItem("photoId");
        if (!photoId) {
            throw new Error("Photo ID is missing."); // Throw an error if no photo ID is found
        }

        // Reference the specific comment document in Firestore
        const commentRef = doc(db, "Comments", commentId);
        const commentDoc = await getDoc(commentRef);

        if (!commentDoc.exists()) {
            throw new Error("Comment not found.");
        }

        const commentData = commentDoc.data(); // Extract comment data

        await deleteDoc(commentRef); // Delete the comment from Firestore
        console.log("Comment deleted successfully!"); // Log success message

        // Reference the photo document in Firestore to update the comment count
        const photoRef = doc(db, "Photos", photoId);
        await updateDoc(photoRef, {
            commentsCount: increment(-1), // Decrement the `commentsCount` field by 1
        });
        console.log("Comments count decremented successfully!"); // Log success message for decrement

        // Delete the notification related to this comment
        await deleteNotification(commentData.userId, photoId, "Comment");

        // Log the delete action for tracking purposes
        await logActivity(sessionStorage.getItem("userId"), photoId, "deleted_comment");

        // Refresh the comments section to reflect the deletion
        fetchAndDisplayComments(photoId);

        // Notify the user of successful deletion
        alert("Comment deleted successfully!");
    } catch (error) {
        console.error("Error deleting comment:", error); // Log any errors encountered during the process
        alert("Failed to delete the comment. Please try again."); // Notify the user of the error
    }
}


// Function to report a comment
async function reportComment(commentId) {
    // Check if a valid comment ID is provided
    console.log("Received commentId:", commentId);
    if (!commentId) {
        console.error("Comment ID is missing."); // Log error for debugging
        alert("Cannot report comment. Please try again."); // Notify user
        return; // Exit the function
    }

    const photoId = localStorage.getItem("photoId"); // Fetch photoId from local storage
    console.log("Retrieved photoId:", photoId);
    if (!photoId) {
        console.error("Photo ID is missing.");
        alert("Cannot report the comment. Photo ID is missing.");
        return;
    }

    // Retrieve the current user's information from session storage
    const currentUser = JSON.parse(sessionStorage.getItem("user"));
    if (!currentUser || !currentUser.uid) {
        console.error("User is not logged in."); // Log error for debugging
        alert("Please log in to report comments."); // Notify user to log in
        return; // Exit the function
    }
    try {
        // Fetch the comment document from the "Comments" collection in Firestore
        console.log("Fetching comment data...");
        const commentRef = doc(db, "Comments", commentId);
        const commentDoc = await getDoc(commentRef);

        // Check if the comment exists in the database
        if (!commentDoc.exists()) {
            console.error("Comment not found."); // Log error if comment is missing
            alert("Comment not found. Please try again."); // Notify user
            return;  // Exit the function
        }

        console.log("Comment data fetched successfully.");

        // Extract the comment's data
        const commentData = commentDoc.data();
        const commentOwnerId = commentData.userId; // ID of the comment's creator
        const commentOwnerUsername = commentData.username || "Unknown User"; // Username of the comment's creator

        // Define the popup's HTML content for reporting the comment
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

        // Display the popup with the provided content
        createViewImagePopup(popupContent, "Report Comment");

        // Add an event listener to handle the form submission
        document.getElementById("report-comment-form").addEventListener("submit", async (e) => {
            console.log("Report form submitted"); // Debugging log to confirm event is firing
            e.preventDefault(); // Prevent the default form submission behavior

            const reason = document.getElementById("report-reason").value.trim(); // Retrieve the report reason

            // Check if the reason field is not empty
            if (!reason) {
                alert("Please provide a reason for reporting."); // Notify user
                return; // Exit the function
            }

            try {

                // Add a new report document to Firestore with the report details
                await addDoc(collection(db, "Reports"), {
                    category: "Comment", // The type of content being reported
                    messageId: commentId, // The ID of the reported comment
                    photoid: photoId,
                    reason: reason,  // Reason provided by the user
                    reportedBy: currentUser.uid, // ID of the user reporting the comment
                    reportedByUsername: currentUser.username || "Unknown User", // Username of the user reporting
                    reportedAt: serverTimestamp(), // Timestamp of when the report was submitted
                    commentOwnerId: commentOwnerId, // ID of the user who created the comment
                    ReboredUsername: commentOwnerUsername, // Username of the user who created the comment
                    status: "Pending Review", // Initial status of the report
                });

                console.log("Report successfully submitted to Firestore.");
                alert("Comment reported successfully."); // Notify user of success

                // Log the reporting action for analytics
                await logActivity(sessionStorage.getItem("userId"), photoId, "report_comment");


                document.getElementById("view-image-popup").remove(); // Close the popup after submission
            } catch (error) {
                console.error("Error reporting comment:", error); // Log error for debugging
                alert("Failed to report the comment. Please try again."); // Notify user of failure
            }
        });
    } catch (error) {
        console.error("Error fetching comment details:", error); // Log error if comment fetch fails
        alert("Failed to fetch the comment details. Please try again.");// Notify user of failure
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

    // Define the popup content
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

    // Create the popup using a reusable function
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

            // Send notification to the recipient
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
    const photoId = localStorage.getItem("photoId"); // Check if this is null/undefined

    try {
        // Validate hashtag and photoId
        if (!hashtag || !photoId) {
            console.error("Invalid hashtag or photoId:", { hashtag, photoId });
            return;
        }
        // Reference the "Hashtag" collection in Firestore
        const hashtagRef = collection(db, "Hashtag");
        const albumsRef = collection(db, "Albums");

        // Query to find the document where the "hashtag" field matches the provided hashtag
        const hashtagQuery = query(hashtagRef, where("hashtag", "==", hashtag));

        // Execute the query to fetch the matching documents
        const querySnapshot = await getDocs(hashtagQuery);

        if (!querySnapshot.empty) {
            // If hashtag exists, increment its photoCount
            querySnapshot.forEach(async (docSnapshot) => {
                const hashtagDocRef = doc(db, "Hashtag", docSnapshot.id); // Reference to the existing document
                await updateDoc(hashtagDocRef, { photoCount: increment(1) }); // Increment photoCount by 1
                console.log(`Hashtag '${hashtag}' exists. Incremented photoCount.`);
            });
        } else {
            // If the hashtag doesn't exist, create a new document with photoCount = 1
            await addDoc(hashtagRef, {
                hashtag: hashtag,
                photoCount: 1,
                photoIds: [photoId],
            });
            console.log(`Hashtag '${hashtag}' created with photoCount = 1.`);
        }


 // ======== Handle Albums Collection ========
 const albumQuery = query(albumsRef, where("name", "==", hashtag), where("category", "==", "Hashtag"));
 const albumSnapshot = await getDocs(albumQuery);

 if (!albumSnapshot.empty) {
     // Add the photo ID to the existing album
     const albumDoc = albumSnapshot.docs[0];
     await updateDoc(albumDoc.ref, {
         photoIds: arrayUnion(photoId),
     });
     console.log(`Photo '${photoId}' added to existing album '${hashtag}' in Albums collection.`);
 } else {
     // Create a new album for the hashtag
     await addDoc(albumsRef, {
        category: "Hashtag",
        name: hashtag,
        category: "Hashtag",
        photoIds: [photoId],
        createdAt: new Date().toISOString(),
        
    });
    
     console.log(`New album created for hashtag '${hashtag}' in Albums collection.`);
 }


    } catch (error) {
        // Log any errors that occur during the process
        console.error("Error handling hashtag:", error);
    }
}

/**
 * Function to process multiple hashtags:
 * 1. Removes duplicates.
 * 2. Calls `handleHashtag` for each unique hashtag.
 * @param {Array} hashtags - Array of hashtags to process.
 * @param {string} photoId - The ID of the uploaded photo.
 */

// Function to process multiple hashtags
async function processHashtags(hashtags, photoId) {

    // Remove duplicates by converting the array to a Set and back to an array
    const uniqueHashtags = [...new Set(hashtags)]; // Remove duplicates

    try {
        // Loop through each unique hashtag and process it
        for (const hashtag of uniqueHashtags) {
            await handleHashtag(hashtag); // Call handleHashtag for each tag
        }
    } catch (error) {
        // Log errors that occur while processing hashtags
        console.error("Error processing hashtags:", error);
    }
}



//=========== END of the hashtag section ===============



//================================= clicking the profile pic and username event ============================
/*handle redirection to the user's profile page when clicking the profile picture or username of the user who uploaded the photo
Attach click event listeners to the profile picture and username*/
function addProfileRedirection(userId) {
    // Get the HTML element for the user's profile picture
    const profilePicElement = document.getElementById("photo-user-profile-pic");

    // Get the HTML element for the user's username
    const usernameElement = document.getElementById("photo-username");

    // Check if the profile picture element exists
    if (profilePicElement) {
        profilePicElement.style.cursor = "pointer"; // Change cursor to indicate it's clickable

        // Add a click event listener to the profile picture
        profilePicElement.addEventListener("click", () => {
            redirectToProfile(userId); // Redirect to the user's profile when clicked
        });
    }

    // Check if the username element exists
    if (usernameElement) {
        usernameElement.style.cursor = "pointer"; // Change cursor to indicate it's clickable

        // Add a click event listener to the username
        usernameElement.addEventListener("click", () => {
            redirectToProfile(userId); // Redirect to the user's profile when clicked
        });
    }
}

// Redirect to Profile.html and store the user ID in localStorage
function redirectToProfile(userId) {
    // Check if userId is provided
    if (!userId) {
        console.error("User ID is missing. Cannot redirect to profile.");
        alert("Unable to fetch user details."); // Notify the user of the issue
        return; // Exit the function if userId is missing
    }

    // Store the userId in localStorage for retrieval on the profile page
    localStorage.setItem("viewedUserId", userId);

    // Redirect to the Profile.html page
    window.location.href = "Profile.html"; // Redirect to the profile page
}


