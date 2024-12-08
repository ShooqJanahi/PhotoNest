// Import Firebase modules
import { db, auth } from './firebaseConfig.js';
import { doc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    checkUserAuthentication();

    // Handle tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelector('.tab.active').classList.remove('active');
            tab.classList.add('active');

            const selectedTab = tab.textContent.trim();
            if (selectedTab === 'Inbox') {
                loadInbox();
            } else if (selectedTab === 'Sent') {
                loadSentMessages();
            }
        });
    });

    // Handle message sending
    const sendButton = document.querySelector('.message-input button');
    const messageInput = document.querySelector('.message-input input');
    sendButton.addEventListener('click', async () => {
        const messageText = messageInput.value.trim();
        if (!messageText) {
            alert('Please type a message before sending.');
            return;
        }
        await sendMessage(messageText);
        messageInput.value = ''; // Clear the input field
    });
});

// Check user authentication
function checkUserAuthentication() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../html/Login.html'; // Redirect if not logged in
        } else {
            const loggedInUserId = user.uid;
            localStorage.setItem('loggedInUserId', loggedInUserId); // Store user ID for later use
            loadInbox(); // Load inbox messages by default
        }
    });
}

// Load inbox messages
async function loadInbox() {
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    const inboxQuery = query(
        collection(db, 'Messages'),
        where('receiverId', '==', loggedInUserId)
    );

    const messagesSnapshot = await getDocs(inboxQuery);
    const recentConversations = document.querySelector('.recent-conversations');
    recentConversations.innerHTML = ''; // Clear previous messages

    if (messagesSnapshot.empty) {
        recentConversations.innerHTML = '<p>No messages in your inbox.</p>';
        return;
    }

    for (const doc of messagesSnapshot.docs) { // Use a for...of loop
        const messageData = doc.data();
        const messageElement = await createMessageElement(messageData, 'inbox'); // Await the DOM element
        recentConversations.appendChild(messageElement);
    }
}


// Load sent messages
async function loadSentMessages() {
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    const sentQuery = query(
        collection(db, 'Messages'),
        where('senderId', '==', loggedInUserId)
    );

    const messagesSnapshot = await getDocs(sentQuery);
    const recentConversations = document.querySelector('.recent-conversations');
    recentConversations.innerHTML = ''; // Clear previous messages

    if (messagesSnapshot.empty) {
        recentConversations.innerHTML = '<p>No sent messages.</p>';
        return;
    }

    const messageElements = await Promise.all(messagesSnapshot.docs.map(async (doc) => {
        const messageData = doc.data();
        return await createMessageElement(messageData, 'sent');
    }));

    messageElements.forEach((element) => recentConversations.appendChild(element));
}



const usernameCache = {}; // Cache for usernames

async function fetchUsernameById(userId) {
    if (usernameCache[userId]) {
        return usernameCache[userId];
    }
    try {
        const userDoc = await getDocs(query(collection(db, 'Users'), where('uid', '==', userId)));
        if (!userDoc.empty) {
            const username = userDoc.docs[0].data().username || 'Unknown User';
            usernameCache[userId] = username; // Cache it
            return username;
        }
        return 'Unknown User';
    } catch (error) {
        console.error('Error fetching username:', error);
        return 'Unknown User';
    }
}


// Create a message element for display
async function createMessageElement(messageData, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('conversation');

    const userId = type === 'inbox' ? messageData.senderId : messageData.receiverId;
    const username = await fetchUsernameById(userId); // Fetch username

    const senderLabel = type === 'inbox' ? 'Sender' : 'To';

    const isPhotoMessage = !!messageData.photoId; // Check if it's a photo message
    const messageContent = isPhotoMessage
        ? `<a href="../html/ViewImage.html" onclick="savePhotoIdToLocalStorage('${messageData.photoId}')">[Photo]</a>`
        : messageData.messageText;

    messageElement.innerHTML = `
        <i class="fas fa-user-circle"></i>
        <div class="conversation-text">
            <strong>${senderLabel}: ${username}</strong><br>
            ${messageContent}
        </div>
        <div class="conversation-time">${formatTimestamp(messageData.timestamp)}</div>
    `;

    return messageElement;
}


// Format timestamp to a readable format
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}



// Mark a message as read
async function markMessageAsRead(messageId) {
    try {
        const messageRef = doc(db, 'Messages', messageId);
        await updateDoc(messageRef, { status: 'Read' });
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Save the photoId to localStorage and redirect to ViewImage.html
function savePhotoIdToLocalStorage(photoId) {
    localStorage.setItem('photoId', photoId);
}


// Fetch user ID by username
async function fetchUserIdByUsername(username) {
    try {
        // Query the Users collection for a matching username
        const userQuery = query(collection(db, 'Users'), where('username', '==', username));
        const userSnapshot = await getDocs(userQuery);

        // Check if a matching user was found
        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0]; // Take the first result (assuming usernames are unique)
            return userDoc.data().uid; // Return the user ID
        }

        // If no user is found, display an alert
        alert('Username not found. Please try again.');
        return null;
    } catch (error) {
        console.error('Error fetching user ID by username:', error);
        alert('Failed to resolve username. Please try again.');
        return null;
    }
}


// Send a new message
async function sendMessage(messageText, receiverUsername = null, photoId = null) {
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    const receiverUsernameInput = receiverUsername || prompt('Enter the receiver username:'); // Prompt for username if not provided

    if (!receiverUsernameInput) {
        alert('Receiver username is required.');
        return;
    }

    // Resolve the username to a user ID
    const receiverUserId = await fetchUserIdByUsername(receiverUsernameInput);

    if (!receiverUserId) {
        // Stop if the username couldn't be resolved
        return;
    }

    try {
        // Add the message to the Messages collection
        await addDoc(collection(db, 'Messages'), {
            senderId: loggedInUserId,
            receiverId: receiverUserId,
            messageText,
            photoId,
            status: 'Unread',
            timestamp: serverTimestamp(),
        });

        alert('Message sent successfully!');
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send the message.');
    }
}
