import { db } from './firebaseConfig.js';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Function to fetch and display user details
async function displayUserProfile() {
    const userId = localStorage.getItem('selectedUserId'); // Retrieve the user ID
    if (!userId) {
        alert('No user selected!');
        window.location.href = 'UserManagement.html'; // Redirect if no ID found
        return;
    }

    try {
        console.log('Fetching data for user ID:', userId); // Debugging

        // Fetch user document from Firestore
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            alert('User not found!');
            window.location.href = 'UserManagement.html'; // Redirect if user not found
            return;
        }

        console.log('User data fetched:', userDoc.data()); // Debugging

        updateUserProfile(userDoc.data()); // Display user data
    } catch (error) {
        console.error('Error fetching user data:', error);
        alert('An error occurred while fetching the user data.');
    }
}


// Function to update the user profile on the page
function updateUserProfile(userData) {
    console.log('Updating profile with data:', userData); // Debugging

    const profileCard = document.querySelector('.profile-card');
    const profileImage = userData.profilePic || 'https://placehold.co/100x100';

    profileCard.innerHTML = `
        <img src="${profileImage}" alt="Profile picture of ${userData.firstName || 'User'}">
        <h2>${userData.firstName || 'Unknown'} ${userData.lastName || ''}</h2>
        <p>Username: ${userData.username || 'N/A'}</p>
        <p>Email: ${userData.email || 'N/A'}</p>
        <p>Phone: ${userData.phone || 'N/A'}</p>
        <div class="stats">
            <div>
                <span>${userData.followersCount || 0}</span>
                Followers
            </div>
            <div>
                <span>${userData.followingCount || 0}</span>
                Following
            </div>
            <div>
                <span>${userData.postsCount || 0}</span>
                Posts
            </div>
        </div>
    `;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', displayUserProfile);



// Function to fetch and display user activity logs
async function displayUserActivity(userId) {
    try {
        const activityLogsRef = collection(db, 'ActivityLogs');
        const q = query(activityLogsRef, where('userId', '==', userId)); // Query for logs by the user
        const querySnapshot = await getDocs(q);

        const activityList = document.querySelector('.user-activity');
        activityList.innerHTML = '<h3>User Activity</h3>'; // Reset the activity list

        if (querySnapshot.empty) {
            activityList.innerHTML += '<p>No activity found for this user.</p>';
            return;
        }

        querySnapshot.forEach((docSnapshot) => {
            const activity = docSnapshot.data();

            // Convert Firestore Timestamp to a readable date
            const timestamp = activity.timestamp instanceof Timestamp
                ? activity.timestamp.toDate().toLocaleString()
                : 'Unknown Time';

            activityList.innerHTML += `
                <div class="activity-item">
                    <p>${activity.message || 'No message available'}</p>
                    <span>${timestamp}</span>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error fetching user activity:', error);
        const activityList = document.querySelector('.user-activity');
        activityList.innerHTML = '<p>Error loading user activity logs.</p>';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', displayUserProfile);


document.addEventListener('DOMContentLoaded', async () => {
    await displayUserProfile();
    const userId = localStorage.getItem('selectedUserId'); // Ensure we pass the correct userId
    if (userId) {
        await displayUserActivity(userId); // Call the activity display function
    }
});
