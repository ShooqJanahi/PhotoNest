console.log("Profile.js is loaded and executing.");

// Import Firebase modules
import { db, auth } from './firebaseConfig.js';
import { increment , doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { createNotificationPopup, openPopup } from './Notification.js';
import { logout } from './login.js';
import { setLogLevel } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

setLogLevel("debug");

const loggedInUserId = localStorage.getItem('loggedInUserId');
const viewedUserId = sessionStorage.getItem('userId')
const followingRef = doc(db, `users/${loggedInUserId}/following`, viewedUserId);
onSnapshot(followingRef, (doc) => {
    if (doc.exists()) {
        console.log('Follow data updated:', doc.data());
    } else {
        console.log('Follow data does not exist yet.');
    }
});





document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired!");
    // Select the bell icon
    const bellIcon = document.querySelector('.fa-bell');

    // Add a click event listener to the bell icon
    bellIcon.addEventListener('click', () => {
        // Create and open the notification popup
        const notificationPopup = createNotificationPopup();
        openPopup(notificationPopup);
    });

    // Ensure user authentication before displaying the page
    checkUserAuthentication();

   //logout button
    const logoutButton = document.querySelector('.login-btn'); // Ensure this matches the ID in your HTML

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout(); // Call the logout function from login.js
        });
    } else {
        console.error("Logout button not found in the DOM.");
    }

     // Hide options menu if logged-in user is the same as viewed user
     const loggedInUserId = sessionStorage.getItem("loggedInUserId"); // Get logged-in user ID from session storage
     const viewedUserId = localStorage.getItem("viewedUserId"); // Get viewed user ID from local storage
 
     if (!loggedInUserId || !viewedUserId) {
        console.error("User IDs are not defined. Please ensure they are set before loading the page.");
        alert("An error occurred. Please log in again.");
        return;
    }
    
      // Initialize the Follow/Unfollow button
    if (loggedInUserId && viewedUserId) {
        initializeFollowButton(viewedUserId, loggedInUserId);
    }
    const followButton = document.querySelector('.follow-menu-toggle');
    console.log("Follow Button:", followButton);
     const optionsMenuContainer = document.querySelector(".options-menu-container");
 
     if (loggedInUserId === viewedUserId && optionsMenuContainer) {
         optionsMenuContainer.style.display = "none"; // Hide the options menu
     }

    //report option button
    const reportUserButton = document.querySelector(".report-user");

    if (reportUserButton) {
        reportUserButton.addEventListener("click", () => {
            // Get reported user details
            const reportedUserId = localStorage.getItem("viewedUserId"); // User ID to report
            const reportedUsername = document.querySelector(".profile-section p:nth-of-type(1)").textContent; // Username from the profile page

            if (reportedUserId && reportedUsername) {
                // Open the report popup
                openReportUserPopup(reportedUserId, reportedUsername.replace('@', ''));
            } else {
                alert("Unable to fetch user details for reporting.");
            }
        });
    }

// Select the options button and menu
const optionsButton = document.querySelector('.options-menu-toggle');
const optionsMenu = document.querySelector('.options-menu');

// Add a click event listener to toggle the dropdown menu
optionsButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent the event from bubbling to the document
    optionsMenu.classList.toggle('hidden'); // Toggle the "hidden" class
});

// Close the dropdown when clicking anywhere outside the menu
document.addEventListener('click', (e) => {
    if (!optionsMenu.contains(e.target) && !optionsButton.contains(e.target)) {
        optionsMenu.classList.add('hidden'); // Add the "hidden" class to hide the dropdown
    }
});

console.log(document.querySelector('.follow-menu-toggle'));




//=================== popup elements =====================

   // Select popup elements
   const userPopupContainer = document.getElementById('user-popup-container');
   const userPopupTitle = document.getElementById('user-popup-title');
   const userPopupBody = document.querySelector('.user-popup-body');
   const closePopupBtn = document.getElementById('user-popup-close-btn');
   const actionPopupBtn = document.getElementById('user-popup-action-btn');

   /**
    * Open the user-specific popup
    * @param {string} title - Title of the popup
    * @param {string} contentHTML - Content to display in the popup
    * @param {function} [actionCallback] - Optional callback for the action button
    */
   function openUserPopup(title, contentHTML, actionCallback) {
       userPopupTitle.textContent = title; // Set the title
       userPopupBody.innerHTML = contentHTML; // Insert dynamic content

       if (actionCallback) {
           actionPopupBtn.style.display = 'inline-block';
           actionPopupBtn.onclick = actionCallback;
       } else {
           actionPopupBtn.style.display = 'none';
       }

       userPopupContainer.classList.add('show'); // Display the popup
   }

   /**
    * Close the user-specific popup
    */
   function closeUserPopup() {
       userPopupContainer.classList.remove('show');
   }

   // Attach event listeners
   closePopupBtn.addEventListener('click', closeUserPopup);
   userPopupContainer.addEventListener('click', (e) => {
       if (e.target === userPopupContainer) closeUserPopup();
   });

   // Expose the functions globally
   window.openUserPopup = openUserPopup;
   window.closeUserPopup = closeUserPopup;



