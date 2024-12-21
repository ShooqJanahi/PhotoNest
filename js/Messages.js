import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { serverTimestamp, orderBy, collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js"; // Firebase configuration import

// Initialize Firebase Authentication
const auth = getAuth();

//Defining and access UI elements from the DOM
const createMessagePopup = document.getElementById("createMessagePopup"); // Popup modal for creating a new message
const createMessageForm = document.getElementById("createMessageForm"); // Form element within the popup
const receiverUsernameInput = document.getElementById("receiverUsername"); // Input field for entering the recipient's username
const autocompleteList = document.getElementById("autocompleteList"); // List element to display autocomplete suggestions for usernames
const messageSubjectInput = document.getElementById("messageSubject"); // Input field for the message subject
const messageTextInput = document.getElementById("messageText"); // Text area for entering the message text
const cancelCreateMessageButton = document.getElementById("cancelCreateMessage"); // Button to cancel and close the popup
const createMessageButton = document.getElementById("createNewMessage"); // Button to open the "Create New Message" popup

// Show the popup when the "Create New Message" button is clicked
createMessageButton.addEventListener("click", () => {
    createMessagePopup.classList.remove("hidden"); // Make the popup visible
});

// Hide the popup when the cancel button is clicked
cancelCreateMessageButton.addEventListener("click", () => {
    createMessagePopup.classList.add("hidden");  // Hide the popup
});

// Handle input for recipient's username to implement autocomplete functionality
receiverUsernameInput.addEventListener("input", async () => {
    const searchQuery = receiverUsernameInput.value.trim().toLowerCase(); // Get the text the user has typed, in lowercase for case-insensitive search
    if (!searchQuery) {
        autocompleteList.innerHTML = ""; // If input is empty, clear the autocomplete suggestions
        return;
    }
    const usersRef = collection(db, "users"); // Reference the "users" collection in Firestore
    const q = query(usersRef, where("role", "==", "user")); // Only fetch users with role 'user'
    const querySnapshot = await getDocs(q); // Fetch users from Firestore

    // Filter users whose usernames match the input text
    const matchingUsers = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.username?.toLowerCase().includes(searchQuery));

    // Render the list of matching usernames as suggestions
    autocompleteList.innerHTML = matchingUsers
        .map(
            (user) =>
                `<li data-user-id="${user.id}">
                    <img src="${user.profilePic || "../assets/Default_profile_icon.jpg"}" alt="${user.username}">
                    <span>${user.username}</span>
                </li>`
        )
        .join("");

    // Handle selection of username from autocomplete
    autocompleteList.querySelectorAll("li").forEach((item) => {
        item.addEventListener("click", () => {
            receiverUsernameInput.value = item.querySelector("span").textContent; // Set the input field to the selected username
            receiverUsernameInput.dataset.userId = item.dataset.userId; // Save the userId in a custom data attribute 
            autocompleteList.innerHTML = ""; // Clear the autocomplete list after selection
        });
    });
});

// Handle form submission to send the message
createMessageForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent the default form submission behavior (page reload)

    const senderId = auth.currentUser?.uid; // Get the current logged-in user's ID
    const receiverUsername = receiverUsernameInput.value.trim(); // Get the recipient's username from the input field
    const receiverId = receiverUsernameInput.dataset.userId; // Retrieve the userId from the dataset
    const subject = messageSubjectInput.value.trim(); // Get the subject from the input field
    const messageText = messageTextInput.value.trim(); // Get the message content from the text area

    // Validate if sender and receiver IDs are present
    if (!senderId || !receiverId) {
        alert("Please select a valid recipient.");
        return; // Exit the function if validation fails
    }

    try {
        // Add the message to the Firestore "Messages" collection
        const messageRef = await addDoc(collection(db, "Messages"), {
            senderId,
            receiverId,
            subject,
            messageText,
            status: "Unread", // Mark the message as unread initially
            timestamp: serverTimestamp(), // Add a server-generated timestamp
        });

        alert("Message sent successfully!"); // Notify the user
        createMessagePopup.classList.add("hidden"); // Close the popup
        createMessageForm.reset(); // Reset the form inputs

        // Send a notification to the recipient
        await sendNotification(receiverId, senderId, "message", {
            messageId: messageRef.id,
        });


        location.reload(); // Reload the page after successfully sending the message

    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send the message. Please try again.");
    }
});


