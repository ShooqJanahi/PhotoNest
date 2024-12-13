//Notification.js 

// Import Firebase services
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js';

const notificationsTab = document.getElementById("notifications");

let notifications = []; // Global notifications array
let usernames = {}; // Global map for senderId to username mapping

export function createNotificationPopup() {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    overlay.className = "popup-overlay";

    // Create popup
    const popup = document.createElement("div");
    popup.id = "notification-popup";
    popup.className = "popup";

    popup.innerHTML = `
        <div class="popup-header">
            <h3>Notifications</h3>
            <button id="close-notification-popup" class="close-btn"><i class="uil uil-multiply"></i></button>
        </div>
        <div class="popup-search">
            <input type="text" id="notification-search" placeholder="Search notifications...">
            <select id="notification-filter">
                <option value="latest">Sort by Latest</option>
                <option value="oldest">Sort by Oldest</option>
            </select>
        </div>
        <div id="notification-list" class="popup-content"></div>
    `;

    // Append overlay and popup to the body
    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Close popup on overlay click or close button
    overlay.addEventListener("click", closePopup);
    document.getElementById("close-notification-popup").addEventListener("click", closePopup);

    fetchAndRenderNotifications();
}

// Function to open the popup
export function openPopup() {
    console.log("openPopup function triggered");
    
    const overlay = document.getElementById("popup-overlay");
    const popup = document.getElementById("notification-popup");

    if (overlay && popup) {
        overlay.classList.add("active");
        popup.classList.add("active");
        popup.focus(); // Bring the popup into focus
    }
}

// Function to close the popup
export function closePopup() {
    const overlay = document.getElementById("popup-overlay");
    const popup = document.getElementById("notification-popup");

    if (overlay && popup) {
        overlay.classList.remove("active");
        popup.classList.remove("active");
    }
}

// Fetch and render notifications
export async function fetchAndRenderNotifications() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user || !user.uid) {
        console.error("User not logged in or session data is missing required fields!");
        window.location.href = "../html/index.html";
        return;
    }

    const notificationList = document.getElementById("notification-list");
    const searchInput = document.getElementById("notification-search");
    const filterDropdown = document.getElementById("notification-filter");

    try {
        const notificationsRef = collection(db, "Notifications");
        const notificationsQuery = query(
            notificationsRef,
            where("receiverId", "==", user.uid),
            orderBy("timestamp", "desc")
        );

        const snapshot = await getDocs(notificationsQuery);
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5); // Calculate the date 5 days ago

        notifications = snapshot.docs
    .map(doc => {
        let normalizedTimestamp;

        // Normalize the timestamp format
        if (doc.data().timestamp && typeof doc.data().timestamp.toDate === "function") {
            normalizedTimestamp = doc.data().timestamp.toDate(); // Firestore Timestamp
        } else if (typeof doc.data().timestamp === "string") {
            normalizedTimestamp = new Date(doc.data().timestamp); // ISO string
        } else {
            console.warn(`Invalid or missing timestamp for notification ${doc.id}`);
            normalizedTimestamp = null; // Fallback for invalid timestamps
        }

        return {
            id: doc.id,
            ...doc.data(),
            normalizedTimestamp, // Add normalized timestamp for sorting
        };
    })
        
    .filter(notification => {
        // Filter notifications based on normalized timestamp
        const { normalizedTimestamp, status } = notification;
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        return (
            status === "unopen" || // Include unopen notifications
            (normalizedTimestamp && normalizedTimestamp >= fiveDaysAgo) // Last 5 days
        );
    })
    .sort((a, b) => {
        // Sort notifications in descending order of normalized timestamp
        return b.normalizedTimestamp - a.normalizedTimestamp;
    });
        
        
        
        


        if (!notifications.length) {
            notificationList.innerHTML = "<p>No notifications found.</p>";
            return;
        }

        // Fetch usernames for all senderIds
        const senderIds = [...new Set(notifications.map(n => n.senderId))];

        for (const senderId of senderIds) {
            if (senderId) {
                try {
                    const userDoc = await getDoc(doc(db, "users", senderId));
                    usernames[senderId] = userDoc.exists() ? userDoc.data().username || "Unknown" : "Unknown";
                } catch (error) {
                    console.error(`Error fetching user with ID ${senderId}:`, error);
                    usernames[senderId] = "Unknown";
                }
            }
        }

        renderNotifications();

        // Attach search and filter listeners
        searchInput.addEventListener("input", renderNotifications);
        filterDropdown.addEventListener("change", renderNotifications);

        // Handle delete notification action
        notificationList.addEventListener("click", async event => {
            if (event.target.classList.contains("delete-notification")) {
                const notificationId = event.target.parentElement.dataset.id;
                await deleteDoc(doc(db, "Notifications", notificationId));
                console.log(`Notification ${notificationId} deleted.`);
                notifications = notifications.filter(n => n.id !== notificationId);
                renderNotifications();
            }
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        notificationList.innerHTML = "<p>Error loading notifications. Please try again later.</p>";
    }
}