//=================== END of popup elements =====================




});





// Check user authentication and fetch profile data
function checkUserAuthentication() {
    document.body.style.display = "none"; // Hide the page initially

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../html/Login.html';
        } else {
            sessionStorage.setItem("loggedInUserId", user.uid); // Ensure it's stored properly
            document.body.style.display = "block";
    
            const viewedUserId = localStorage.getItem('viewedUserId') || user.uid;
            await loadUserProfile(viewedUserId, user.uid);
            await loadUserPosts(viewedUserId);
        }
    });
    
}

// Load user profile information
async function loadUserProfile(viewedUserId, loggedInUserId, isOwnProfile) {
    try {
        const userDocRef = doc(db, 'users', viewedUserId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Update profile section
            document.querySelector('.profile-section img').src = userData.profilePic || '../assets/Default_profile_icon.jpg';
            document.querySelector('.profile-section h2').textContent = `${userData.firstName || ''} ${userData.lastName || ''}`;
            document.querySelector('.profile-section p:nth-of-type(1)').textContent = `@${userData.username || 'unknown'}`;
            document.querySelector('.profile-section p:nth-of-type(2)').textContent = userData.bio || 'No bio available.';
            document.querySelector('.profile-section a').textContent = userData.link || 'No link available';

            // Update stats
            document.querySelector('.stats div:nth-of-type(1)').innerHTML = `Posts<br>${userData.postsCount || 0}`;
            document.querySelector('.stats div:nth-of-type(2)').innerHTML = `Followers<br>${userData.followersCount || 0}`;
            document.querySelector('.stats div:nth-of-type(3)').innerHTML = `Following<br>${userData.followingCount || 0}`;

            const isOwnProfile = viewedUserId === loggedInUserId;
            adjustProfileControls(viewedUserId, loggedInUserId, isOwnProfile);
        } else {
            console.error('User document not found.');
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

// Adjust profile controls (Edit Profile or Follow/Unfollow and Dropdown Menu)
async function adjustProfileControls(viewedUserId, loggedInUserId, isOwnProfile) {
    const profileSection = document.querySelector('.profile-section');
 // Check and remove existing controls
 const existingControl = profileSection.querySelector('.follow-menu-toggle, .edit-btn');
    if (existingControl) existingControl.remove(); // Remove existing button to prevent duplication

    if (isOwnProfile) {
        // Add Edit Profile button
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = 'Edit Profile';
        editButton.addEventListener('click', () => {
            // Redirect to Settings.html with query parameter
            window.location.href = "Settings.html?edit=true";
        });
        profileSection.appendChild(editButton);

        // Hide any Follow/Unfollow buttons if they exist
        const followButton = profileSection.querySelector('.follow-menu-toggle');
        if (followButton) followButton.style.display = 'none';
    } else {
        // Add Follow/Unfollow button for other users
        const followButtonExists = profileSection.querySelector('.follow-menu-toggle');
        if (!followButtonExists) {
            const controlButton = document.createElement('button');
            controlButton.className = 'follow-menu-toggle';
 
             const isFollowing = await checkIfFollowing(loggedInUserId, viewedUserId);
 
             controlButton.textContent = isFollowing ? 'Unfollow' : 'Follow';
             controlButton.addEventListener('click', async () => {
                 if (isFollowing) {
                     await unfollowUser(loggedInUserId, viewedUserId);
                     controlButton.textContent = 'Follow';
                 } else {
                     await followUser(loggedInUserId, viewedUserId);
                     controlButton.textContent = 'Unfollow';
                 }
        });

        profileSection.appendChild(controlButton);

        // Add options menu for Report/Block
        const optionsMenu = document.createElement('div');
        optionsMenu.className = 'options-menu';

        optionsMenu.innerHTML = `
            <i class="fas fa-ellipsis-v options-icon"></i>
            <div class="dropdown hidden">
                <button class="dropdown-report">Report</button>
                <button class="dropdown-block">Block</button>
            </div>
        `;

        profileSection.appendChild(optionsMenu);

        const optionsIcon = optionsMenu.querySelector('.options-icon');
        const dropdownMenu = optionsMenu.querySelector('.dropdown');

        optionsIcon.addEventListener('click', () => {
            dropdownMenu.classList.toggle('hidden');
        });

        optionsMenu.querySelector('.dropdown-report').addEventListener('click', () => {
            reportUser(viewedUserId);
        });

        optionsMenu.querySelector('.dropdown-block').addEventListener('click', () => {
            blockUser(loggedInUserId, viewedUserId);
        });
    }
}

}



// Report a user
function reportUser(viewedUserId) {
    const reason = prompt('Please provide a reason for reporting this user:');
    if (reason) {
        setDoc(doc(collection(db, 'Reports')), {
            reportedUserId: viewedUserId,
            reason,
            timestamp: new Date().toISOString()
        }).then(() => {
            alert('User has been reported.');
        }).catch((error) => {
            console.error('Error reporting user:', error);
        });
    }
}

// Load user posts without captions
async function loadUserPosts(userId) {
    try {
        const photosQuery = query(
            collection(db, 'Photos'),
            where('userId', '==', userId)
        );
        const photosSnapshot = await getDocs(photosQuery);

        const gallery = document.querySelector('.gallery');
        gallery.innerHTML = ''; // Clear existing posts

        if (photosSnapshot.empty) {
            gallery.innerHTML = '<p>No posts available.</p>';
            return;
        }

        photosSnapshot.forEach((doc) => {
            const photoData = doc.data();
            const photoId = doc.id; // Get the unique photo ID

            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.innerHTML = `
                <img src="${photoData.imageUrl}" alt="User photo">
                <div class="info">
                    <span>${photoData.likesCount || 0} likes</span>
                    <span>${photoData.commentsCount || 0} comments</span>
                </div>
            `;


             // Add click event to redirect to ViewImage.html
             galleryItem.addEventListener('click', () => {
                localStorage.setItem('photoId', photoId); // Save photoId in localStorage
                window.location.href = '../html/ViewImage.html'; // Redirect to ViewImage.html
            });

            gallery.appendChild(galleryItem);
        });
    } catch (error) {
        console.error('Error loading user posts:', error);
    }
}



//===================== Block users section =================
// Function to block a user and add to blockedUsers subcollection
async function blockUser() {
    try {
        // Get the currently logged-in user's ID
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("You need to log in to perform this action.");
            return;
        }

        const currentUserId = currentUser.uid;

        // Get the viewed user's ID from localStorage
        const blockedUserId = localStorage.getItem('viewedUserId');
        if (!blockedUserId) {
            console.error("No viewed user ID found in localStorage.");
            return;
        }

        // Show confirmation dialog
        const confirmation = confirm("Are you sure you want to block this user?");
        if (!confirmation) {
            return; // Exit if the user cancels
        }

        // References for users and collections
        const loggedInUserFollowingRef = doc(db, `users/${currentUserId}/following`, blockedUserId);
        const viewedUserFollowersRef = doc(db, `users/${blockedUserId}/followers`, currentUserId);
        const loggedInUserDoc = doc(db, `users/${currentUserId}`);
        const viewedUserDoc = doc(db, `users/${blockedUserId}`);
        const blockedUserRef = doc(db, `users/${currentUserId}/blockedUsers`, blockedUserId); // Subcollection for blocked users

        // Remove the viewed user from the logged-in user's following list
        const loggedInUserFollowingSnapshot = await getDoc(loggedInUserFollowingRef);
        if (loggedInUserFollowingSnapshot.exists()) {
            await deleteDoc(loggedInUserFollowingRef); // Remove from the following subcollection
            await updateDoc(loggedInUserDoc, {
                followingCount: increment(-1), // Decrement following count
            });
            console.log(`Removed ${blockedUserId} from ${currentUserId}'s following list.`);
        }

        // Remove the logged-in user from the viewed user's followers list
        const viewedUserFollowersSnapshot = await getDoc(viewedUserFollowersRef);
        if (viewedUserFollowersSnapshot.exists()) {
            await deleteDoc(viewedUserFollowersRef); // Remove from the followers subcollection
            await updateDoc(viewedUserDoc, {
                followersCount: increment(-1), // Decrement followers count
            });
            console.log(`Removed ${currentUserId} from ${blockedUserId}'s followers list.`);
        }

        // Add the blocked user to the logged-in user's `blockedUsers` subcollection
        await setDoc(blockedUserRef, {
            userId: blockedUserId,
            blockedAt: new Date().toISOString(), // Date the user was blocked
        });

        console.log(`User ${blockedUserId} added to ${currentUserId}'s blockedUsers subcollection.`);

        alert("User has been blocked successfully.");

        // Redirect to the dashboard after successful block
        window.location.href = "UserDashboard.html";
    } catch (error) {
        console.error("Error blocking user:", error);
        alert("An error occurred while blocking the user. Please try again.");
    }
}


// Event listener for the "Block User" button
const blockUserButton = document.querySelector(".block-user");
if (blockUserButton) {
    blockUserButton.addEventListener("click", blockUser);
} else {
    console.error("Block User button not found.");
}

//===================== END of Block users section =================



//============================== Report user option ===========================
/**
 * Function to open the "Report User" popup
 * @param {string} reportedUserId - The ID of the user being reported
 * @param {string} reportedUsername - The username of the user being reported
 */
function openReportUserPopup(reportedUserId, reportedUsername) {
    // Define the content of the popup
    const contentHTML = `
        <form id="report-user-form">
            <label for="report-reason">Reason for reporting:</label>
            <textarea id="report-reason" rows="4" placeholder="Enter the reason for reporting..." required></textarea>
        </form>
    `;

    // Define the action for the "Submit" button
    const submitReport = async () => {
        const reason = document.getElementById("report-reason").value.trim();

        if (!reason) {
            alert("Please provide a reason for reporting.");
            return;
        }

        try {
            // Prepare data for Firestore
            const reportData = {
                category: "user", // Default category
                reportedUserId: reportedUserId, // ID of the viewed user
                reportedUsername: reportedUsername, // Username of the viewed user
                reason: reason, // User-entered reason for reporting
                reportedBy: auth.currentUser.uid, // ID of the logged-in user
                status: "Pending Review", // Default status
                timestamp: new Date().toISOString(), // Timestamp of the report
            };

            // Save the report to Firestore under the "Reports" collection
            await setDoc(doc(collection(db, "Reports")), reportData);

            alert("User report submitted successfully.");
            closeUserPopup(); // Close the popup after submitting the report
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("An error occurred while submitting the report.");
        }
    };

    // Open the popup with the title, content, and action callback
    openUserPopup("Report User", contentHTML, submitReport);
}

// Attach event listener to the "Report User" button
document.querySelector('.report-user').addEventListener('click', () => {
    const reportedUserId = localStorage.getItem('viewedUserId'); // ID of the viewed user
    const reportedUsername = document.querySelector('.profile-section p:nth-of-type(1)').textContent; // Username of the viewed user

    if (reportedUserId && reportedUsername) {
        openReportUserPopup(reportedUserId, reportedUsername.replace('@', ''));
    } else {
        alert("Unable to fetch user details for reporting.");
    }
});



//============================== END of Report user option ===========================


//============================= Follow/unfollow button ==========================


// Initialize Follow/Unfollow Button
async function initializeFollowButton(viewedUserId, loggedInUserId) {
    console.log("Initializing follow button...");

    const followBtn = document.querySelector('.follow-menu-toggle');
    if (!followBtn) {
        console.error('Follow button not found in the DOM.');
        return;
    }

    if (!loggedInUserId || !viewedUserId) {
        console.error("User IDs are not defined. Cannot initialize follow button.");
        return;
    }

    try {
        // Fetch the initial follow status
        let isFollowing = await checkIfFollowing(loggedInUserId, viewedUserId);
        updateFollowButtonText(followBtn, isFollowing);

        followBtn.addEventListener('click', async () => {
            try {
                if (isFollowing) {
                    await unfollowUser(loggedInUserId, viewedUserId);
                } else {
                    await followUser(loggedInUserId, viewedUserId);
                }

                // Recheck follow status after the action
                isFollowing = await checkIfFollowing(loggedInUserId, viewedUserId);
                updateFollowButtonText(followBtn, isFollowing);
            } catch (error) {
                console.error("Error toggling follow/unfollow:", error);
            }
        });
    } catch (error) {
        console.error("Error initializing follow button:", error);
    }
}





// Update button text
function updateFollowButtonText(button, isFollowing) {
    if (button) {
        button.textContent = isFollowing ? 'Unfollow' : 'Follow';
    } else {
        console.error('Button is not defined.');
    }
}


// Check if logged-in user is following the viewed user
async function checkIfFollowing(loggedInUserId, viewedUserId) {
    try {
        console.log(`Checking follow status: ${loggedInUserId} -> ${viewedUserId}`);
        const followDoc = await getDoc(doc(db, `users/${loggedInUserId}/following`, viewedUserId));
        console.log(`Follow document exists: ${followDoc.exists()}`);
        return followDoc.exists();
    } catch (error) {
        console.error("Error checking follow status:", error);
        return false;
    }
}


// Follow a user
async function followUser(loggedInUserId, viewedUserId) {
    try {
        console.log(`Following User: ${viewedUserId}, By: ${loggedInUserId}`);

        // References
        const followingRef = doc(db, `users/${loggedInUserId}/following`, viewedUserId);
        const followersRef = doc(db, `users/${viewedUserId}/followers`, loggedInUserId);
        const viewedUserDoc = doc(db, `users/${viewedUserId}`);
        const loggedInUserDoc = doc(db, `users/${loggedInUserId}`);

        // Check if the logged-in user is already following the viewed user
        const followDoc = await getDoc(followingRef);
        if (followDoc.exists()) {
            console.warn("User is already following this profile.");
            return; // Exit the function to prevent duplicate follow actions
        }

        // Add to 'following' subcollection of logged-in user
        await setDoc(followingRef, {
            followedAt: new Date().toISOString(),
            userId: viewedUserId,
        });

        // Add to 'followers' subcollection of viewed user
        await setDoc(followersRef, {
            followedAt: new Date().toISOString(),
            userId: loggedInUserId,
        });

        // Increment 'followingCount' for logged-in user
        await updateDoc(loggedInUserDoc, {
            followingCount: increment(1),
        });

        // Increment 'followersCount' for viewed user
        await updateDoc(viewedUserDoc, {
            followersCount: increment(1),
        });

        console.log(`Follow operation successful. User ${viewedUserId} added to ${loggedInUserId}'s following.`);

        // Refresh the followers count in the UI
        await refreshFollowersCount(viewedUserId);
    } catch (error) {
        console.error("Error during follow operation:", error);
    }
}








// Unfollow a user
async function unfollowUser(loggedInUserId, viewedUserId) {
    try {
        console.log(`Unfollowing User: ${viewedUserId}, By: ${loggedInUserId}`);

        // References
        const followingRef = doc(db, `users/${loggedInUserId}/following`, viewedUserId);
        const followersRef = doc(db, `users/${viewedUserId}/followers`, loggedInUserId);
        const viewedUserDoc = doc(db, `users/${viewedUserId}`);
        const loggedInUserDoc = doc(db, `users/${loggedInUserId}`);

        // Check if the logged-in user is following the viewed user
        const followDoc = await getDoc(followingRef);
        if (!followDoc.exists()) {
            console.warn("User is not currently following this profile.");
            return; // Exit the function to prevent unnecessary unfollow actions
        }

        // Remove from 'following' subcollection of logged-in user
        await deleteDoc(followingRef);

        // Remove from 'followers' subcollection of viewed user
        await deleteDoc(followersRef);

        // Decrement 'followingCount' for logged-in user
        await updateDoc(loggedInUserDoc, {
            followingCount: increment(-1),
        });

        // Decrement 'followersCount' for viewed user
        await updateDoc(viewedUserDoc, {
            followersCount: increment(-1),
        });

        console.log(`Unfollow operation successful. User ${viewedUserId} removed from ${loggedInUserId}'s following.`);

        // Refresh the followers count in the UI
        await refreshFollowersCount(viewedUserId);
    } catch (error) {
        console.error("Error during unfollow operation:", error);
    }
}


async function refreshFollowersCount(viewedUserId) {
    try {
        console.log("Refreshing followers count...");

        const viewedUserDoc = await getDoc(doc(db, `users/${viewedUserId}`));
        if (viewedUserDoc.exists()) {
            const userData = viewedUserDoc.data();
            const followersElement = document.querySelector('.stats div:nth-of-type(2)');
            if (followersElement) {
                followersElement.innerHTML = `Followers<br>${userData.followersCount || 0}`;
            }
        } else {
            console.error("Viewed user document not found.");
        }
    } catch (error) {
        console.error("Error refreshing followers count:", error);
    }
}

