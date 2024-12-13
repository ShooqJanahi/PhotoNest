//UserDashboard.js

// Import Firebase services
import { writeBatch, collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc, deleteDoc, increment  } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { db } from './firebaseConfig.js';

// Firebase Authentication
const auth = getAuth();

google.charts.load('current', { packages: ['bar'] });
google.charts.setOnLoadCallback(() => console.log("Google Charts Loaded"));


const suggestionsContainer = document.getElementById("search-suggestions");

document.addEventListener('DOMContentLoaded', async function () {
    await checkUserAuthentication(); // Ensure the user is authenticated
    updateNotificationCounts(); // Fetch and update counts

    const searchBar = document.getElementById("search-bar");
   

    // Debounce to reduce Firestore queries
    let debounceTimeout;
    searchBar.addEventListener("input", (event) => {
        const searchText = event.target.value.trim();
        clearTimeout(debounceTimeout);
    
        if (searchText.length > 0) {
            debounceTimeout = setTimeout(() => performSearch(searchText), 300);
        } else {
            suggestionsContainer.innerHTML = ""; // Clear suggestions
            suggestionsContainer.style.display = "none"; // Hide the dropdown
        }
    });


    searchBar.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { // Check if the Enter key is pressed
            event.preventDefault(); // Prevent default form submission (if inside a form)
            const searchText = searchBar.value.trim();
            if (searchText.length > 0) {
                performSearch(searchText);
                suggestionsContainer.style.display = "block"; // Ensure dropdown is visible
            } else {
                suggestionsContainer.innerHTML = ""; // Clear suggestions
                suggestionsContainer.style.display = "none"; // Hide the dropdown
            }
        }
    });
    
    
    // Hide the dropdown when the search bar loses focus
    searchBar.addEventListener("blur", () => {
        suggestionsContainer.style.display = "none";
    });
    
    // Show the dropdown when the search bar gains focus (if there are suggestions)
    searchBar.addEventListener("focus", () => {
        if (suggestionsContainer.innerHTML.trim() !== "") {
            suggestionsContainer.style.display = "block";
        }
    });
    

    const searchInput = document.getElementById("search");

searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { // Check if the Enter key is pressed
        event.preventDefault(); // Prevent default behavior
        const searchText = searchInput.value.trim().toLowerCase();
        filterAndDisplayFeeds(searchText); // Filter the feeds displayed on the page
    }
});








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


// Function to filter and display feeds based on search term
function filterAndDisplayFeeds(searchTerm) {
    const feedsContainer = document.querySelector('.feeds');
    if (!feedsContainer) {
        console.error("Feeds container not found.");
        return;
    }

    const allFeeds = Array.from(feedsContainer.children);

    if (!searchTerm) {
        // If the search term is empty, reload all feeds (or fetch them again)
        fetchPhotos(true); // Adjust based on your hash or current state
        return;
    }

    const filteredFeeds = allFeeds.filter((feed) => {
        const username = feed.querySelector('.info h3')?.textContent.toLowerCase() || '';
        const location = feed.querySelector('.info small')?.textContent.toLowerCase() || '';
        const caption = feed.querySelector('.caption p')?.textContent.toLowerCase() || '';
        const hashtags = feed.querySelector('.hashtags')?.textContent.toLowerCase() || '';

        return (
            username.includes(searchTerm) ||
            location.includes(searchTerm) ||
            hashtags.includes(searchTerm) ||
            caption.includes(searchTerm)
        );
    });

    feedsContainer.innerHTML = '';
    if (filteredFeeds.length > 0) {
        filteredFeeds.forEach((feed) => feedsContainer.appendChild(feed));
    } else {
        feedsContainer.innerHTML = '<p>No results found for your search.</p>';
    }
}






