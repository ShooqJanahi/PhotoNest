import { auth } from './firebaseConfig.js';
import { db } from './firebaseConfig.js'; 
import { query, collection, where, getDocs, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Function to check login status and user role
export function checkLoginStatus() {
    const username = sessionStorage.getItem("username");
    const role = sessionStorage.getItem("role");

    // Redirect to login if no username is found in session storage
    if (!username) {
        window.location.href = '../html/index.html'; 
        return;
    }

    // Ensure the user has the correct role (admin)
    if (role !== 'admin') {
        window.location.href = '../html/Error.html'; // Redirect if not admin
        return;
    }
}

// Get references to the hamburger menu button and the mobile menu
const hamburgerMenu = document.getElementById('hamburgerMenu');
const mobileMenu = document.querySelector('.mobile-menu');

// Function to toggle the mobile menu visibility
function toggleMobileMenu() {
    mobileMenu.classList.toggle('show');
}

// Function to close the mobile menu
function closeMobileMenu() {
    mobileMenu.classList.remove('show');
}

// Toggle the mobile menu when the hamburger menu button is clicked
hamburgerMenu.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent click from bubbling up to document
    toggleMobileMenu();
});

// Close the menu when clicking outside of it
document.addEventListener('click', (event) => {
    if (!mobileMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
        closeMobileMenu();
    }
});

// Close the menu if the window is resized to a desktop width
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) { // Adjust this value to your breakpoint
        closeMobileMenu();
    }
});



// Function to log out the user and update Firestore
export async function logout() {
    console.log("Logout function called");

    try {
        const userId = auth.currentUser.uid;
        const sessionRef = doc(db, "sessions", userId);
        const logoutTimestamp = new Date().toISOString();

        // Mark user as offline in Firestore
        await updateDoc(sessionRef, {
            status: "offline",
            logoutTime: logoutTimestamp
        });

        // Firebase Auth sign-out
        await auth.signOut();
        console.log("User signed out successfully");

        // Clear session storage
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("role");

        // Redirect to login page
        window.location.href = '../html/index.html';
    } catch (error) {
        console.error("Error signing out: ", error);
    }
}

// Inactivity timeout logic
let inactivityTime = 0;
function resetInactivityTimer() {
    inactivityTime = 0;
}

function checkInactivity() {
    inactivityTime++;
    if (inactivityTime >= 900) { // 15 minutes = 900 seconds
        logout(); 
    }
}

// Attach event listeners for user interactions to reset inactivity timer
window.onload = function() {
    resetInactivityTimer(); // Reset timer on page load
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    
    setInterval(checkInactivity, 1000); // Check every second

    // Attach the logout function to the logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    } else {
        console.error('Logout button not found!');
    }
};

// Ensure the user is logged in and has the right role when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    getOnlineUsers(); // Fetch online users once the page loads
});

// Function to get all online users and display their usernames
async function getOnlineUsers() {
    const sessionsRef = collection(db, "sessions");
    const q = query(sessionsRef, where("status", "==", "online"));

    try {
        const querySnapshot = await getDocs(q);
        const onlineUsersList = document.getElementById('onlineUsersList');

        // Clear the list before repopulating
        onlineUsersList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const sessionData = doc.data();

            // Create a new list item for each online user
            const li = document.createElement('li');
            li.textContent = `Username: ${sessionData.username}, Role: ${sessionData.role}`;

            // Append the list item to the online users list
            onlineUsersList.appendChild(li);
        });

        if (querySnapshot.empty) {
            // If no users are online, show a message
            const li = document.createElement('li');
            li.textContent = "No users are currently online.";
            onlineUsersList.appendChild(li);
        }
    } catch (error) {
        console.error("Error fetching online users: ", error);
    }
}

// Call this function to display online users (for admin view)
getOnlineUsers();



//Spam report Chart
// Load Google Charts
google.charts.load('current', { 'packages': ['bar'] });
google.charts.setOnLoadCallback(drawSpamReportsChart);

function drawSpamReportsChart() {
    // Data for weekly spam reports
    var data = new google.visualization.arrayToDataTable([
        ['Week', 'Spam Reports'],
        ['Week 1', 5],
        ['Week 2', 8],
        ['Week 3', 12],
        ['Week 4', 4],
        ['Week 5', 7]
    ]);

    // Chart options
    var options = {
        legend: { position: 'none' },
        chart: {
            title: 'Weekly Spam Reports',
            subtitle: 'Number of spam reports recorded each Saturday'
        },
        axes: {
            x: {
                0: { side: 'top', label: 'Week Number' } // Top x-axis label
            }
        },
        bar: { groupWidth: "90%" }
    };

    // Draw the chart in the specified div
    var chart = new google.charts.Bar(document.getElementById('spam_reports_chart'));
    chart.draw(data, google.charts.Bar.convertOptions(options));
}

//Activity log
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawChart);

function drawChart() {
  var data = google.visualization.arrayToDataTable([
    ['Year', 'Sales', 'Expenses'],
    ['2004',  1000,      400],
    ['2005',  1170,      460],
    ['2006',  660,       1120],
    ['2007',  1030,      540]
  ]);

  var options = {
    title: 'Company Performance',
    curveType: 'function',
    legend: { position: 'bottom' }
  };

  var chart = new google.visualization.LineChart(document.getElementById('curve_chart'));
  chart.draw(data, options);
}
