// SIDEBAR 
const menuItems = document.querySelectorAll('.menu-item');

// MESSAGES
const messagesNotification = document.querySelector('#messages-notification');
const messages = document.querySelector('.messages');
const message = messages.querySelectorAll('.message');
const messageSearch = document.querySelector('#message-search');

// ================ SIDEBAR ===============

// Remove active class from all menu items
const changeActiveItem = () => {
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
};

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        changeActiveItem();
        item.classList.add('active');
        if (item.id !== 'notifications') {
            document.querySelector('.notifications-popup').style.display = 'none';
        } else {
            document.querySelector('.notifications-popup').style.display = 'block';
            document.querySelector('#notifications .notification-count').style.display = 'none';
        }
    });
});

// ================ MESSAGES ===============
// Searches chats
const searchMessage = () => {
    const val = messageSearch.value.toLowerCase();
    message.forEach(user => {
        let name = user.querySelector('h5').textContent.toLowerCase();
        if (name.indexOf(val) !== -1) {
            user.style.display = 'flex';
        } else {
            user.style.display = 'none';
        }
    });
};

// Search chat
messageSearch.addEventListener('keyup', searchMessage);

// Highlight messages card when messages menu item is clicked
messagesNotification.addEventListener('click', () => {
    messages.style.boxShadow = '0 0 1rem var(--color-primary)';
    messagesNotification.querySelector('.notification-count').style.display = 'none';
    setTimeout(() => {
        messages.style.boxShadow = 'none';
    }, 2000);
});

// Show sidebar
const menuBtn = document.querySelector('#menu-btn');
const leftSidebar = document.querySelector('.left');
menuBtn.addEventListener('click', () => {
    leftSidebar.classList.toggle('active');
});

// Hide sidebar
const closeBtn = document.querySelector('#close-btn');
closeBtn.addEventListener('click', () => {
    leftSidebar.classList.remove('active');
});


document.addEventListener('DOMContentLoaded', function () {
    // Get username and role from session storage
    const username = sessionStorage.getItem("username");
    const userRole = sessionStorage.getItem("role");

    // Check if the user is logged in and has the role of "user"
    if (!username || userRole !== "user") {
        // If not logged in or the role is not "user", redirect to the login page
        alert('Unauthorized access. Redirecting to login page.');
        window.location.href = '../html/index.html';  // Redirect to login page
    }
});

// Firebase imports
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db } from './firebaseConfig.js';

// Initialize activity log collection reference
const activityLogsRef = collection(db, 'activity_logs');

document.addEventListener('DOMContentLoaded', async function () {
    // Get username and role from session storage
    const username = sessionStorage.getItem("username");
    const userRole = sessionStorage.getItem("role");

    // Check if the user is logged in and has the role of "user"
    if (!username || userRole !== "user") {
        alert('Unauthorized access. Redirecting to login page.');
        window.location.href = '../html/index.html';  // Redirect to login page
        return;
    }

    // Fetch the user document from Firebase Firestore using the session-stored username
    const usersRef = doc(db, "users", username);
    try {
        const userDoc = await getDoc(usersRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Update the DOM with user information
            document.getElementById('profile-image').src = userData.profilePic || '../assets/Default_profile_icon.png';
            document.getElementById('profile-name').textContent = `${userData.firstName} ${userData.lastName}`;
            document.getElementById('profile-username').textContent = `@${userData.username}`;
            
            // Log user activity (e.g., login activity)
            await logUserActivity(`${userData.username} logged in.`);
        } else {
            console.error("No such user found!");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
});

// Log user activities to Firestore
const logUserActivity = async (activity) => {
    try {
        await addDoc(activityLogsRef, {
            username: sessionStorage.getItem('username'),
            activity: activity,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

// Add a follow activity (example)
const followUser = async (followedUsername) => {
    const currentUser = sessionStorage.getItem('username');
    // Log the follow activity
    await logUserActivity(`${currentUser} followed @${followedUsername}`);
    // Add follow logic (add to followers collection)
    const followersRef = collection(db, "followers");
    await addDoc(followersRef, {
        follower: currentUser,
        followed: followedUsername,
        followedAt: new Date().toISOString()
    });
};

// Fetch likes, comments, notifications, and other data
const fetchLikes = async () => {
    const likesRef = collection(db, 'likes');
    const q = query(likesRef, where('username', '==', sessionStorage.getItem('username')));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
    });
};

// Store notifications
const sendNotification = async (message, recipient) => {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
        recipient: recipient,
        message: message,
        sender: sessionStorage.getItem('username'),
        timestamp: new Date().toISOString(),
        read: false
    });
};

// Display Photos with Geotags
async function fetchFeed() {
    const feedContainer = document.querySelector('.feeds'); // Get the container for feeds
    const photosRef = collection(db, 'Photos'); // Ensure correct Firestore syntax
    
    try {
      const snapshot = await getDocs(photosRef); // Use getDocs to retrieve documents
      feedContainer.innerHTML = ''; // Clear any existing content in the feed container
  
      snapshot.forEach(doc => {
        const photoData = doc.data();
        feedContainer.innerHTML += `
          <div class="feed">
            <div class="head">
              <div class="user">
                <div class="profile-photo">
                  <img src="./images/profile-placeholder.jpg">
                </div>
                <div class="info">
                  <h3>${photoData.userId}</h3>
                  <small>${new Date(photoData.createdAt.seconds * 1000).toLocaleDateString()}</small>
                </div>
              </div>
              <span class="edit">
                <i class="uil uil-ellipsis-h"></i>
              </span>
            </div>
  
            <div class="photo">
              <img src="${photoData.imageURL}" alt="${photoData.caption}">
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
              <p>Liked by <b>John Doe</b> and <b>${photoData.likesCount} others</b></p>
            </div>
  
            <div class="caption">
              <p><b>${photoData.userId}</b> ${photoData.caption}</p>
            </div>
            <div class="comments text-muted">View all ${photoData.commentsCount} comments</div>
          </div>
        `;
      });
    } catch (error) {
      console.error("Error fetching feed:", error);
    }
}

// Call fetchFeed on page load
document.addEventListener('DOMContentLoaded', fetchFeed);