async function checkUserAuthentication() {
    console.log("Session storage on authentication check:", sessionStorage);


    document.body.style.display = "none"; // Hide the page content initially

    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                redirectToLogin(); // Redirect to login if not authenticated
            } else {
                let userRole = sessionStorage.getItem("role");

                // Reload session data if missing
                if (!userRole) {
                    console.warn("Session data missing. Reloading...");
                    await reloadSessionData();
                    userRole = sessionStorage.getItem("role");
                }

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
    const analyticsContainer = document.getElementById('analytics-section');
    const sortDropdown = document.getElementById('sort-options'); // Sort dropdown element
    const searchInput = document.getElementById('search'); // Search input element

    if (!feedsContainer || !analyticsContainer) return;

    if (!auth.currentUser) {
        console.error("User is not authenticated. Cannot navigate to section.");
        return; // Prevent navigation if no user is authenticated
    }


    // Do not clear elements outside the feeds section
    if (!document.getElementById("notification-popup")) {
        feedsContainer.innerHTML = ''; // Clear the container
    }

    
    updateActiveMenu(hash); // Highlight the correct menu item

   // Clear content and show appropriate section
   if (hash === '#home') {
    feedsContainer.style.display = 'block';
    analyticsContainer.style.display = 'none';
    sortDropdown.style.display = 'inline-block'; // Show the dropdown
    searchInput.setAttribute('placeholder', 'Search for photos or users, Diana?');
    searchInput.oninput = null; // Remove analytics-specific behavior
    fetchPhotos(true);
} else if (hash === '#explore') {
    feedsContainer.style.display = 'block';
    analyticsContainer.style.display = 'none';
    sortDropdown.style.display = 'inline-block'; // Show the dropdown
    searchInput.setAttribute('placeholder', 'Search for photos or users, Diana?');
    searchInput.oninput = null; // Remove analytics-specific behavior
    fetchPhotos(false);
} else if (hash === '#analytics') {
    feedsContainer.style.display = 'none';
    analyticsContainer.style.display = 'flex';
    sortDropdown.style.display = 'none'; // Hide the dropdown in analytics
    searchInput.setAttribute('placeholder', 'Search posts by caption in analytics');
    searchInput.oninput = (event) => {
        const searchQuery = event.target.value.toLowerCase();
        filterChartData(searchQuery); // Call the chart filtering function
    };
    drawPostPopularityChart();
} else {
    console.warn(`Unknown hash: ${hash}, defaulting to Home.`);
    window.location.hash = '#home';
    feedsContainer.style.display = 'block';
    analyticsContainer.style.display = 'none';
    sortDropdown.style.display = 'inline-block'; // Show the dropdown
    fetchPhotos(true);
}
}

function redirectToLogin() {
    window.location.href = '../html/Login.html'; // Redirect to the login page
}

