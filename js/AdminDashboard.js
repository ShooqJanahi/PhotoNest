import { auth } from './firebaseConfig.js';
import { db } from './firebaseConfig.js'; 
import { query, collection, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Function to check login status and user role
async function checkLoginStatus() {
    console.log("Checking login status...");

    // Wait for Firebase Authentication to resolve the current user
    const currentUser = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // Unsubscribe after resolving
            resolve(user);
        });
    });

    if (!currentUser) {
        console.warn("No authenticated user. Redirecting to login.");
        window.location.href = '../html/index.html';
        return;
    }

    // Assume the user is authenticated, verify their role
    try {
        const userDoc = await getDocs(
            query(collection(db, "users"), where("email", "==", currentUser.email))
        );

        if (userDoc.empty) {
            console.warn("No user data found. Redirecting to login.");
            window.location.href = '../html/index.html';
            return;
        }

        const userData = userDoc.docs[0].data();
        console.log("User data fetched:", userData);

        if (userData.role.toLowerCase() !== 'admin') {
            console.warn("Unauthorized access attempt. Redirecting to error page.");
            window.location.href = '../html/Error.html';
            return;
        }

        console.log("Login status validated for admin:", userData.username);
    } catch (error) {
        console.error("Error validating login status:", error);
        window.location.href = '../html/index.html';
    }
}

// Ensure the user is logged in and has the correct role when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
    initializeDashboard(); // Proceed to initialize the admin dashboard
});

// Function to initialize the admin dashboard
function initializeDashboard() {
    console.log("Initializing admin dashboard...");
    fetchOnlineUsers(); // Fetch and display online users
    drawSpamReportsChart(); // Draw the spam report chart
    drawActivityLogChart(); // Draw the activity log chart
}

// Function to fetch and display online users
async function fetchOnlineUsers() {
    const sessionsRef = collection(db, "sessions ");
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
            const li = document.createElement('li');
            li.textContent = "No users are currently online.";
            onlineUsersList.appendChild(li);
        }
    } catch (error) {
        console.error("Error fetching online users: ", error);
    }
}

// Spam report chart
google.charts.load('current', { 'packages': ['bar'] });
google.charts.setOnLoadCallback(drawSpamReportsChart);

function drawSpamReportsChart() {
    const data = google.visualization.arrayToDataTable([
        ['Week', 'Spam Reports'],
        ['Week 1', 5],
        ['Week 2', 8],
        ['Week 3', 12],
        ['Week 4', 4],
        ['Week 5', 7],
    ]);

    const options = {
        legend: { position: 'none' },
        chart: {
            title: 'Weekly Spam Reports',
            subtitle: 'Number of spam reports recorded',
        },
        axes: {
            x: {
                0: { side: 'top', label: 'Week Number' }, // Top x-axis label
            },
        },
        bar: { groupWidth: "90%" },
    };

    const chart = new google.charts.Bar(document.getElementById('spam_reports_chart'));
    chart.draw(data, google.charts.Bar.convertOptions(options));
}

// Activity log chart
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(drawActivityLogChart);

function drawActivityLogChart() {
    const data = google.visualization.arrayToDataTable([
        ['Activity', 'Occurrences'],
        ['Logins', 50],
        ['Likes', 40],
        ['Comments', 30],
        ['Spam Reports', 10],
    ]);

    const options = {
        title: 'Admin Activity Log',
        pieHole: 0.4,
        legend: { position: 'right' },
    };

    const chart = new google.visualization.PieChart(document.getElementById('activity_log_chart'));
    chart.draw(data, options);
}

// Sidebar menu toggle logic
const hamburgerMenu = document.getElementById('hamburgerMenu');
const mobileMenu = document.querySelector('.mobile-menu');

function toggleMobileMenu() {
    mobileMenu.classList.toggle('show');
}

function closeMobileMenu() {
    mobileMenu.classList.remove('show');
}

hamburgerMenu.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent event bubbling
    toggleMobileMenu();
});

document.addEventListener('click', (event) => {
    if (!mobileMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
        closeMobileMenu();
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

