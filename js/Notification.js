//Notification.js 

// Import Firebase services for Firestore operations
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from './firebaseConfig.js'; // Import Firebase configuration

// Get the notifications tab element from the DOM
const notificationsTab = document.getElementById("notifications");

let notifications = []; // Global array to store notifications
let usernames = {}; // Global object to map sender IDs to usernames

// Function to create the notification popup
export function createNotificationPopup() {
    // Create a semi-transparent overlay to block interactions with the background
    const overlay = document.createElement("div");
    overlay.id = "popup-overlay";
    overlay.className = "popup-overlay";

    // Create the popup container
    const popup = document.createElement("div");
    popup.id = "notification-popup";
    popup.className = "popup";

    // Add HTML content for the popup
    popup.innerHTML = `
        <div class="popup-header">
            <h3>Notifications</h3> <!-- Title of the popup -->
            <button id="close-notification-popup" class="close-btn"><i class="uil uil-multiply"></i></button> <!-- Close button -->
        </div>
        </div>
        <div class="popup-search">
            <input type="text" id="notification-search" placeholder="Search notifications..."> <!-- Search bar -->
            <select id="notification-filter"> <!-- Dropdown for sorting notifications -->
                <option value="latest">Sort by Latest</option>
                <option value="oldest">Sort by Oldest</option>
            </select>
        </div>
        <div id="notification-list" class="popup-content"></div> <!-- Container for displaying notifications -->
    `;

    // Append overlay and popup to the body
    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Close the popup when the overlay or close button is clicked
    overlay.addEventListener("click", closePopup);
    document.getElementById("close-notification-popup").addEventListener("click", closePopup);

    // Fetch and render notifications
    fetchAndRenderNotifications();
}

// Function to open the popup
export function openPopup() {
    console.log("openPopup function triggered"); // Log for debugging

    // Get the overlay and popup elements
    const overlay = document.getElementById("popup-overlay");
    const popup = document.getElementById("notification-popup");

    if (overlay && popup) {
        overlay.classList.add("active"); // Make the overlay visible
        popup.classList.add("active"); // Make the popup visible
        popup.focus(); // Focus on the popup
    }
}

// Function to close the popup
export function closePopup() {
    // Get the overlay and popup elements
    const overlay = document.getElementById("popup-overlay");
    const popup = document.getElementById("notification-popup");

    if (overlay && popup) {
        overlay.classList.remove("active"); // Hide the overlay
        popup.classList.remove("active"); // Hide the popup
    }
}