async function reloadSessionData() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error("No authenticated user found. Redirecting to login.");
        redirectToLogin();
        return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        sessionStorage.setItem("role", userData.role.toLowerCase());
        sessionStorage.setItem("user", JSON.stringify(userData));
        console.log("Session data reloaded:", userData);
    } else {
        console.error("User document not found. Redirecting to login.");
        redirectToLogin();
    }
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
        
        if (event.target.classList.contains('fas fa-heart')) {
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

let fetchInProgress = false;

async function fetchPhotos(isHome) {
    if (fetchInProgress) return; // Prevent duplicate calls
    fetchInProgress = true;

    const photosContainer = document.querySelector('.feeds');
    if (!photosContainer) {
        console.error("Element with class 'feeds' not found in the DOM.");
        fetchInProgress = false;
        return;
    }

    // Ensure user is authenticated
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
        console.error("User is not authenticated. Cannot fetch photos.");
        fetchInProgress = false;
        return;
    }

    // Clear the container before appending new photos
    photosContainer.innerHTML = '';


   

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
                            <span><i class="uil fas fa-heart ${likedPhotoIds.includes(docSnapshot.id) ? 'liked' : ''}"></i></span>
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






//header search bar
async function performSearch(searchText) {
    suggestionsContainer.innerHTML = `<p>Searching...</p>`; // Show loading message

    const lowerCaseText = searchText.toLowerCase();

    // Firestore queries for users, locations, and hashtags
    const userQuery = query(
        collection(db, "users"),
        where("role", "==", "user"),
        where("status", "==", "active")
    );
    const locationQuery = collection(db, "Location");
    const hashtagQuery = collection(db, "Hashtag");

    try {
        // Fetch matching users
        const userSnapshot = await getDocs(userQuery);
        const userResults = userSnapshot.docs
            .map((doc) => doc.data())
            .filter(
                (user) =>
                    user.username.toLowerCase().includes(lowerCaseText) ||
                    user.firstName.toLowerCase().includes(lowerCaseText) ||
                    user.lastName.toLowerCase().includes(lowerCaseText)
            )
            .map((user) => ({
                type: "user",
                displayText: `${user.firstName} ${user.lastName} (@${user.username})`,
                id: doc.id,
            }));

        // Fetch matching locations
        const locationSnapshot = await getDocs(locationQuery);
        const locationResults = locationSnapshot.docs
            .map((doc) => doc.data())
            .filter(
                (location) =>
                    location.city.toLowerCase().includes(lowerCaseText) ||
                    location.country.toLowerCase().includes(lowerCaseText)
            )
            .map((location) => ({
                type: "location",
                displayText: `${location.city}, ${location.country}`,
                id: doc.id,
            }));

        // Fetch matching hashtags
        const hashtagSnapshot = await getDocs(hashtagQuery);
        const hashtagResults = hashtagSnapshot.docs
            .map((doc) => doc.data())
            .filter((hashtag) =>
                hashtag.hashtag.toLowerCase().includes(lowerCaseText.replace("#", ""))
            )
            .map((hashtag) => ({
                type: "hashtag",
                displayText: `#${hashtag.hashtag}`,
                id: doc.id,
            }));

        // Combine all results
        const results = [...userResults, ...locationResults, ...hashtagResults];

        // Display the suggestions
        displaySuggestions(results);
    } catch (error) {
        console.error("Error performing search:", error);
        suggestionsContainer.innerHTML = `<p>Error loading suggestions.</p>`;
    }
}

function displaySuggestions(results) {
    suggestionsContainer.innerHTML = ""; // Clear previous suggestions

    if (results.length === 0) {
        suggestionsContainer.innerHTML = `<p>No results found.</p>`;
        return;
    }

    results.forEach((result) => {
        const suggestionItem = document.createElement("div");
        suggestionItem.className = "suggestion-item";

        suggestionItem.innerHTML = `
    <div class="suggestion-content">
        <span class="suggestion-text">${result.displayText}</span>
        <span class="suggestion-type">(${result.type})</span>
    </div>
`;


        suggestionItem.addEventListener("click", () => {
            handleSuggestionClick(result);
        });

        suggestionsContainer.appendChild(suggestionItem);
    });
}

function handleSuggestionClick(result) {
    switch (result.type) {
        case "user":
            window.location.href = `../html/UserProfile.html?userId=${result.id}`;
            break;
        case "location":
            window.location.href = `../html/LocationDetails.html?locationId=${result.id}`;
            break;
        case "hashtag":
            window.location.href = `../html/HashtagResults.html?hashtag=${result.displayText.replace(
                "#",
                ""
            )}`;
            break;
        default:
            console.error("Unknown suggestion type:", result.type);
            break;
    }
}





// Global variable to store chart and data for zoom functionality
let chart, chartData, chartOptions;
let zoomLevel = 1;

/**
 * Fetch post popularity data and render the Google Charts bar chart.
 */
async function drawPostPopularityChart() {
    const chartContainer = document.getElementById('post-popularity-chart');
    chartContainer.innerHTML = '<p>Loading chart...</p>'; // Loading message

    try {
        const photosRef = collection(db, 'Photos');
        const photosSnapshot = await getDocs(photosRef);

        chartData = new google.visualization.DataTable();
        chartData.addColumn('string', 'Post'); // Post title
        chartData.addColumn('number', 'Likes'); // Likes count
        chartData.addColumn('number', 'Views'); // Views count
        chartData.addColumn({ type: 'string', role: 'tooltip' }); // Tooltip (full caption)

        photosSnapshot.forEach((doc) => {
            const photo = doc.data();
            const truncatedCaption = truncateText(photo.caption || 'Untitled', 25); // Short caption
            const fullCaption = photo.caption || 'Untitled'; // Full caption
            chartData.addRow([
                truncatedCaption, // Displayed in the chart
                photo.likesCount || 0, // Likes
                photo.viewCount || 0, // Views
                fullCaption, // Tooltip with full text
            ]);
        });

        if (chartData.getNumberOfRows() === 0) {
            chartContainer.innerHTML = '<p>No posts available to display popularity.</p>';
            return;
        }

        chartOptions = {
            chart: {
                title: 'Post Popularity',
                subtitle: 'Comparison of likes and views across posts',
            },
            bars: 'horizontal',
            height: 500 * zoomLevel,
            tooltip: { isHtml: true },
            hAxis: {
                title: 'Count',
                textStyle: { fontSize: 14 },
                titleTextStyle: { fontSize: 16 },
            },
            vAxis: {
                title: 'Post Caption',
                textStyle: { fontSize: 14 },
                titleTextStyle: { fontSize: 16 },
            },
            legend: {
                textStyle: { fontSize: 14 },
            },
        };

        // Draw the chart
        chart = new google.charts.Bar(chartContainer);
        chart.draw(chartData, google.charts.Bar.convertOptions(chartOptions));
    } catch (error) {
        console.error('Error fetching or rendering chart data:', error);
        chartContainer.innerHTML = '<p>Error loading chart. Please try again later.</p>';
    }
}


/**
 * Zoom in or out on the chart.
 * @param {number} direction - 1 to zoom in, -1 to zoom out
 */
function zoomChart(direction) {
    const maxZoomLevel = 1.5; // Maximum zoom level
    const minZoomLevel = 0.5; // Minimum zoom level

    zoomLevel += direction * 0.2; // Adjust zoom level (increase or decrease)
    zoomLevel = Math.max(minZoomLevel, Math.min(zoomLevel, maxZoomLevel)); // Clamp zoom level between min and max

    if (chart && chartData && chartOptions) {
        // Ensure chart height stays within max-height of the container
        const maxHeight = 500; // Max height of the chart container in pixels
        chartOptions.height = Math.min(maxHeight * zoomLevel, maxHeight);
        chartOptions.vAxis.textStyle.fontSize = 12 * zoomLevel; // Adjust text size dynamically
        chart.draw(chartData, google.charts.Bar.convertOptions(chartOptions));
    }
}


// Event listeners for zoom buttons
document.getElementById('zoom-in').addEventListener('click', () => zoomChart(1));
document.getElementById('zoom-out').addEventListener('click', () => zoomChart(-1));

// Resize the chart on window resize
window.addEventListener('resize', () => {
    if (chart && chartData && chartOptions) {
        chart.draw(chartData, google.charts.Bar.convertOptions(chartOptions));
    }
});



const chartWrapper = document.getElementById('post-popularity-chart-wrapper');
let isDragging = false;
let startX, scrollLeft;

// Mouse down
chartWrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    chartWrapper.classList.add('dragging');
    startX = e.pageX - chartWrapper.offsetLeft;
    scrollLeft = chartWrapper.scrollLeft;
});

