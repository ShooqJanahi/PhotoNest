// Import Firebase modules
import { db, auth } from './firebaseConfig.js';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { createNotificationPopup, openPopup } from './Notification.js';
import { logout } from './login.js';

document.addEventListener('DOMContentLoaded', () => {
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





});

// Check user authentication and fetch profile data
function checkUserAuthentication() {
    document.body.style.display = "none"; // Hide the page initially

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../html/Login.html'; // Redirect if not logged in
        } else {
            document.body.style.display = "block"; // Show the page content
            const loggedInUserId = user.uid;

            const viewedUserId = localStorage.getItem('viewedUserId') || loggedInUserId; // Get the profile to view

       // Fetch and display user profile and posts
       await loadUserProfile(viewedUserId, loggedInUserId);
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
            // Adjust profile controls (Edit or Follow/Unfollow)
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
    const existingControl = document.querySelector('.follow-menu-toggle, .edit-btn');
    if (existingControl) existingControl.remove(); // Remove existing button to prevent duplication

    if (isOwnProfile) {
        // Add Edit Profile button
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = 'Edit Profile';
        editButton.addEventListener('click', () => {
            alert('Redirect to Edit Profile Page (Implementation needed)');
        });
        profileSection.appendChild(editButton);
    } else {
        // Add Follow/Unfollow button
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
// Function to block a user
// Function to block a user
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

        // Reference to the BlockedUsers collection for the current user
        const blockedUsersRef = doc(db, "BlockedUsers", currentUserId);

        // Fetch the current blocked users document
        const blockedUsersDoc = await getDoc(blockedUsersRef);

        if (!blockedUsersDoc.exists()) {
            // Create a new document if it doesn't exist
            await setDoc(blockedUsersRef, {
                blockedUsers: [blockedUserId], // Add the first blocked user
                userId: currentUserId, // The user who is blocking
                createdAt: new Date().toISOString(), // Timestamp of when the block was created
            });
            console.log(`BlockedUsers document created for user ${currentUserId} with blocked user ${blockedUserId}`);
        } else {
            // Update the document to include the newly blocked user
            await updateDoc(blockedUsersRef, {
                blockedUsers: arrayUnion(blockedUserId), // Add the blocked user's ID to the array
                updatedAt: new Date().toISOString(), // Update the timestamp
            });
            console.log(`BlockedUsers document updated for user ${currentUserId}. User ${blockedUserId} added.`);
        }

        // Optionally: Save the updated blocked list in localStorage (for client-side access)
        const blockedUsers = JSON.parse(localStorage.getItem('blockedUsers')) || [];
        if (!blockedUsers.includes(blockedUserId)) {
            blockedUsers.push(blockedUserId);
            localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
        }

        alert("User has been blocked successfully.");
        // Redirect to UserDashboard.html after successful block
        window.location.href = "UserDashboard.html";
    } catch (error) {
        console.error("Error blocking user:", error);
        alert("An error occurred while blocking the user. Please try again.");
    }
}


// Event listener for the "Block User" button
document.querySelector(".block-user").addEventListener("click", blockUser);

//===================== END of Block users section =================


//================== reusable popup layout for different sections ============
// Select popup elements
const popupContainer = document.getElementById("popup-container");
const popupTitle = document.getElementById("popup-title");
const popupBody = document.querySelector(".popup-body");
const closePopupBtn = document.getElementById("close-popup-btn");
const actionBtn = document.getElementById("popup-action-btn");

// Function to open the popup with dynamic content
function openProfilePopup(title, contentHTML, actionCallback) {
    popupTitle.textContent = title; // Set the popup title
    popupBody.innerHTML = contentHTML; // Set the dynamic content

    // Add click event for the action button (if callback is provided)
    if (actionCallback) {
        actionBtn.onclick = actionCallback;
        actionBtn.style.display = "inline-block";
    } else {
        actionBtn.style.display = "none";
    }

    popupContainer.classList.add("show"); // Show the popup
}

// Function to close the popup
function closePopup() {
    popupContainer.classList.remove("show");
}

