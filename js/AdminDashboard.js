// Import Firebase services for Firestore and Storage
import { db, auth } from './firebaseConfig.js';
import { query, collection, where, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { logout } from './login.js';  // Import logout function from login.js

// Function to check login status and user role
async function checkLoginStatus() {
    console.log("Checking login status...");

    // Wait for Firebase Authentication to resolve the current user
    const currentUser = await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // Stop listening after user is identified
            resolve(user);
        });
    });
    if (!currentUser) {
        // If no user is logged in, redirect to the login page
        console.warn("No authenticated user. Redirecting to login.");
        window.location.href = '../html/index.html';
        return;
    }

    try {
        // Query Firestore for the user's document based on email
        const userDoc = await getDocs(
            query(collection(db, "users"), where("email", "==", currentUser.email))
        );

        if (userDoc.empty) {
            // If user document is not found, redirect to the login page
            console.warn("No user data found. Redirecting to login.");
            window.location.href = '../html/index.html';
            return;
        }

        const userData = userDoc.docs[0].data(); // Get user data
        console.log("User data fetched:", userData);

        if (userData.role.toLowerCase() !== 'admin') {
            // If the user is not an admin, redirect to the error page
            console.warn("Unauthorized access attempt. Redirecting to error page.");
            window.location.href = '../html/Error.html';
            return;
        }

        console.log("Login status validated for admin:", userData.username);
    } catch (error) {
        console.error("Error validating login status:", error);
        window.location.href = '../html/index.html'; // Redirect to login on error
    }
}

// Event listener for DOMContentLoaded to ensure the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const logoutButton = document.getElementById('logout-button'); // Find logout button in DOM

    if (logoutButton) {
        // Attach logout functionality to the logout button
        logoutButton.addEventListener('click', () => {
            logout(); // Call the logout function from login.js
        });
    } else {
        console.error("Logout button not found in the DOM.");
    }

    await checkLoginStatus(); // Verify user login and role
    initializeDashboard(); // Initialize the admin dashboard

    const onlineUsersList = document.getElementById('onlineUsersList');

    // Check if a slider is rendered
    if (onlineUsersList.querySelector('.slider')) {
        // Logic for a slider UI if present in the online users list
        const slider = onlineUsersList.querySelector('.slider');
        const sliderTrack = slider.querySelector('.slider-track');
        const sliderItems = sliderTrack.children;
        const itemWidth = sliderItems[0].offsetWidth + 10; // Include gap
        const visibleItems = Math.floor(slider.offsetWidth / itemWidth);
        let currentIndex = 0;

        // Toggle slider navigation visibility based on content
        function updateSliderNavigation() {
            slider.classList.toggle('overflow', sliderTrack.scrollWidth > slider.offsetWidth);
        }

        // Handle slider navigation on user interaction
        slider.addEventListener('click', (event) => {
            if (event.target.matches('.slider::before')) {
                currentIndex = Math.max(0, currentIndex - visibleItems);
            } else if (event.target.matches('.slider::after')) {
                currentIndex = Math.min(sliderItems.length - visibleItems, currentIndex + visibleItems);
            }
            sliderTrack.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
        });

        // Update slider visibility on window resize
        window.addEventListener('resize', updateSliderNavigation);
        updateSliderNavigation(); // Initial navigation update
    }
});





// References to popup elements
const settingsButton = document.querySelector('.settings');
const settingsPopup = document.getElementById('settingsPopup');
const updateProfileForm = document.getElementById('updateProfileForm');
const closePopupButton = document.getElementById('closePopup');

