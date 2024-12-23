import { db } from './firebaseConfig.js'; // Import the Firestore database configuration
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, Timestamp, addDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'; // Import Firestore functions for database operations

// Function to fetch and display user details
async function displayUserProfile() {
    const userId = localStorage.getItem('selectedUserId'); // Retrieve the selected user ID from local storage
    
    if (!userId) {
        // If no user ID is found, show an alert and redirect to the User Management page
        alert('No user selected!');
        window.location.href = 'UserManagement.html'; // Redirect if no ID found
        return;
    }

    try {
        console.log('Fetching data for user ID:', userId); // Debugging

         // Fetch the user's document from the Firestore database
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
             // If the user document doesn't exist, show an alert and redirect
            alert('User not found!');
            window.location.href = 'UserManagement.html'; // Redirect if user not found
            return;
        }

        console.log('User data fetched:', userDoc.data()); // Debugging

        updateUserProfile(userDoc.data()); // Update the profile display with the fetched user data
    } catch (error) {
        console.error('Error fetching user data:', error); // Log any errors during the fetch process
        alert('An error occurred while fetching the user data.');
    }
}


// Function to update the user profile on the page
function updateUserProfile(userData) {
    console.log('Updating profile with data:', userData); // Debugging

    const profileCard = document.querySelector('.profile-card'); // Select the HTML element where the profile will be displayed
    const profileImage = userData.profilePic || '../assets/Default_profile_icon.jpg'; // Use the user's profile picture or a default image if none exists

     // Dynamically create and insert HTML to display user details
    profileCard.innerHTML = `
        <img src="${profileImage}" alt="Profile picture of ${userData.firstName || 'User'}">
        <h2>${userData.firstName || 'Unknown'} ${userData.lastName || ''}</h2>
        <p>@${userData.username || 'N/A'}</p>
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



// Function to fetch and display user activity logs
async function displayUserActivity(userId) {
    try {
        const activityLogsRef = collection(db, 'ActivityLogs'); // Reference the `ActivityLogs` collection in Firestore
        const q = query(activityLogsRef, where('userId', '==', userId));  // Create a query to get logs specific to the selected user
        const querySnapshot = await getDocs(q); // Execute the query and fetch matching documents

        const activityList = document.querySelector('.user-activity'); // Select the HTML element where activity logs will be displayed
        activityList.innerHTML = '<h3>User Activity</h3>'; // Reset the activity list and add a header

        // If no logs are found, display a message
        if (querySnapshot.empty) {
            activityList.innerHTML += '<p>No activity found for this user.</p>';
            return;
        }

        // Initialize an empty array to store activity data
        const activities = [];

         // Loop through each activity log document
        querySnapshot.forEach((docSnapshot) => {
            const activity = docSnapshot.data();  // Get the log data

             // Convert the timestamp to a readable date and time format
            let timestamp = 'Unknown Time';
            if (activity.timestamp instanceof Timestamp) {
                // Firestore Timestamp
                timestamp = activity.timestamp.toDate().toLocaleString();
            } else if (typeof activity.timestamp === 'string') {
                // String format
                timestamp = new Date(activity.timestamp).toLocaleString();
            }

            // Add the activity data to the array
            activities.push({
                message: activity.message || 'No message available',
                timestamp: timestamp,
            });
        });

        // Create a container for activity logs
        const activityWrapper = document.createElement('div');
        activityWrapper.className = 'activity-wrapper';

        // Loop through the activities and create HTML elements for each
        activities.forEach((activity, index) => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.dataset.index = index;

            activityItem.innerHTML = `
                <p>${activity.message}</p>
                <span>${activity.timestamp}</span>
            `;
            
            activityWrapper.appendChild(activityItem);// Add the activity item to the container
        });

        activityList.appendChild(activityWrapper); // Append the activity container to the page

        initializeActivitySliding(activityWrapper, activities.length); // Add sliding functionality to navigate through logs
    } catch (error) {
        console.error('Error fetching user activity:', error);  // Log any errors during the fetch process
        const activityList = document.querySelector('.user-activity');
        activityList.innerHTML = '<p>Error loading user activity logs.</p>';
    }
}




document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('selectedUserId'); // Retrieve the user ID when the page loads
   
     // If a user is selected, display their data
    if (userId) {
        await displayUserProfile();
        await displayUserActivity(userId); // Call the activity display function
        await displayAdminNotes(userId); // Load notes for the selected user
        await initActivityChart(userId); // Initialize the activity chart for the selected user
    }else {
        // Redirect if no user is selected
        alert('No user selected!');
        window.location.href = 'UserManagement.html';
        return;
    }

});




//================ Admin note section ================================

// Function to fetch and display Admin Notes
async function displayAdminNotes(userId) {
    try {
        const adminNotesRef = collection(db, 'AdminNote');  // Reference the 'AdminNote' collection in Firestore
        const q = query(adminNotesRef, where('userId', '==', userId)); // Query to fetch admin notes related to the specific user
        const querySnapshot = await getDocs(q); // Execute the query and fetch documents

        const adminNotesContainer = document.querySelector('.admin-notes');  // Select the HTML container for admin notes
        adminNotesContainer.innerHTML = ''; // Clear any existing content in the notes section

        // Define the header with a title
        const header = `
            <div class="admin-notes-header">
                <h3>Admin Notes</h3>
            </div>
        `;
        adminNotesContainer.innerHTML += header; // Add the header to the notes section

        // If no notes are found, display a message
        if (querySnapshot.empty) {
            adminNotesContainer.innerHTML += '<p>No notes found for this user.</p>';
            return;
        }

        const notesWrapper = document.createElement('div'); // Create a wrapper for the notes
        notesWrapper.className = 'notes-wrapper'; // Assign a class for styling

        // Loop through each fetched admin note document
        for (const docSnapshot of querySnapshot.docs) {
            const note = docSnapshot.data(); // Get the note data

              // Fetch the admin's details (username and profile picture)
            const adminDocRef = doc(db, 'users', note.adminId);
            const adminDoc = await getDoc(adminDocRef);

            const adminData = adminDoc.exists()
                ? adminDoc.data()
                : { firstName: 'Unknown Admin', profilePic: '../assets/Default_profile_icon.jpg' };  // If admin data doesn't exist, set default values

            const timestamp = note.timestamp instanceof Timestamp
                ? note.timestamp.toDate()
                : new Date(note.timestamp); // Convert the timestamp to a date object

            // Create a note card for each admin note
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';

            // Add the note content, including the admin's profile, reason, and timestamp
            noteCard.innerHTML = `
                <div class="note-header">
                    <img src="${adminData.profilePic}" alt="Admin Profile" class="admin-avatar">
                    <span class="admin-username">${adminData.username}</span>
                </div>
                <div class="note-content">
                    <p>${note.reason || 'No reason provided'}</p>
                    <p>action: ${note.category || 'no action taken'}</p>
                </div>
                <div class="note-footer">
                    <span class="note-timestamp">${timestamp.toLocaleString()}</span>
                </div>
            `;

            notesWrapper.appendChild(noteCard);  // Append the note card to the wrapper
        }

        adminNotesContainer.appendChild(notesWrapper); // Append the wrapper with all note cards to the container

        // Enable sliding functionality for notes
        initializeSlidingView(notesWrapper);
    } catch (error) {
        console.error('Error fetching admin notes:', error); // Log errors during fetching
        const adminNotesContainer = document.querySelector('.admin-notes');
        adminNotesContainer.innerHTML = '<p>Error loading admin notes.</p>';  // Display an error message in the UI
    }
}



// Initialize sliding functionality for the notes
function initializeSlidingView(notesWrapper) {
    const notes = notesWrapper.children; // Get all notes as an array of elements
    const maxVisible = 2; // Max number of visible notes at a time

    // Hide all notes except the first `maxVisible` notes
    for (let i = maxVisible; i < notes.length; i++) {
        notes[i].style.display = 'none';
    }

    // Create slide navigation buttons
    const prevButton = document.createElement('button'); // Create a "Previous" button
    prevButton.textContent = 'Previous';
    prevButton.className = 'slide-prev'; // Add text and class for styling

    const nextButton = document.createElement('button'); // Create a "Next" button
    nextButton.textContent = 'Next';
    nextButton.className = 'slide-next';

    notesWrapper.parentElement.appendChild(prevButton); // Append the "Previous" button to the container
    notesWrapper.parentElement.appendChild(nextButton);  // Append the "Next" button to the container

    let startIndex = 0; // Initialize the start index for visible notes

    prevButton.addEventListener('click', () => {
        if (startIndex > 0) {  // If not at the first set of notes
            notes[startIndex + maxVisible - 1].style.display = 'none'; // Hide the last visible note
            startIndex--; // Move to the previous set
            notes[startIndex].style.display = 'block'; // Show the newly visible note
        }
    });

    nextButton.addEventListener('click', () => {
        if (startIndex + maxVisible < notes.length) {  // If there are more notes to show
            notes[startIndex].style.display = 'none'; // Hide the current first visible note
            startIndex++;  // Move to the next set
            notes[startIndex + maxVisible - 1].style.display = 'block'; // Show the newly visible note
        }
    });
}


//================ END of Admin note section ================================


function initializeActivitySliding(activityWrapper, totalActivities) {
    const activities = activityWrapper.children;
    const maxVisible = 5; // Max number of visible activities

    // Hide all activities except the first `maxVisible` ones
    for (let i = maxVisible; i < activities.length; i++) {
        activities[i].style.display = 'none';
    }

    // Create navigation container
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-container';

    const pageIndicator = document.createElement('span');
    pageIndicator.className = 'page-indicator';

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.className = 'slide-prev';

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.className = 'slide-next';

    // Append buttons and page indicator to the navigation container
    navContainer.appendChild(prevButton);
    navContainer.appendChild(pageIndicator);
    navContainer.appendChild(nextButton);

    // Append the navigation container to the parent of the activityWrapper
    activityWrapper.parentElement.appendChild(navContainer);

    let startIndex = 0;
    const totalPages = Math.ceil(totalActivities / maxVisible);

    function updateView() {
        // Show or hide activities based on the current index
        for (let i = 0; i < activities.length; i++) {
            activities[i].style.display = i >= startIndex && i < startIndex + maxVisible ? 'block' : 'none';
        }

        // Update the numeric page indicator
        const currentPage = Math.floor(startIndex / maxVisible) + 1;
        pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    }

    prevButton.addEventListener('click', () => {
        if (startIndex > 0) {
            startIndex -= maxVisible;
            updateView();
        }
    });

    nextButton.addEventListener('click', () => {
        if (startIndex + maxVisible < activities.length) {
            startIndex += maxVisible;
            updateView();
        }
    });

    // Initialize the view
    updateView();
}



//==================== activity chart ====================

// Load the Google Charts library
google.charts.load('current', { packages: ['corechart', 'line'] });
google.charts.setOnLoadCallback(initActivityChart); // Set the function to initialize the chart when the library is loaded

async function fetchActivityLogs(userId) {
    // Ensure a valid user ID is provided
    if (!userId) {
        console.error('User ID is required to fetch activity logs.');
        return {};
    }


    const logsRef = collection(db, 'ActivityLogs');  // Reference the `ActivityLogs` collection in Firestore
    const q = query(logsRef, where('userId', '==', userId)); // Query to fetch logs for the specific user
    const querySnapshot = await getDocs(q); // Execute the query and fetch documents

    const weeklyData = {}; // Initialize an empty object to store data grouped by weeks

    querySnapshot.forEach((doc) => {
        const log = doc.data(); // Get the log data

        // Handle both Firestore Timestamp and String formats
        let date = null;
        if (log.timestamp instanceof Timestamp) {
            date = log.timestamp.toDate();
        } else if (typeof log.timestamp === 'string') {
            date = new Date(log.timestamp);
        }

        if (!date) return;

        // Get the week number and year for grouping
        const weekYear = `${getWeekOfYear(date)}-${date.getFullYear()}`; // Get a unique identifier for each week (WeekNumber-Year)
        const category = log.category?.toLowerCase(); // Normalize the category string

        // Initialize weekly data if not already defined
        if (!weeklyData[weekYear]) {
            weeklyData[weekYear] = {};
        }

        const weekData = weeklyData[weekYear];
        const day = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Initialize daily data if not already defined
        if (!weekData[day]) {
            weekData[day] = { like: 0, comment: 0, photo: 0, follow: 0 }; // Initialize counts for the day
        }

         // Increment the relevant activity count based on the category
        if (category === 'like') {
            weekData[day].like += 1;
        } else if (category === 'comment' || category === 'commented') {
            weekData[day].comment += 1;
        } else if (category === 'photouploaded') {
            weekData[day].photo += 1;
        } else if (category === 'follow') {
            weekData[day].follow += 1;
        }
    });

    return weeklyData; // Return the grouped activity data
}



// Helper function to get the ISO week number
function getWeekOfYear(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const daysSinceFirstDay = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7);
}

async function initActivityChart(userId) {
    const weeklyData = await fetchActivityLogs(userId);

    // Check if weeklyData is empty
    if (!Object.keys(weeklyData).length) {
        console.warn('No activity data found!');
        document.getElementById('chart_div').textContent = 'No activity data available.';
        return;
    }

    // Populate the dropdown with weeks
    const weekSelector = document.getElementById('week-selector');
    weekSelector.innerHTML = ''; // Clear any existing options
    Object.keys(weeklyData).sort().forEach((week) => {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = `Week ${week}`;
        weekSelector.appendChild(option);
    });

    // Set an event listener for dropdown changes
    weekSelector.addEventListener('change', () => {
        const selectedWeek = weekSelector.value;
        drawActivityChart(weeklyData[selectedWeek]);
    });

    // Draw the initial chart for the first available week
    const initialWeek = Object.keys(weeklyData).sort()[0];
    weekSelector.value = initialWeek;
    drawActivityChart(weeklyData[initialWeek]);
}


function drawActivityChart(weekData) {
    const chartData = [['Date', 'Likes', 'Comments', 'Photos', 'Follow']];

    Object.keys(weekData)
        .sort() // Sort dates
        .forEach((date) => {
            chartData.push([
                date,
                weekData[date].like,
                weekData[date].comment,
                weekData[date].photo,
                weekData[date].follow,
            ]);
        });

    const data = google.visualization.arrayToDataTable(chartData);

    const options = {
        title: 'User Activity (Weekly)',
        hAxis: {
            title: 'Date',
            format: 'yyyy-MM-dd',
        },
        vAxis: {
            title: 'Activity Count',
        },
        backgroundColor: '#fff',
        pointSize: 5,
        legend: { position: 'bottom' },
    };

    const chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}







//==================== END of activity chart ====================


