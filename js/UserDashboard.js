//UserDashboard.js

// Import Firebase services
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { db } from './firebaseConfig.js';

// Firebase Authentication
const auth = getAuth();

document.addEventListener('DOMContentLoaded', async function () {
    checkUserAuthentication(); // Ensure user authentication

    setupPage();

});

function checkUserAuthentication() {
    document.body.style.display = "none"; // Hide the page content initially

    onAuthStateChanged(auth, user => {
        if (!user) {
            redirectToLogin(); // Redirect to login if not authenticated
        } else {
            // Retrieve the role from session storage
            const userRole = sessionStorage.getItem("role");

            if (userRole !== "user") {
                redirectToLogin(); // Redirect to login if not a "user"
            } else {
                document.body.style.display = "block"; // Show the page content
                console.log("Access granted for user with role:", userRole);
            }
        }
    });
}

// Redirect to login function
function redirectToLogin() {
    window.location.href = '../html/Login.html'; // Redirect to the login page
}

async function setupPage() {
    const homeMenuItem = document.querySelector('.menu-item.home');
    const exploreMenuItem = document.querySelector('.menu-item.explore');

    // Event listeners for menu items
    if (homeMenuItem) {
        homeMenuItem.addEventListener('click', () => fetchPhotos(true));
    }
    if (exploreMenuItem) {
        exploreMenuItem.addEventListener('click', () => fetchPhotos(false));
    }

    // Initially load the 'Home' feed
    fetchPhotos(true);
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
    photosContainer.innerHTML = ''; // Clear existing feeds

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

            const photoHTML = `
                <div class="feed">
                    <div class="head">
                        <div class="user">
                            <div class="profile-photo">
                                <img src="${user.profilePic || 'default_profile_pic_url'}" alt="Profile Photo">
                            </div>
                            <div class="info">
                                <h3>${user.username || 'Unknown User'}</h3>
                                <small>${photo.city || 'Unknown Location'}, ${relativeTime}</small>
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
                            <span><i class="uil uil-heart"></i></span>
                            <span><i class="uil uil-comment-dots"></i></span>
                            <span><i class="uil uil-share-alt"></i></span>
                        </div>
                        <div class="bookmark">
                            <span><i class="uil uil-bookmark-full"></i></span>
                        </div>
                    </div>
                    <div class="liked-by">
                        <p>Liked by <b>John Doe</b> and <b>${photo.likesCount || 0} others</b></p>
                    </div>
                    <div class="caption">
                        <p><b>${user.username || 'Unknown User'}</b> ${photo.caption}</p>
                    </div>
                    <div class="comments text-muted">View all ${photo.commentsCount || 0} comments</div>
                </div>
            `;
            photosContainer.innerHTML += photoHTML; // Append the generated HTML to the feeds container
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





// SIDEBAR 
const menuItems = document.querySelectorAll('.menu-item');

// MESSAGES
const messagesNotification = document.querySelector('#messages-notification');
const messages = document.querySelector('.messages');
const message = messages.querySelectorAll('.message');
const messageSearch = document.querySelector('#message-search');






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



// ================ MESSAGES ===============
// searches chats
const searchMessage = () => {
    const val = messageSearch.value.toLowerCase();
    message.forEach(user => {
        let name = user.querySelector('h5').textContent.toLowerCase();
        if (name.indexOf(val) != -1) {
            user.style.display = 'flex';
        } else {
            user.style.display = 'none';
        }
    })
}


// search chat
messageSearch.addEventListener('keyup', searchMessage);

// hightlight messages card when messages menu item is clicked
messagesNotification.addEventListener('click', () => {
    messages.style.boxShadow = '0 0 1rem var(--color-primary)';
    messagesNotification.querySelector('.notification-count').style.display = 'none';
    setTimeout(() => {
        messages.style.boxShadow = 'none';
    }, 2000);
})











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