// Function to open the popup and populate form with user data
// Function to open the popup and populate form with user data
settingsButton.addEventListener('click', async () => {
    try {
        const currentUser = await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe(); // Unsubscribe after resolving
                resolve(user);
            });
        });

        if (!currentUser) {
            console.warn('No authenticated user.');
            return;
        }

        // Fetch the user's data from the Firestore users collection
        const userQuery = query(collection(db, "users"), where("email", "==", currentUser.email));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            console.error('User data not found.');
            return;
        }

        const userData = userSnapshot.docs[0].data();
        const userId = userSnapshot.docs[0].id; // Get the document ID

        // Populate the form with existing user data
        document.getElementById('firstName').value = userData.firstName || '';
        document.getElementById('lastName').value = userData.lastName || '';
        document.getElementById('phone').value = userData.phone || '';

        // Display the current profile picture in the preview
        const profilePicPreview = document.getElementById('profilePicPreview');
        if (profilePicPreview) {
            profilePicPreview.src = userData.profilePic || 'https://via.placeholder.com/150';
        }

        // Open the popup
        settingsPopup.classList.remove('hidden');

        // Add submit handler for updating user data
        updateProfileForm.onsubmit = async (event) => {
            event.preventDefault();

            // Collect updated data from the form
            const updatedData = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                phone: document.getElementById('phone').value.trim(),
            };

            const profilePicInput = document.getElementById('profilePic');
            if (profilePicInput.files.length > 0) {
                const file = profilePicInput.files[0];

                // Show upload progress
                const uploadProgress = document.getElementById('uploadProgress');
                uploadProgress.classList.remove('hidden');

                // Upload the file to Firebase Storage
                const storageRef = ref(storage, `profile_pictures/${currentUser.uid}/${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);

                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        uploadProgress.textContent = `Uploading... ${Math.round(progress)}%`;
                    },
                    (error) => {
                        console.error('Error uploading profile picture:', error);
                    },
                    async () => {
                        // Get the download URL after upload completes
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        updatedData.profilePic = downloadURL; // Save the public URL

                        // Update Firestore with the new data
                        await updateDoc(doc(db, "users", userId), updatedData);

                        alert('Profile updated successfully!');
                        settingsPopup.classList.add('hidden'); // Close the popup
                        uploadProgress.classList.add('hidden'); // Hide the progress indicator
                    }
                );
            } else {
                // No new profile picture, just update other fields
                await updateDoc(doc(db, "users", userId), updatedData);
                alert('Profile updated successfully!');
                settingsPopup.classList.add('hidden'); // Close the popup
            }
        };
    } catch (error) {
        console.error('Error fetching or updating user data:', error);
    }
});


// Close the popup
closePopupButton.addEventListener('click', () => {
    settingsPopup.classList.add('hidden');
});


// Function to initialize the admin dashboard
function initializeDashboard() {
    console.log("Initializing admin dashboard...");
    fetchOnlineUsers(); // Fetch and display online users
    fetchReportDataAndDrawChart(); // Draw the spam report chart
    fetchActivityLogAndDrawChart(); // Fetch and display activity log data
}


// Function to fetch and display online users
async function fetchOnlineUsers() {
    const sessionsRef = collection(db, "sessions"); // Reference the Firestore `sessions` collection
    const q = query(sessionsRef, where("status", "==", "online")); // Query for users with "online" status

    try {
        const querySnapshot = await getDocs(q); // Execute the query and get matching documents
        const onlineUsersList = document.getElementById("onlineUsersList"); // HTML element to display the online users list

        // Clear the current content of the online users list
        onlineUsersList.innerHTML = "";

        // If no users are online, display a placeholder message
        if (querySnapshot.empty) {
            onlineUsersList.innerHTML = `<p>No users are currently online.</p>`;
            return; // Exit the function
        }

        const onlineUsers = []; // Array to hold details of online users

        // Iterate through each online session
        for (const docSnapshot of querySnapshot.docs) {
            const sessionData = docSnapshot.data(); // Get session data

            // Query the `users` collection to fetch the user's profile using their UID
            const userQuery = query(collection(db, "users"), where("uid", "==", sessionData.uid));
            const userSnapshot = await getDocs(userQuery);

            // If the user's profile exists, extract their details
            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data(); // Get user data
                onlineUsers.push({
                    username: userData.username, // User's username
                    profilePic: userData.profilePic, // User's profile picture URL
                    role: userData.role, // User's role (admin or user)
                    loginTime: sessionData.loginTime, // Login time from the session data
                });
            }
        }

        // Generate HTML for each online user card dynamically
        const userCards = onlineUsers.map((user) => `
            <div class="user-card">
                <img 
                    src="${user.profilePic || "https://via.placeholder.com/40"}" 
                    alt="${user.username}'s profile picture" 
                    class="user-profile-pic">
                <div class="user-info">
                    <p><strong>${user.username}</strong></p>
                    <p>Role: ${user.role}</p>
                    <p>Login Time: ${user.loginTime ? new Date(user.loginTime).toLocaleString() : "N/A"}</p> <!-- Format and display login time -->
                </div>
            </div>
        `);

        // Append user cards to the list
        onlineUsersList.innerHTML = userCards.join("");
    } catch (error) {
        // Log errors to the console
        console.error("Error fetching online users:", error);
    }
}






// Function to fetch report data and update the chart
async function fetchReportDataAndDrawChart() {
    const reportsRef = collection(db, "Reports"); // Reference the Firestore "Reports" collection
    const q = query(reportsRef, where("category", "in", ["comment", "photo", "user", "message"])); // Query the collection for documents where the "category" field matches specific values

    try {
        // Execute the query and get the documents that match
        const querySnapshot = await getDocs(q);

        // Initialize a counter object to track the number of reports for each category
        const reportCounts = {
            comment: 0,
            photo: 0,
            user: 0,
            message: 0
        };

        // Iterate over the retrieved documents
        querySnapshot.forEach((doc) => {
            const reportData = doc.data(); // Extract data from each document

            // If the report's category is in the `reportCounts` object, increment its count
            if (reportCounts[reportData.category] !== undefined) {
                reportCounts[reportData.category]++;
            }
        });
        // Pass the aggregated report counts to the chart-drawing function
        drawSpamReportsChart(reportCounts);
    } catch (error) {
        // Log any errors that occur during Firestore operations
        console.error("Error fetching report data: ", error);
    }
}

// Function to draw the Spam Reports Chart
function drawSpamReportsChart(reportCounts) {
    // Load the required Google Charts package for bar charts
    google.charts.load('current', { 'packages': ['bar'] });

    // Callback to run after the chart library is loaded
    google.charts.setOnLoadCallback(() => {
        // Prepare the data for the chart
        const data = google.visualization.arrayToDataTable([
            ['Category', 'Reports'], // Define column headers
            ['Comments', reportCounts.comment],  // Number of "Comments" reports
            ['Photos', reportCounts.photo],  // Number of "Photos" reports
            ['Users', reportCounts.user], // Number of "Users" reports
            ['Messages', reportCounts.message] // Number of "Messages" reports

        ]);

        // Define options for customizing the chart
        const options = {
            legend: { position: 'none' }, // Disable the legend
            chart: {

                subtitle: 'Number of reports by category',  // Subtitle
            },
            axes: {
                x: {
                    0: { side: 'top', label: 'Category' }, // Label for the x-axis
                },
            },
            bar: { groupWidth: "90%" }, // Adjust the width of bars
        };
        // Initialize the chart and link it to the DOM element with ID 'spam_reports_chart'
        const chart = new google.charts.Bar(document.getElementById('spam_reports_chart'));

        // Render the chart using the prepared data and options
        chart.draw(data, google.charts.Bar.convertOptions(options));
    });
}

google.charts.load('current', { packages: ['corechart', 'bar'] }); // Load the Google Charts library
google.charts.setOnLoadCallback(fetchActivityLogAndDrawChart); // Callback to fetch data and draw the chart after Google Charts is loaded

// Function to fetch activity log data and render the chart
async function fetchActivityLogAndDrawChart() {
    const activityLogsRef = collection(db, "ActivityLogs"); // Reference to the Firestore collection

    try {
        const querySnapshot = await getDocs(activityLogsRef); // Fetch all documents in the ActivityLogs collection
        const activityCounts = {}; // Initialize an empty object to store counts for each category

        // Loop through the query results to count occurrences of each category
        querySnapshot.forEach((doc) => {
            const activityData = doc.data(); // Get document data
            const category = activityData.category; // Extract the activity category

            // Increment the count for the category or initialize it
            if (activityCounts[category]) {
                activityCounts[category]++;
            } else {
                activityCounts[category] = 1;
            }
        });

        // Prepare the chart data in the format required by Google Charts
        const chartData = [['Activity', 'Occurrences']]; // First row defines column headers
        for (const [category, count] of Object.entries(activityCounts)) {
            chartData.push([category, count]); // Add rows for each activity category and count
        }

        drawMaterial(chartData); // Pass the prepared data to the chart drawing function
    } catch (error) {
        // Handle and log errors that may occur during Firestore operations
        console.error("Error fetching activity log data:", error);
    }
}

function drawMaterial(chartData) {
    const chartContainer = document.getElementById('curve_chart'); // Locate the container where the chart will be drawn

    // Ensure the chart container's height matches the parent element dynamically
    const parentCard = chartContainer.closest('.card');
    chartContainer.style.height = `${parentCard.offsetHeight - 50}px`; // Adjust the height dynamically based on the parent

     // Convert the chart data array into Google Charts' format
    const data = google.visualization.arrayToDataTable(chartData);

    // Chart options for Google Charts
    const materialOptions = {
        chart: {
            subtitle: 'Occurrences by Activity Category', // Subtitle for context
        },
        hAxis: {
            title: 'Occurrences', // Label for the horizontal axis
            minValue: 0, // Start the axis at 0
        },
        vAxis: {
            title: 'Activity Categories', // Label for the vertical axis
        },
        bars: 'horizontal', // Horizontal bar chart
        colors: ['#3366CC', '#FF9900', '#DC3912', '#109618', '#990099', '#3B3EAC'], // Custom colors for bars
    };

    // Create a new Google Charts bar chart and bind it to the container
    const materialChart = new google.charts.Bar(chartContainer);
    materialChart.draw(data, materialOptions); // Draw the chart using the data and options
}



const storage = getStorage(); // Initialize Firebase Storage

// Add submit handler for updating user data

updateProfileForm.onsubmit = async (event) => {
    event.preventDefault(); // Prevent form submission default behavior

    try {
        // Get the current logged-in user
        const currentUser = await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe(); // Unsubscribe after resolving
                resolve(user);
            });
        });

        if (!currentUser) {
            console.warn('No authenticated user.');
            return;
        }

        // Query Firestore to get the user's document ID
        const userQuery = query(collection(db, "users"), where("email", "==", currentUser.email));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            console.error('User data not found.');
            return;
        }

        const userId = userSnapshot.docs[0].id; // Get Firestore document ID
        const userDocRef = doc(db, "users", userId); // Reference to Firestore document

        // Collect updated data from the form
        const updatedData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
        };

        // Check if a new profile picture is uploaded
        const profilePicInput = document.getElementById('profilePic');
        if (profilePicInput.files.length > 0) {
            const file = profilePicInput.files[0];

            // Show upload progress
            const uploadProgress = document.getElementById('uploadProgress');
            uploadProgress.classList.remove('hidden');

            // Upload the new profile picture to Firebase Storage
            const storageRef = ref(storage, `profile_pictures/${currentUser.uid}/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    uploadProgress.textContent = `Uploading... ${Math.round(progress)}%`;
                },
                (error) => {
                    console.error('Error uploading profile picture:', error);
                },
                async () => {
                    // Get the download URL after upload completes
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    updatedData.profilePic = downloadURL; // Save the new profile picture URL

                    // Update Firestore with the new data
                    await updateDoc(userDocRef, updatedData);

                    alert('Profile updated successfully!');
                    settingsPopup.classList.add('hidden'); // Close the popup
                    uploadProgress.classList.add('hidden'); // Hide the progress indicator

                    // Reload the page after successful submission
                    window.location.reload();
                }
            );
        } else {
            // No new profile picture, just update other fields
            await updateDoc(userDocRef, updatedData); // Update Firestore

            alert('Profile updated successfully!');
            settingsPopup.classList.add('hidden'); // Close the popup

            // Reload the page after successful submission
            window.location.reload();
        }
    } catch (error) {
        console.error('Error updating profile:', error);
    }
};