// Mouse up or leave
chartWrapper.addEventListener('mouseup', () => {
    isDragging = false;
    chartWrapper.classList.remove('dragging');
});

chartWrapper.addEventListener('mouseleave', () => {
    isDragging = false;
    chartWrapper.classList.remove('dragging');
});

// Mouse move
chartWrapper.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - chartWrapper.offsetLeft;
    const walk = (x - startX) * 2; // Adjust scroll speed
    chartWrapper.scrollLeft = scrollLeft - walk;
});


function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}



/**
 * Filter chart data based on the search query and redraw the chart.
 * @param {string} query - The user's search query.
 */
function filterChartData(query) {
    if (!chartData || chartData.getNumberOfRows() === 0) return;

    // Create a new DataTable for filtered data
    const filteredData = new google.visualization.DataTable();
    filteredData.addColumn('string', 'Post');
    filteredData.addColumn('number', 'Likes');
    filteredData.addColumn('number', 'Views');

    for (let i = 0; i < chartData.getNumberOfRows(); i++) {
        const caption = chartData.getValue(i, 0).toLowerCase(); // Get the post caption
        if (caption.includes(query)) {
            filteredData.addRow([
                chartData.getValue(i, 0), // Post
                chartData.getValue(i, 1), // Likes
                chartData.getValue(i, 2), // Views
            ]);
        }
    }

    // If no matching data, show a message
    const chartContainer = document.getElementById('post-popularity-chart');
    if (filteredData.getNumberOfRows() === 0) {
        chartContainer.innerHTML = '<p>No matching posts found.</p>';
        return;
    }

    // Redraw the chart with filtered data
    chart.draw(filteredData, google.charts.Bar.convertOptions(chartOptions));
}