// Function to fetch notifications from Firestore and render them
export async function fetchAndRenderNotifications() {
    const user = JSON.parse(sessionStorage.getItem("user")); // Get the logged-in user details from session storage
    if (!user || !user.uid) {
        console.error("User not logged in or session data is missing required fields!");// Log an error if no user is logged in
        window.location.href = "../html/index.html"; // Redirect to the login page
        return;
    }

    const notificationList = document.getElementById("notification-list"); // Get the container for notifications
    const searchInput = document.getElementById("notification-search");  // Get the search input element
    const filterDropdown = document.getElementById("notification-filter");

    if (filterDropdown) {
        // Ensure only one listener is attached
        filterDropdown.addEventListener("change", (event) => {
            console.log("Dropdown changed to:", event.target.value); // Debugging log
            renderNotifications(); // Immediately call the render function
        });

    } else {
        console.error("Filter dropdown not found!");
    }




    try {
        // Reference to the "Notifications" collection in Firestore
        const notificationsRef = collection(db, "Notifications");

        // Query to fetch notifications for the logged-in user, sorted by timestamp
        const notificationsQuery = query(
            notificationsRef,
            where("receiverId", "==", user.uid), // Filter notifications for the logged-in user
            orderBy("timestamp", "desc") // Sort notifications by latest
        );

        const snapshot = await getDocs(notificationsQuery); // Execute the query

        // Calculate the date 5 days ago
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        // Map and filter notifications
        notifications = snapshot.docs
            .map(doc => {
                let normalizedTimestamp;

                // Normalize the timestamp format
                if (doc.data().timestamp && typeof doc.data().timestamp.toDate === "function") {
                    normalizedTimestamp = doc.data().timestamp.toDate(); // Convert Firestore Timestamp to Date
                } else if (typeof doc.data().timestamp === "string") {
                    normalizedTimestamp = new Date(doc.data().timestamp); // Convert ISO string to Date
                } else {
                    console.warn(`Invalid or missing timestamp for notification ${doc.id}`);
                    normalizedTimestamp = null; // Handle invalid timestamps
                }

                return {
                    id: doc.id,
                    ...doc.data(),
                    normalizedTimestamp, // Add normalized timestamp for sorting
                };
            })

            .filter(notification => {
                // Filter notifications based on timestamp and status
                const { normalizedTimestamp, status } = notification;
                const fiveDaysAgo = new Date();
                fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

                return (
                    status === "unopen" || // Include unopen notifications
                    (normalizedTimestamp && normalizedTimestamp >= fiveDaysAgo) // Or notifications from the last 5 days
                );
            })
            .sort((a, b) => {
                // Sort notifications in descending order of normalized timestamp
                return b.normalizedTimestamp - a.normalizedTimestamp;
            });

        // If no notifications, show a message
        if (!notifications.length) {
            notificationList.innerHTML = "<p>No notifications found.</p>";
            return;
        }

        // Fetch and cache usernames for all sender IDs
        const senderIds = [...new Set(notifications.map(n => n.senderId))]; // Unique sender IDs

        for (const senderId of senderIds) {
            if (senderId) {
                try {
                    const userDoc = await getDoc(doc(db, "users", senderId)); // Fetch user document
                    usernames[senderId] = userDoc.exists() ? userDoc.data().username || "Unknown" : "Unknown"; // Cache username
                } catch (error) {
                    console.error(`Error fetching user with ID ${senderId}:`, error);
                    usernames[senderId] = "Unknown"; // Fallback if fetching fails
                }
            }
        }
        renderNotifications(); // Render the notifications

        // Attach search and filter listeners
        searchInput.addEventListener("input", renderNotifications); // Update on search input
        filterDropdown.addEventListener("change", () => {
            console.log("Dropdown changed to:", filterDropdown.value); // Debugging log
            renderNotifications(); // Trigger a re-render immediately
        });


        // Handle delete notification action
        notificationList.addEventListener("click", async event => {
            if (event.target.classList.contains("delete-notification")) {
                const notificationId = event.target.parentElement.dataset.id;  // Get the ID of the notification to delete
                await deleteDoc(doc(db, "Notifications", notificationId)); // Delete the notification from Firestore
                console.log(`Notification ${notificationId} deleted.`); // Log the action
                notifications = notifications.filter(n => n.id !== notificationId); // Remove from local array
                renderNotifications(); // Update the UI
            }
        });
    } catch (error) {
        console.error("Error fetching notifications:", error); // Log errors
        notificationList.innerHTML = "<p>Error loading notifications. Please try again later.</p>";
    }
}

// Function to render notifications based on search and filter
export function renderNotifications() {
    const searchInput = document.getElementById("notification-search"); // Get search input
    const filterDropdown = document.getElementById("notification-filter"); // Get filter dropdown
    const notificationList = document.getElementById("notification-list"); // Get notification list container

    const searchQuery = searchInput.value.toLowerCase(); // Get search query
    const filterOption = filterDropdown.value; // Get selected filter option

    // Filter notifications based on the search query
    let filteredNotifications = notifications.filter(notification => {
        const senderUsername = usernames[notification.senderId]?.toLowerCase() || "unknown";
        const message = getMessage(notification, senderUsername).toLowerCase();
        return message.includes(searchQuery);
    });

    // Sort notifications dynamically based on the filter option
    if (filterOption === "latest") {
        filteredNotifications = filteredNotifications.sort((a, b) => new Date(b.normalizedTimestamp) - new Date(a.normalizedTimestamp));
    } else if (filterOption === "oldest") {
        filteredNotifications = filteredNotifications.sort((a, b) => new Date(a.normalizedTimestamp) - new Date(b.normalizedTimestamp));
    }
    console.log("Filter Option:", filterOption);
    console.log("Filtered Notifications After Sorting:", filteredNotifications);



    // Update the DOM with filtered notifications
    notificationList.innerHTML = filteredNotifications
        .map(notification => {
            const senderUsername = usernames[notification.senderId] || "Unknown"; // Get sender username

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

            const message = getMessage(notification, senderUsername); // Get notification message
            // Format the timestamp to be readable
            const readableTimestamp = new Date(notification.timestamp).toLocaleString();

            return `
            <div class="notification-item" data-id="${notification.id}">
                <span>${message}</span> <!-- Notification message -->
                <small class="notification-time">${timeAgo}</small> <!-- Relative time -->
                <button class="delete-notification">Delete</button> <!-- Delete button -->
            </div>
        `;
        }).join(""); // Combine all notification HTML

    // listener to notification cards AFTER the DOM is updated
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

// Generate a dynamic notification message based on its category
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
    const seconds = Math.floor((now - past) / 1000); // Difference in seconds

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
            createNotificationPopup(); // Create popup if it doesn't exist
        }
        openPopup(); // Open the popup
    });
}
