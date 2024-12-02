//UserDashboard.js

// Import Firebase services
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc, deleteDoc, increment  } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { db } from './firebaseConfig.js';

// Firebase Authentication
const auth = getAuth();

document.addEventListener('DOMContentLoaded', async function () {

    const photoContainer = document.querySelector('.feeds'); // Assuming '.feeds' contains photo elements

    // Event listener for photo clicks
    photoContainer.addEventListener('click', (event) => {
        const photoElement = event.target.closest('.feed'); // Get the closest photo container element

        if (photoElement) {
            const photoId = photoElement.getAttribute('data-photo-id');
            const photoUrl = photoElement.querySelector('.photo img').src;
            const caption = photoElement.querySelector('.caption p').textContent;
            const location = photoElement.querySelector('.info small').textContent;
            const ownerId = photoElement.getAttribute('data-owner-id');

            // Store photo details in localStorage
            localStorage.setItem('photoId', photoId);
            localStorage.setItem('photoUrl', photoUrl);
            localStorage.setItem('caption', caption);
            localStorage.setItem('location', location);
            localStorage.setItem('ownerId', ownerId);

            // Redirect to ViewImage.html
            window.location.href = 'ViewImage.html';

        }
    });


    // Ensure user authentication is verified first
    await checkUserAuthentication();

    // Get the hash value (e.g., #explore or #home) and navigate
    const currentHash = window.location.hash || '#home';
    navigateToSection(currentHash);

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash;
        navigateToSection(newHash);
    });

    // Initialize the rest of the page
    setupPage();
});

async function checkUserAuthentication() {
    document.body.style.display = "none"; // Hide the page content initially

    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                redirectToLogin(); // Redirect to login if not authenticated
            } else {
                const userRole = sessionStorage.getItem("role");

                if (userRole !== "user") {
                    redirectToLogin(); // Redirect if the role is not 'user'
                } else {
                    document.body.style.display = "block"; // Show the page content
                    console.log("Access granted for user with role:", userRole);

                    await setUserProfilePic(); // Set user's profile picture
                    resolve(); // Resolve the promise after authentication
                }
            }
        });
    });
}

function navigateToSection(hash) {
    const feedsContainer = document.querySelector('.feeds');
    if (!feedsContainer) return;

    if (!auth.currentUser) {
        console.error("User is not authenticated. Cannot navigate to section.");
        return; // Prevent navigation if no user is authenticated
    }

    feedsContainer.innerHTML = ''; // Clear the container
    updateActiveMenu(hash); // Highlight the correct menu item

    if (hash === '#home') {
        fetchPhotos(true); // Load "Home" content
    } else if (hash === '#explore') {
        fetchPhotos(false); // Load "Explore" content
    } else {
        console.warn(`Unknown hash: ${hash}, defaulting to Home.`);
        window.location.hash = '#home'; // Redirect to Home by default
        fetchPhotos(true);
    }
}

function redirectToLogin() {
    window.location.href = '../html/Login.html'; // Redirect to the login page
}




