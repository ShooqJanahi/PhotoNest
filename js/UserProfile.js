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




// Fetch activity logs and group them by week
async function fetchActivityLogs() {
    const activityLogsRef = collection(db, 'ActivityLogs');
    const querySnapshot = await getDocs(activityLogsRef);

    const activityData = [];

    querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.timestamp && data.userId) {
            const timestamp = data.timestamp instanceof Timestamp
                ? data.timestamp.toDate()
                : new Date(data.timestamp);

            activityData.push({
                date: timestamp,
                category: data.category,
            });
        }
    });

    return activityData;
}

function groupDataByWeek(activityData) {
    const weeks = {};

    activityData.forEach(({ date }) => {
        // Get the week number and year
        const week = getWeekNumber(date);

        if (!weeks[week]) {
            weeks[week] = 0;
        }

        weeks[week]++;
    });

    // Convert the grouped data into Google Charts format
    const chartData = [['Week', 'Activity Count']];
    for (const [week, count] of Object.entries(weeks)) {
        chartData.push([week, count]);
    }

    return chartData;
}

// Helper function to get the week number
function getWeekNumber(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}


google.charts.load('current', { packages: ['corechart', 'line'] });
google.charts.setOnLoadCallback(drawChart);

async function drawChart() {
    // Fetch and process activity logs
    const activityData = await fetchActivityLogs();
    const chartData = groupDataByWeek(activityData);

    const data = google.visualization.arrayToDataTable(chartData);

    const options = {
        hAxis: { title: 'Week' },
        vAxis: { title: 'Activity Count' },
        backgroundColor: '#f1f8e9',
    };

    const chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}