// Event listeners for closing the popup
closePopupBtn.addEventListener("click", closePopup);
popupContainer.addEventListener("click", (e) => {
    if (e.target === popupContainer) closePopup();
});



//================== reusable popup layout for different sections ============

//============================== Report user option ===========================
// Function to open the "Report User" popup
function openReportUserPopup(reportedUserId, reportedUsername) {
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
                category: "User", // Default category
                reportedUserId: reportedUserId,
                reportedUsername: reportedUsername,
                reason: reason,
                reportedBy: auth.currentUser.uid, // Current logged-in user's ID
                reportedAt: new Date().toISOString(),
                status: "Pending Review", // Default status
            };

            // Add report to Firestore
            await setDoc(doc(collection(db, "Reports")), reportData);

            alert("User report submitted successfully.");
            closePopup(); // Close the popup after submitting the report
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("An error occurred while submitting the report.");
        }
    };

    // Open the popup with content and the action button callback
    openProfilePopup("Report User", contentHTML, submitReport);
}


//============================== END of Report user option ===========================


//============================= Follow/unfollow button ==========================

// Function to initialize Follow/Unfollow button logic
async function initializeFollowButton(viewedUserId, loggedInUserId) {
    try {
        // Select the follow button
        const followBtn = document.getElementById("follow-btn");
        if (!followBtn) {
            console.error("Follow button not found in the DOM.");
            return;
        }

        // Fetch the current follow status
        const isFollowing = await checkIfFollowing(loggedInUserId, viewedUserId);

        // Update the button UI based on follow status
        updateFollowButtonUI(followBtn, isFollowing);

        // Add click event listener to the button
        followBtn.onclick = async () => {
            if (isFollowing) {
                // Unfollow logic
                await unfollowUser(loggedInUserId, viewedUserId);
                updateFollowButtonUI(followBtn, false); // Change to "Follow"
            } else {
                // Follow logic
                await followUser(loggedInUserId, viewedUserId);
                updateFollowButtonUI(followBtn, true); // Change to "Unfollow"
            }
        };
    } catch (error) {
        console.error("Error initializing Follow button:", error);
    }
}

// Function to update Follow/Unfollow button UI
function updateFollowButtonUI(button, isFollowing) {
    if (isFollowing) {
        button.textContent = "Unfollow";
        button.classList.add("unfollow");
    } else {
        button.textContent = "Follow";
        button.classList.remove("unfollow");
    }
}

// Function to check if the logged-in user is following the viewed user
async function checkIfFollowing(loggedInUserId, viewedUserId) {
    try {
        const followsDocRef = doc(db, "Follows", loggedInUserId);
        const followsDoc = await getDoc(followsDocRef);
        return followsDoc.exists() && followsDoc.data().following.includes(viewedUserId);
    } catch (error) {
        console.error("Error checking follow status:", error);
        return false;
    }
}

// Function to follow a user
async function followUser(loggedInUserId, viewedUserId) {
    try {
        const followsDocRef = doc(db, "Follows", loggedInUserId);
        await updateDoc(followsDocRef, {
            following: arrayUnion(viewedUserId),
        });

        const followersDocRef = doc(db, "Follows", viewedUserId);
        await updateDoc(followersDocRef, {
            followers: arrayUnion(loggedInUserId),
        });

        console.log(`User ${loggedInUserId} is now following ${viewedUserId}`);
    } catch (error) {
        console.error("Error following user:", error);
    }
}

// Function to unfollow a user
async function unfollowUser(loggedInUserId, viewedUserId) {
    try {
        const followsDocRef = doc(db, "Follows", loggedInUserId);
        await updateDoc(followsDocRef, {
            following: arrayRemove(viewedUserId),
        });

        const followersDocRef = doc(db, "Follows", viewedUserId);
        await updateDoc(followersDocRef, {
            followers: arrayRemove(loggedInUserId),
        });

        console.log(`User ${loggedInUserId} has unfollowed ${viewedUserId}`);
    } catch (error) {
        console.error("Error unfollowing user:", error);
    }
}















//============================= END of Follow/unfollow button ==========================