function updateActiveMenu(hash) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach((item) => item.classList.remove('active'));

    const menuItem = document.querySelector(`a[href="UserDashboard.html${hash}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    } else {
        console.warn(`Menu item for ${hash} not found.`);
    }
}





async function setupPage() {

    const searchForm = document.querySelector('.create-post');
    const sortDropdown = document.getElementById('sort-options');

    // Handle form submission (search and sort)
    if (searchForm) {
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const searchInput = document.getElementById('search').value.trim().toLowerCase();
            const sortOption = sortDropdown.value;
            filterAndSortPosts(searchInput, sortOption);
        });
    }

    // Handle sort dropdown change
    if (sortDropdown) {
        sortDropdown.addEventListener('change', () => {
            const searchInput = document.getElementById('search').value.trim().toLowerCase();
            const sortOption = sortDropdown.value;
            filterAndSortPosts(searchInput, sortOption);
        });
    }
    

    const homeMenuItem = document.querySelector('.menu-item.home');
    const exploreMenuItem = document.querySelector('.menu-item.explore');


    // Wait for the authentication process to complete
    await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                resolve(); // Resolve the promise when user is authenticated
                unsubscribe(); // Unsubscribe from the auth listener
            }
        });
    });


    // Event listeners for menu items
    if (homeMenuItem) {
        homeMenuItem.addEventListener('click', () => fetchPhotos(true));
    }
    if (exploreMenuItem) {
        exploreMenuItem.addEventListener('click', () => fetchPhotos(false));
    }

    // Like/Unlike event listener
    document.addEventListener('click', async (event) => {

        const feedElement = event.target.closest('.feed'); // Check if the clicked element is part of the feed
        if (feedElement) {
            const photoId = feedElement.getAttribute('data-photo-id');
            const photoUrl = feedElement.querySelector('.photo img').src;
            const caption = feedElement.querySelector('.caption p').textContent;
            const location = feedElement.querySelector('.info small').textContent;
            const ownerId = feedElement.getAttribute('data-owner-id');
    
            // Store clicked photo details in localStorage
            localStorage.setItem('photoId', photoId);
            localStorage.setItem('photoUrl', photoUrl);
            localStorage.setItem('caption', caption);
            localStorage.setItem('location', location);
            localStorage.setItem('ownerId', ownerId);
    
            // Redirect to ViewImage.html
            window.location.href = 'ViewImage.html';
        }
        
        if (event.target.classList.contains('uil-heart')) {
            const photoElement = event.target.closest('.feed');
            if (!photoElement) {
                console.error("Photo element not found.");
                return;
            }
    
            const photoId = photoElement.getAttribute('data-photo-id');
            const ownerId = photoElement.getAttribute('data-owner-id');
    
            if (!photoId || !ownerId) {
                console.error("Missing photoId or ownerId:", { photoId, ownerId });
                return;
            }
    
            const liked = !event.target.classList.contains('liked'); // Toggle like status
            await toggleLike(photoId, ownerId, liked); // Handle like/unlike logic
            event.target.classList.toggle('liked'); // Update UI state
        }
    });
    

    // Initially load the 'Home' feed and sort by latest
    await fetchPhotos(true);
    sortDropdown.value = 'latest'; // Default to 'latest'
    filterAndSortPosts('', 'latest'); // Sort by latest initially
}



async function setUserProfilePic() {
    const currentUserId = auth.currentUser.uid; // Get the current user's ID
    const userRef = doc(db, 'users', currentUserId); // Reference to the user document
    const userDoc = await getDoc(userRef); // Fetch the user document

    // Profile elements
            // Update Sidebar Profile Image
            const sidebarProfileImage = document.getElementById('sidebar-profile-image');
    
            // Update Top Navigation Profile Image
            const topNavProfileImage = document.getElementById('topnav-profile-image');

    const profileNameElement = document.getElementById('profile-name'); // Sidebar profile name
    const profileUsernameElement = document.getElementById('profile-username'); // Sidebar profile username


    if (userDoc.exists()) {
        const userData = userDoc.data();

        if (sidebarProfileImage) {
            sidebarProfileImage.src = userData.profilePic || '../assets/Default_profile_icon.jpg';
        }

        if (topNavProfileImage) {
            topNavProfileImage.src = userData.profilePic || '../assets/Default_profile_icon.jpg';
        }

        console.log('Profile loaded successfully:', userData);

        // Set profile name and username
        profileNameElement.textContent = userData.firstName + ' ' + userData.lastName;
        profileUsernameElement.textContent = `@${userData.username || 'Anonymous'}`;
    } else {
        console.error('User document not found');
        profileNameElement.textContent = 'Unknown User';
        profileUsernameElement.textContent = '@unknown';
        profilePicElement.src = '../assets/Default_profile_icon.jpg'; // Fallback default image
    }
}

function filterAndSortPosts(searchTerm, sortOption) {
    const feedsContainer = document.querySelector('.feeds');
    if (!feedsContainer) {
        console.error("Feeds container not found.");
        return;
    }

    const allPosts = Array.from(feedsContainer.children); // Get all post elements

    // Filter posts based on the search term (if provided)
    const filteredPosts = allPosts.filter((post) => {
        const username = post.querySelector('.info h3')?.textContent.toLowerCase() || '';
        const location = post.querySelector('.info small')?.textContent.toLowerCase() || '';
        const hashtags = post.querySelector('.hashtags')?.textContent.toLowerCase() || '';
        const caption = post.querySelector('.caption p')?.textContent.toLowerCase() || '';

        return (
            !searchTerm || // Show all posts if searchTerm is empty
            username.includes(searchTerm) ||
            location.includes(searchTerm) ||
            hashtags.includes(searchTerm) ||
            caption.includes(searchTerm)
        );
    });

    // Sort posts based on the selected option
    const sortedPosts = filteredPosts.sort((a, b) => {
        const aDateElem = a.querySelector('.info small');
        const bDateElem = b.querySelector('.info small');
        const aDate = aDateElem ? new Date(aDateElem.getAttribute('data-date')) : new Date();
        const bDate = bDateElem ? new Date(bDateElem.getAttribute('data-date')) : new Date();

         if (sortOption === 'latest') {
            return bDate - aDate; // Descending by date
        } else if (sortOption === 'oldest') {
            return aDate - bDate; // Ascending by date
        } else if (sortOption === 'popular') {
            // Get likes
            const aLikesElem = a.querySelector('.liked-by');
            const bLikesElem = b.querySelector('.liked-by');
            const aLikes = aLikesElem ? parseInt(aLikesElem.getAttribute('data-likes')) || 0 : 0;
            const bLikes = bLikesElem ? parseInt(bLikesElem.getAttribute('data-likes')) || 0 : 0;
            return bLikes - aLikes; // Descending by likes
        }
    });

    // Clear and re-render the feeds with filtered and sorted posts
    feedsContainer.innerHTML = '';
    sortedPosts.forEach((post) => feedsContainer.appendChild(post));
}




// Utility function to calculate relative time
function getRelativeTime(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
    const diffInMonths = Math.floor(diffInWeeks / 4);
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} years ago`;
}