// Function to render notifications based on search and filter
export function renderNotifications() {
    const searchInput = document.getElementById("notification-search");
    const filterDropdown = document.getElementById("notification-filter");
    const notificationList = document.getElementById("notification-list");

    const searchQuery = searchInput.value.toLowerCase();
    const filterOption = filterDropdown.value;

    let filteredNotifications = notifications.filter(notification => {
        const senderUsername = usernames[notification.senderId]?.toLowerCase() || "unknown";
        const message = getMessage(notification, senderUsername).toLowerCase();
        return message.includes(searchQuery);
    });

    if (filterOption === "latest") {
        filteredNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (filterOption === "oldest") {
        filteredNotifications.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Update notification list in DOM
    notificationList.innerHTML = filteredNotifications
    .map(notification => {
        const senderUsername = usernames[notification.senderId] || "Unknown";
    
        let timeAgo = "Unknown time"; // Default fallback
        if (notification.timestamp) {
            try {
                let timestamp;
                if (typeof notification.timestamp.toDate === "function") {
                    timestamp = notification.timestamp.toDate(); // Firestore Timestamp
                } else if (typeof notification.timestamp === "string") {
                    timestamp = new Date(notification.timestamp); // ISO string
                }
                timeAgo = getRelativeTime(timestamp); // Calculate relative time
            } catch (error) {
                console.error(`Error calculating time for notification ${notification.id}:`, error);
            }
        }
    
        const message = getMessage(notification, senderUsername);
        // Format the timestamp to be readable
        const readableTimestamp = new Date(notification.timestamp).toLocaleString();

        return `
            <div class="notification-item" data-id="${notification.id}">
                <span>${message}</span>
                <small class="notification-time">${timeAgo}</small>
                <button class="delete-notification">Delete</button>
            </div>
        `;
    }).join("");

    // Add click listener to notification cards AFTER the DOM is updated
notificationList.querySelectorAll(".notification-item").forEach(item => {
    item.addEventListener("click", async event => {
        const notificationId = item.dataset.id;
        const clickedNotification = notifications.find(n => n.id === notificationId);

        if (clickedNotification) {
            // Check if the category is 'message'
            if (clickedNotification.category === "message") {
                window.location.href = "Messages.html"; // Redirect to Messages.html
                return; // Exit further execution for 'message' category
            }

        if (clickedNotification && ["Like", "Comment", "Share"].includes(clickedNotification.category)) {
            const { photoId } = clickedNotification;
            if (photoId) {
                try {
                    const photoDoc = await getDoc(doc(db, "Photos", photoId));
                    if (photoDoc.exists()) {
                        localStorage.setItem("photoId", photoId); // Save photoId to localStorage
                        window.location.href = "ViewImage.html"; // Redirect to ViewImage.html
                    } else {
                        alert("The photo no longer exists."); // Show alert if photo doesn't exist
                    }
                } catch (error) {
                    console.error("Error checking photo existence:", error);
                    alert("An error occurred while trying to fetch the photo.");
                }
            }
        }
        }
        
    });
});

}


// Generate dynamic message based on category
function getMessage(notification, senderUsername) {
    switch (notification.category) {
        case "Like":
            return `${senderUsername} liked your photo!`;
        case "Comment":
            return `${senderUsername} commented on your photo!`;
        case "Follow":
            return `${senderUsername} started following you!`;
        case "message":
            return `${senderUsername} sent you a message!`;
        case "Share":
            return `${senderUsername} shared your photo!`;
        default:
            return `${senderUsername} performed an action.`;
    }
}


// Utility function to calculate relative time
function getRelativeTime(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return `${years} years ago`;
}

// Handle notifications tab click
if (notificationsTab) {
    notificationsTab.addEventListener("click", () => {
        let popup = document.getElementById("notification-popup");
        let overlay = document.getElementById("popup-overlay");

        if (!popup || !overlay) {
            createNotificationPopup();
        }
        openPopup();
    });
}