document.addEventListener("DOMContentLoaded", () => {
    const auth = getAuth();
    const inboxTab = document.querySelector(".tab:nth-child(1)");
    const sentTab = document.querySelector(".tab:nth-child(2)");
    const messageCardsContainer = document.querySelector(".message-cards");
    const messageSubjectCard = document.querySelector(".message-subject-card");
    const messageContentCard = document.querySelector(".message-content-card");
    const searchBarInput = document.querySelector(".search-bar input");

    let messages = []; // To store fetched messages
    let activeTab = "inbox"; // Default tab

    // Handle tab switching
    inboxTab.addEventListener("click", () => {
        activeTab = "inbox";
        inboxTab.classList.add("active");
        sentTab.classList.remove("active");
        renderMessages();
    });

    sentTab.addEventListener("click", () => {
        activeTab = "sent";
        sentTab.classList.add("active");
        inboxTab.classList.remove("active");
        renderMessages();
    });

    // Fetch messages when user is logged in
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userId = user.uid;
                console.log("Logged in user ID:", userId);

                // Fetch both Inbox and Sent messages
                const inboxMessages = await fetchMessages("receiverId", userId);
                const sentMessages = await fetchMessages("senderId", userId);

                // Resolve usernames for senderId and receiverId
                await resolveUsernames([...inboxMessages, ...sentMessages]);

                // Combine and store messages locally
                messages = { inbox: inboxMessages, sent: sentMessages };

                // Render Inbox messages by default
                renderMessages();
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        } else {
            console.log("No user is logged in.");
            // Redirect to login page
            window.location.href = "../html/Login.html";
        }
    });

    // Fetch messages based on field and user ID
    async function fetchMessages(field, userId) {
        try {
            const messagesRef = collection(db, "Messages");
            const q = query(
                messagesRef,
                where(field, "==", userId),
                orderBy("timestamp", "desc") // Fetch messages in descending order
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        } catch (error) {
            console.error(`Error fetching ${field} messages:`, error);
            return [];
        }
    }


    // Resolve usernames for senderId and receiverId
    async function resolveUsernames(messages) {
        const userCache = new Map(); // Cache to avoid duplicate lookups

        for (const message of messages) {
            // Fetch sender's username and profile picture
            if (message.senderId && !userCache.has(message.senderId)) {
                const senderDoc = await getDoc(doc(db, "users", message.senderId));
                if (senderDoc.exists()) {
                    const senderData = senderDoc.data();
                    userCache.set(message.senderId, {
                        username: senderData.username || "Unknown",
                        profilePic: senderData.profilePic || "../assets/Default_profile_icon.jpg",
                    });
                } else {
                    userCache.set(message.senderId, {
                        username: "Unknown",
                        profilePic: "../assets/Default_profile_icon.jpg",
                    });
                }
            }

            // Fetch receiver's username and profile picture
            if (message.receiverId && !userCache.has(message.receiverId)) {
                const receiverDoc = await getDoc(doc(db, "users", message.receiverId));
                if (receiverDoc.exists()) {
                    const receiverData = receiverDoc.data();
                    userCache.set(message.receiverId, {
                        username: receiverData.username || "Unknown",
                        profilePic: receiverData.profilePic || "../assets/Default_profile_icon.jpg",
                    });
                } else {
                    userCache.set(message.receiverId, {
                        username: "Unknown",
                        profilePic: "../assets/Default_profile_icon.jpg",
                    });
                }
            }

            // Attach resolved usernames and profile pictures to the message object
            message.senderUsername = userCache.get(message.senderId).username;
            message.senderProfilePic = userCache.get(message.senderId).profilePic;
            message.receiverUsername = userCache.get(message.receiverId).username;
            message.receiverProfilePic = userCache.get(message.receiverId).profilePic;
        }
    }


    // Render messages in the selected tab (Inbox or Sent)
    function renderMessages() {
        const tabMessages = messages[activeTab] || [];
        const searchQuery = searchBarInput.value.trim().toLowerCase();
        const userId = auth.currentUser?.uid;

        // Filter messages by search query and deletion flags
        const filteredMessages = tabMessages.filter((msg) => {
            const isDeleted =
                (msg.senderId === userId && msg.deletedBySender) ||
                (msg.receiverId === userId && msg.deletedByReceiver);

            const matchesSearchQuery =
                !isDeleted &&
                (msg.subject?.toLowerCase().includes(searchQuery) || // Match subject
                    msg.messageText?.toLowerCase().includes(searchQuery) || // Match message text
                    msg.senderUsername?.toLowerCase().includes(searchQuery) || // Match sender username
                    msg.receiverUsername?.toLowerCase().includes(searchQuery)); // Match receiver username

            return matchesSearchQuery;
        });
        // Sort messages by timestamp in descending order
        const sortedMessages = filteredMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp);
            const timeB = new Date(b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp);
            return timeB - timeA;
        });
        // Clear previous messages
        messageCardsContainer.innerHTML = "";

        if (sortedMessages.length === 0) {
            messageCardsContainer.innerHTML = `<p>No messages found.</p>`;
            return;
        }
        // Render message cards
        sortedMessages.forEach((msg) => {
            const messageCard = document.createElement("div");
            messageCard.classList.add("message-card");

            // Highlight unread messages only in the Inbox tab
            if (activeTab === "inbox" && msg.status === "Unread") {
                messageCard.classList.add("unread");
            }

            // Determine which username and profile picture to display
            const isInbox = activeTab === "inbox";
            const displayUsername = isInbox ? msg.senderUsername : msg.receiverUsername;
            const displayProfilePic = isInbox
                ? msg.senderProfilePic || "../assets/Default_profile_icon.jpg"
                : msg.receiverProfilePic || "../assets/Default_profile_icon.jpg";

            // Render the message card
            messageCard.innerHTML = `
            <i 
                class="profile-pic" 
                style="background-image: url('${displayProfilePic}');"
            ></i>
            <div class="message-info">
                <div class="message-details">
                    <strong>${displayUsername || "Unknown"}</strong>
                    <span class="message-subject">${msg.subject || "No Subject"}</span>
                </div>
                <div class="message-timestamp">
                    ${getRelativeTime(msg.timestamp)}
                </div>
                
            </div>
            <div class="message-options">
                <i class="fas fa-ellipsis-v options-icon"></i>
                <div class="options-menu">
                    <button class="option-reply">Reply</button>
                    <button class="option-delete">Delete</button>
                    <button class="option-report">Report</button>
                </div>
            </div>
        </div>

        `;
            //Mark as read only in the Inbox tab
            if (activeTab === "inbox") {
                messageCard.addEventListener("click", async () => {
                    await markMessageAsRead(msg.id); // Mark the message as read in Firestore
                    messageCard.classList.remove("unread"); // Update UI dynamically
                    displayMessage(msg); // Display the full message
                });
            } else {
                // For Sent tab, just display the message details without updating status
                messageCard.addEventListener("click", () => {
                    displayMessage(msg);
                });
            }
            messageCardsContainer.appendChild(messageCard);

            // Toggle the options menu visibility on icon click
            const optionsIcon = messageCard.querySelector(".options-icon");
            const optionsMenu = messageCard.querySelector(".options-menu");

            optionsIcon.addEventListener("click", (event) => {
                event.stopPropagation(); // Prevent event from propagating to the card
                optionsMenu.classList.toggle("show");
            });

            // Close the options menu if clicked outside
            document.addEventListener("click", () => {
                optionsMenu.classList.remove("show");
            });

            // Add specific functionality for each menu option
            optionsMenu.querySelector(".option-reply").addEventListener("click", () => {
                receiverUsernameInput.value = displayUsername; // Prefill recipient username
                createMessagePopup.classList.remove("hidden"); // Show create message popup
            });

            // Report Message
            optionsMenu.querySelector(".option-report").addEventListener("click", async () => {
                try {

                    // Resolve the sender's username
                    const senderDoc = await getDoc(doc(db, "users", msg.senderId));
                    const senderUsername = senderDoc.exists()
                        ? senderDoc.data().username || "Unknown"
                        : "Unknown";

                    // Add the reported message to the Reports collection
                    await addDoc(collection(db, "Reports"), {
                        category: "message",
                        messageId: msg.id, // Message ID
                        ReportedUsername: senderUsername, // Include the username of the sender
                        reportedBy: auth.currentUser?.uid, // User reporting the message
                        reason: "User-reported issue", // Add specific reason if available
                        status: "Pending Review",
                        timestamp: new Date().toISOString(),
                    });

                    alert("Message reported successfully. Thank you for your feedback.");
                } catch (error) {
                    console.error("Error reporting message:", error);
                    alert("Failed to report the message. Please try again.");
                }

                optionsMenu.classList.remove("show"); // Hide the options menu
            });

            // Delete Message
            optionsMenu.querySelector(".option-delete").addEventListener("click", async () => {
                if (confirm("Are you sure you want to delete this message?")) {
                    try {
                        const userId = auth.currentUser?.uid; // Get the logged-in user's ID
                        const messageRef = doc(db, "Messages", msg.id); // Reference to the message document in Firestore
                        const messageSnap = await getDoc(messageRef); // Get the message document

                        if (messageSnap.exists()) {
                            const messageData = messageSnap.data();

                            // Determine which "deleted" field to update based on user role (sender or receiver)
                            const updateField =
                                messageData.senderId === userId ? { deletedBySender: true } : { deletedByReceiver: true };

                            // Update the Firestore document with the deletion flag
                            await updateDoc(messageRef, updateField);

                            alert("Message deleted successfully.");

                            // Remove the message from the local `messages` array to update the UI.
                            messages[activeTab] = messages[activeTab].filter(
                                (m) => m.id !== msg.id // Exclude the deleted message by ID.
                            );

                            renderMessages(); // Re-render messages without reloading the page.

                        } else {
                            alert("Message not found.");
                        }
                    } catch (error) {
                        console.error("Error deleting message:", error);
                        alert("Failed to delete the message. Please try again.");
                    }
                }
                optionsMenu.classList.remove("show"); // Hide the options menu
            });

            // Add click event to show full message
            messageCard.addEventListener("click", () => {
                displayMessage(msg);
            });

            messageCardsContainer.appendChild(messageCard);
        });
    }

    function getRelativeTime(timestamp) {
        const now = new Date();
        let messageTime;

        // Normalize Firestore Timestamp or ISO string
        if (typeof timestamp?.toDate === "function") {
            messageTime = timestamp.toDate(); // Firestore Timestamp
        } else if (typeof timestamp === "string") {
            messageTime = new Date(timestamp); // ISO string
        } else {
            console.warn("Invalid timestamp format:", timestamp);
            return "Unknown time";
        }

        const diffInSeconds = Math.floor((now - messageTime) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds} seconds ago`;
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? "s" : ""} ago`;
        } else if (diffInSeconds < 2592000) {
            const weeks = Math.floor(diffInSeconds / 604800);
            return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
        } else {
            const months = Math.floor(diffInSeconds / 2592000);
            return `${months} month${months > 1 ? "s" : ""} ago`;
        }
    }


    async function markMessageAsRead(messageId) {
        try {
            const messageRef = doc(db, "Messages", messageId);
            await updateDoc(messageRef, { status: "read" });
            console.log(`Message ${messageId} marked as read.`);
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    }

    // Display full message details
    function displayMessage(message) {
        // Format the timestamp
        let formattedTimestamp = "Unknown Date";
        if (message.timestamp) {
            if (typeof message.timestamp.toDate === "function") {
                // Firestore Timestamp
                formattedTimestamp = message.timestamp.toDate().toLocaleString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true, // Optional: Use 12-hour format
                });
            } else if (typeof message.timestamp === "string" || message.timestamp instanceof Date) {
                // ISO string or Date object
                formattedTimestamp = new Date(message.timestamp).toLocaleString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true, // Optional: Use 12-hour format
                });
            } else {
                console.warn("Unknown timestamp format:", message.timestamp);
            }
        }

        // Update Subject Card
        messageSubjectCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Subject</h3>
            <span style="font-size: 12px; color: #888;">${formattedTimestamp}</span> <!-- Date and Time -->
        </div>
        <p>${message.subject || "No Subject"}</p>
    `;

        // Update Content Card
        let linkHTML = "";
        if (message.photoId) {
            linkHTML = `
            <p>
                <a href="ViewImage.html" id="viewPhotoLink">View this photo</a>
            </p>
        `;
        } else if (message.albumId) {
            // For shared album
            linkHTML = `
                <p>
                    <a href="PhotoGallery.html" id="viewAlbumLink">View this album</a>
                </p>
            `;
        }

        messageContentCard.innerHTML = `
        <h3>Message</h3>
        <p>${message.messageText || "No message content available."}</p>
        ${linkHTML}
    `;

        // event listener to the photo link (if it exists)
        const viewPhotoLink = document.getElementById("viewPhotoLink");
        if (viewPhotoLink) {
            viewPhotoLink.addEventListener("click", (event) => {
                event.preventDefault(); // Prevent default link behavior
                localStorage.setItem("photoId", message.photoId); // Store photoId in localStorage
                window.location.href = "ViewImage.html"; // Redirect to ViewImage.html
            });
        }
        //event listener for the album link (if present)
        const viewAlbumLink = document.getElementById("viewAlbumLink");
        if (viewAlbumLink) {
            viewAlbumLink.addEventListener("click", (event) => {
                event.preventDefault(); // Prevent default behavior
                localStorage.setItem('currentAlbumId', message.albumId); // Save albumId in localStorage
                window.location.href = "PhotoGallery.html"; // Redirect to PhotoGallery.html
            });
        }
    }



    // Handle search functionality
    searchBarInput.addEventListener("input", () => {
        renderMessages();
    });
});



/**
 * Sends a notification to the specified user.
 * @param {string} receiverId - The ID of the user receiving the notification.
 * @param {string} senderId - The ID of the user sending the notification.
 * @param {string} category - The type of notification (e.g., "message").
 * @param {string} additionalData - Additional data related to the notification.
 */
async function sendNotification(receiverId, senderId, category, additionalData) {
    try {
        console.log("Sending notification with data:", {
            receiverId,
            senderId,
            category,
            ...additionalData,
        });

        // Add a notification document to Firestore
        await addDoc(collection(db, "Notifications"), {
            receiverId,
            senderId,
            category,
            status: "unopen",
            timestamp: serverTimestamp(), // Use server-generated timestamp
            ...additionalData, // Include additional data dynamically
        });

        console.log("Notification sent successfully.");
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