// Function to fetch unread counts from Firestore and update the HTML
async function updateNotificationCounts() {
    try {
        const userId = auth.currentUser?.uid; // Check if a user is logged in
        if (!userId) {
            console.error("User not logged in.");
            return;
        }

        // Fetch unread notifications count
        const notificationsRef = collection(db, "Notifications");
        const notificationsQuery = query(
            notificationsRef,
            where("receiverId", "==", userId),
            where("status", "==", "unopen")
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        const unreadNotificationsCount = notificationsSnapshot.size;

        // Fetch unread messages count
        const messagesRef = collection(db, "Messages");
        const messagesQuery = query(
            messagesRef,
            where("receiverId", "==", userId),
            where("status", "==", "Unread")
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const unreadMessagesCount = messagesSnapshot.size;

        // Update notification count UI
        const notificationCountElement = document.getElementById("notification-count");
        if (notificationCountElement) {
            notificationCountElement.textContent = unreadNotificationsCount > 0 ? unreadNotificationsCount : "";
            notificationCountElement.style.display = unreadNotificationsCount > 0 ? "inline-block" : "none";
        } else {
            console.error("Notification count element not found.");
        }

        // Update message count UI
        const messageCountElement = document.getElementById("message-count");
        if (messageCountElement) {
            messageCountElement.textContent = unreadMessagesCount > 0 ? unreadMessagesCount : "";
            messageCountElement.style.display = unreadMessagesCount > 0 ? "inline-block" : "none";
        } else {
            console.error("Message count element not found.");
        }
    } catch (error) {
        console.error("Error updating notification counts:", error);
    }
}


function updateCountUI(element, count) {
    if (element) {
        element.textContent = count > 0 ? count : ""; // Show the count or empty text
        element.style.display = count > 0 ? "inline-block" : "none"; // Show or hide
    }
}


document.getElementById("notifications").addEventListener("click", async () => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const notificationsRef = collection(db, "Notifications");

      // Query to get notifications with status 'unopen'
      const unopenNotificationsQuery = query(
        notificationsRef,
        where("receiverId", "==", userId),
        where("status", "==", "unopen")
    );

    const notificationsSnapshot = await getDocs(unopenNotificationsQuery);


    if (notificationsSnapshot.empty) {
        console.log("No 'unopen' notifications found.");
        return;
    }

    // Batch update: Mark all notifications as "open"
    const batch = writeBatch(db); // Correct batch initialization
    notificationsSnapshot.forEach((doc) => {
        const notificationRef = doc.ref;
        batch.update(notificationRef, { status: "open" });
    });

    await batch.commit(); // Commit the batch operation
    console.log("All 'unopen' notifications marked as 'open'.");

    // Refresh the notification count after the update
    updateNotificationCounts();


       // Display the notifications in the popup or UI
       const notificationList = document.getElementById("notification-list");
       if (notificationList) {
           notificationList.innerHTML = ""; // Clear previous notifications

           if (notificationsSnapshot.empty) {
               notificationList.innerHTML = `<p>No new notifications.</p>`;
           } else {
               notificationsSnapshot.forEach((doc) => {
                   const notificationData = doc.data();
                   const notificationItem = document.createElement("div");
                   notificationItem.className = "notification-item";
                   notificationItem.innerHTML = `
                       <p><strong>${notificationData.category}</strong>: Related to photo ID ${notificationData.photoId}</p>
                       <p>${new Date(notificationData.timestamp.toDate()).toLocaleString()}</p>
                   `;
                   notificationList.appendChild(notificationItem);
               });
           }
       }

      
   } catch (error) {
       console.error("Error handling notifications:", error);
   }
});


document.getElementById("messages-notification").addEventListener("click", async () => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const messagesRef = collection(db, "Messages");
        const messagesQuery = query(
            messagesRef,
            where("receiverId", "==", userId),
            where("status", "==", "Unread")
        );
        const messagesSnapshot = await getDocs(messagesQuery);

        const batch = db.batch();
        messagesSnapshot.forEach((doc) => {
            batch.update(doc.ref, { status: "Read" });
        });
        await batch.commit();

        console.log("Messages marked as read.");
        updateNotificationCounts(); // Refresh counts
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
});




















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