async function fetchPhotos(isHome) {
    const photosContainer = document.querySelector('.feeds');

    photosContainer.addEventListener('click', (event) => {
        const photoElement = event.target.closest('.feed');
        if (photoElement) {
            const photoId = photoElement.getAttribute('data-photo-id');
            // More attributes can be retrieved similarly
            localStorage.setItem('photoId', photoId);
            window.location.href = 'ViewImage.html'; // Redirect to detail view
        }

});

    if (!photosContainer) {
        console.error("Element with class 'feeds' not found in the DOM.");
        return; // Exit the function if not found
    }
    
    // Ensure user is authenticated
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
        console.error("User is not authenticated. Cannot fetch photos.");
        return; // Exit if no user is authenticated
    }

    photosContainer.innerHTML = ''; // Clear existing feeds


   

    // Get all photos liked by the current user
    const userLikesQuery = query(
        collection(db, 'Likes'),
        where('userId', '==', currentUserId)
    );
    const userLikesSnapshot = await getDocs(userLikesQuery);
    const likedPhotoIds = userLikesSnapshot.docs.map((doc) => doc.data().photoId);



    let photosRef = collection(db, 'Photos');
    if (isHome) {
        const followedUsers = await getFollowedUsers();
        const conditions = followedUsers.map(id => where('userId', '==', id));
        conditions.forEach(condition => {
            photosRef = query(photosRef, condition);
        });
    } else {
        photosRef = query(photosRef, orderBy('uploadDate', 'desc'));
    }




    const snapshot = await getDocs(photosRef);
    for (let docSnapshot of snapshot.docs) {
        const photo = docSnapshot.data();
        if (photo.status === 'Public') {
            const userRef = doc(db, 'users', photo.userId); // Reference to the user document
            const userDoc = await getDoc(userRef); // Fetch the user document
            const user = userDoc.data() || {}; // Extract user data

            const relativeTime = getRelativeTime(photo.uploadDate); // Get the relative time
             
           // Check if the current user has liked this photo
           const isLikedByCurrentUser = likedPhotoIds.includes(docSnapshot.id);

           // Fetch the last user who liked the photo
           let lastLikedByUsername = '';
           let likesCount = 0;
           const likesRef = collection(db, 'Likes');
           const likesQuery = query(
               likesRef,
               where('photoId', '==', docSnapshot.id),
               orderBy('timestamp', 'desc')
           );


           const likesSnapshot = await getDocs(likesQuery);
            if (!likesSnapshot.empty) {
                likesCount = likesSnapshot.size; // Count of total likes
                const lastLike = likesSnapshot.docs[0].data();
                const lastLikerRef = doc(db, 'users', lastLike.userId);
                const lastLikerDoc = await getDoc(lastLikerRef);
                lastLikedByUsername = lastLikerDoc.exists()
                    ? `@${lastLikerDoc.data().username || 'Anonymous'}`
                    : 'Anonymous';
            }

            // Determine the "Liked by" text
            let likedByText = '';
            if (likesCount === 1) {
                likedByText = `Liked by ${lastLikedByUsername}`;
            } else if (likesCount > 1) {
                likedByText = `Liked by ${lastLikedByUsername} and ${likesCount - 1} others`;
            }


            // Format hashtags
            const hashtagsHTML = photo.hashtags && photo.hashtags.length
                ? photo.hashtags.map(tag => `#${tag}`).join(' ')
                : '';



                const photoHTML = `
                <div class="feed" data-photo-id="${docSnapshot.id}" data-owner-id="${photo.userId}">
                    <div class="head">
                        <div class="user">
                            <div class="profile-photo">
                                <img src="${user.profilePic || '../assets/Default_profile_icon.jpg'}" alt="Profile Photo">
                            </div>
                            <div class="info">
                                <h3>${user.username || 'Unknown User'}</h3>
                                <small data-date="${photo.uploadDate || new Date().toISOString()}">
                                    ${photo.city || 'Unknown Location'}, ${getRelativeTime(photo.uploadDate)}
                                </small>
                            </div>
                        </div>
                        <span class="edit">
                            <i class="uil uil-ellipsis-h"></i>
                        </span>
                    </div>
                    <div class="photo">
                        <img src="${photo.imageUrl}" alt="${photo.caption}">
                    </div>
                    <div class="action-buttons">
                        <div class="interaction-buttons">
                            <span><i class="uil uil-heart ${likedPhotoIds.includes(docSnapshot.id) ? 'liked' : ''}"></i></span>
                            <span><i class="uil uil-comment-dots"></i></span>
                            <span><i class="uil uil-share-alt"></i></span>
                        </div>
                        <div class="bookmark">
                            <span><i class="uil uil-bookmark-full"></i></span>
                        </div>
                    </div>
                    <div class="liked-by" data-likes="${photo.likesCount || 0}">
                        <p>${photo.likesCount > 0 ? `${photo.likesCount} likes` : 'No likes yet'}</p>
                    </div>
                    <div class="caption">
                        <p><b>${user.username || 'Unknown User'}</b> ${photo.caption}</p>
                        <p class="hashtags">${photo.hashtags?.map(tag => `#${tag}`).join(' ') || ''}</p>
                    </div>
                    <div class="comments text-muted">View all ${photo.commentsCount || 0} comments</div>
                </div>
            `;
            photosContainer.innerHTML += photoHTML;
            
        }
    }
}


async function getFollowedUsers() {
    // This function should return an array of user IDs that the current user follows
    const followersRef = collection(db, 'followers');
    const currentUser = sessionStorage.getItem('username'); // Assuming the username is stored in session storage
    const q = query(followersRef, where('follower', '==', currentUser));
    const snapshot = await getDocs(q);
    let followedUsers = [];
    snapshot.forEach(doc => {
        followedUsers.push(doc.data().followed);
    });
    return followedUsers;
}





async function toggleLike(photoId, ownerId, liked) {
    const likesRef = collection(db, 'Likes');
    const notificationsRef = collection(db, 'Notifications');
    const activityLogsRef = collection(db, 'ActivityLogs');
    const photoRef = doc(db, 'Photos', photoId);

    const currentUserId = auth.currentUser.uid; // Current logged-in user ID
    const currentUsername = sessionStorage.getItem('username') || 'Anonymous'; // Assuming username is stored

     try {
        // Check if the like already exists
        const likeQuery = query(
            likesRef,
            where('photoId', '==', photoId),
            where('userId', '==', currentUserId)
        );
        const likeSnapshot = await getDocs(likeQuery);

        if (liked && !likeSnapshot.empty) {
            console.log(`Photo ${photoId} is already liked by ${currentUsername}. Skipping...`);
            return; // Don't add a duplicate like
        }
        if (liked) {
            // Add a like
            await addDoc(likesRef, {
                photoId: photoId,
                userId: currentUserId,
                timestamp: new Date(),
            });

            // Add a notification
            await addDoc(notificationsRef, {
                senderId: currentUserId,
                receiverId: ownerId,
                category: 'Like',
                photoId: photoId,
                timestamp: new Date(),
            });

            // Increment like count in the photo
            await updateDoc(photoRef, {
                likesCount: increment(1),
            });

          // Save like details in the ActivityLogs
          await addDoc(activityLogsRef, {
            action: 'like',
            photoId: photoId,
            senderId: currentUserId, // The user who liked
            receiverId: ownerId, // The photo owner
            timestamp: new Date(),
        });

        console.log(`Photo ${photoId} liked by ${currentUsername}`);
    } else {
            // Remove a like
            const likeQuery = query(
                likesRef,
                where('photoId', '==', photoId),
                where('userId', '==', currentUserId)
            );
            const likeSnapshot = await getDocs(likeQuery);
            likeSnapshot.forEach((doc) => deleteDoc(doc.ref));

             // Log the "removeLike" activity
             await addDoc(activityLogsRef, {
                action: 'removeLike',
                photoId: photoId,
                senderId: currentUserId, // The user who unliked
                receiverId: ownerId, // The photo owner
                timestamp: new Date(),
            });

            // Decrement like count in the photo
            await updateDoc(photoRef, {
                likesCount: increment(-1),
            });

            console.log(`Photo ${photoId} unliked by ${currentUsername}`);
        }
    } catch (error) {
        console.error("Error toggling like:", error);
    }
}































// SIDEBAR 
const menuItems = document.querySelectorAll('.menu-item');


// ================ SIDEBAR ===============

// remove active class from all menu items
const changeActiveItem = () => {
    menuItems.forEach(item => {
        item.classList.remove('active');
    })
}

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        changeActiveItem();
        item.classList.add('active');
    });
});



// show sidebar
const menuBtn = document.querySelector('#menu-btn');
menuBtn.addEventListener('click', () => {
    document.querySelector('.left').style.display = 'block';
})

// hide sidebar
const closeBtn = document.querySelector('#close-btn');
closeBtn.addEventListener('click', () => {
    document.querySelector('.left').style.display = 'none';
})




// THE END