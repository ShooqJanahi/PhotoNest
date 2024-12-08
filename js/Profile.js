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
});






document.addEventListener('DOMContentLoaded', () => {
    // Ensure user authentication before displaying the page
    checkUserAuthentication();

   
    const logoutButton = document.querySelector('.login-btn'); // Ensure this matches the ID in your HTML

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout(); // Call the logout function from login.js
        });
    } else {
        console.error("Logout button not found in the DOM.");
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

            // Determine if the user is viewing their own profile
            const isOwnProfile = viewedUserId === loggedInUserId;

            // Fetch and display user profile and posts
            await loadUserProfile(viewedUserId, loggedInUserId, isOwnProfile);
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
    const existingControl = document.querySelector('.follow-btn, .edit-btn');
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
        controlButton.className = 'follow-btn';

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

// Check if the logged-in user is following the viewed user
async function checkIfFollowing(loggedInUserId, viewedUserId) {
    try {
        const followsDocRef = doc(db, 'Follows', loggedInUserId);
        const followsDoc = await getDoc(followsDocRef);

        if (followsDoc.exists() && followsDoc.data().following.includes(viewedUserId)) {
            return true;
        }
    } catch (error) {
        console.error('Error checking follow status:', error);
    }
    return false;
}

// Follow a user
async function followUser(loggedInUserId, viewedUserId) {
    try {
        const followsDocRef = doc(db, 'Follows', loggedInUserId);
        await updateDoc(followsDocRef, {
            following: arrayUnion(viewedUserId)
        });

        const followersDocRef = doc(db, 'Follows', viewedUserId);
        await updateDoc(followersDocRef, {
            followers: arrayUnion(loggedInUserId)
        });

        console.log(`User ${loggedInUserId} is now following ${viewedUserId}.`);
    } catch (error) {
        console.error('Error following user:', error);
    }
}

// Unfollow a user
async function unfollowUser(loggedInUserId, viewedUserId) {
    try {
        const followsDocRef = doc(db, 'Follows', loggedInUserId);
        await updateDoc(followsDocRef, {
            following: arrayRemove(viewedUserId)
        });

        const followersDocRef = doc(db, 'Follows', viewedUserId);
        await updateDoc(followersDocRef, {
            followers: arrayRemove(loggedInUserId)
        });

        console.log(`User ${loggedInUserId} has unfollowed ${viewedUserId}.`);
    } catch (error) {
        console.error('Error unfollowing user:', error);
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

// Block a user
async function blockUser(loggedInUserId, viewedUserId) {
    try {
        const blockDocRef = doc(db, 'Blocked', loggedInUserId);
        await updateDoc(blockDocRef, {
            blockedUsers: arrayUnion(viewedUserId)
        }).catch(async (err) => {
            if (err.code === 'not-found') {
                // If the document does not exist, create it
                await setDoc(blockDocRef, {
                    userId: loggedInUserId,
                    blockedUsers: [viewedUserId]
                });
            }
        });

        alert('User has been blocked.');
    } catch (error) {
        console.error('Error blocking user:', error);
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
