import { db, auth } from './firebaseConfig.js'; 
import { query, collection, where, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { logout } from './login.js';

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

    const logoutButton = document.getElementById('logout-button'); // Ensure this matches the ID in your HTML

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout(); // Call the logout function from login.js
        });
    } else {
        console.error("Logout button not found in the DOM.");
    }

    await checkLoginStatus();
    initializeDashboard(); // Proceed to initialize the admin dashboard


    const onlineUsersList = document.getElementById('onlineUsersList');

    // Check if a slider is rendered
    if (onlineUsersList.querySelector('.slider')) {
        const slider = onlineUsersList.querySelector('.slider');
        const sliderTrack = slider.querySelector('.slider-track');
        const sliderItems = sliderTrack.children;
        const itemWidth = sliderItems[0].offsetWidth + 10; // Include gap
        const visibleItems = Math.floor(slider.offsetWidth / itemWidth);
        let currentIndex = 0;

        // Enable or disable slider navigation
        function updateSliderNavigation() {
            slider.classList.toggle('overflow', sliderTrack.scrollWidth > slider.offsetWidth);
        }

        // Move slider left or right
        slider.addEventListener('click', (event) => {
            if (event.target.matches('.slider::before')) {
                currentIndex = Math.max(0, currentIndex - visibleItems);
            } else if (event.target.matches('.slider::after')) {
                currentIndex = Math.min(sliderItems.length - visibleItems, currentIndex + visibleItems);
            }
            sliderTrack.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
        });

        // Update navigation visibility on resize
        window.addEventListener('resize', updateSliderNavigation);

        // Initial update
        updateSliderNavigation();
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
    const sessionsRef = collection(db, "sessions");
    const q = query(sessionsRef, where("status", "==", "online")); // Query for users with "online" status

    try {
        const querySnapshot = await getDocs(q);
        const onlineUsersList = document.getElementById("onlineUsersList");

        // Clear the list before populating it
        onlineUsersList.innerHTML = "";

        if (querySnapshot.empty) {
            onlineUsersList.innerHTML = `<p>No users are currently online.</p>`;
            return;
        }

        const onlineUsers = [];

        // Fetch additional details for each online user
        for (const docSnapshot of querySnapshot.docs) {
            const sessionData = docSnapshot.data();

            // Fetch the user's profile from the `users` collection using their UID
            const userQuery = query(collection(db, "users"), where("uid", "==", sessionData.uid));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                onlineUsers.push({
                    username: userData.username,
                    profilePic: userData.profilePic,
                    role: userData.role,
                    loginTime: sessionData.loginTime, // Add login time from the `sessions` data
                });
            }
        }

        // Generate user cards dynamically
        const userCards = onlineUsers.map((user) => `
            <div class="user-card">
                <img 
                    src="${user.profilePic || "https://via.placeholder.com/40"}" 
                    alt="${user.username}'s profile picture" 
                    class="user-profile-pic">
                <div class="user-info">
                    <p><strong>${user.username}</strong></p>
                    <p>Role: ${user.role}</p>
                    <p>Login Time: ${user.loginTime ? new Date(user.loginTime).toLocaleString() : "N/A"}</p>
                </div>
            </div>
        `);

        // Append user cards to the list
        onlineUsersList.innerHTML = userCards.join("");
    } catch (error) {
        console.error("Error fetching online users:", error);
    }
}






// Fetch report data from Firestore and update chart
async function fetchReportDataAndDrawChart() {
    const reportsRef = collection(db, "Reports");
    const q = query(reportsRef, where("category", "in", ["comment", "photo", "user"]));

    try {
        const querySnapshot = await getDocs(q);
        const reportCounts = {
            comment: 0,
            photo: 0,
            user: 0
        };

        querySnapshot.forEach((doc) => {
            const reportData = doc.data();
            if (reportCounts[reportData.category] !== undefined) {
                reportCounts[reportData.category]++;
            }
        });

        drawSpamReportsChart(reportCounts);
    } catch (error) {
        console.error("Error fetching report data: ", error);
    }
}

// Draw the Spam Reports Chart
function drawSpamReportsChart(reportCounts) {
    google.charts.load('current', { 'packages': ['bar'] });
    google.charts.setOnLoadCallback(() => {
        const data = google.visualization.arrayToDataTable([
            ['Category', 'Reports'],
            ['Comments', reportCounts.comment],
            ['Photos', reportCounts.photo],
            ['Users', reportCounts.user],
        ]);

        const options = {
            legend: { position: 'none' },
            chart: {
                title: 'Content Reports',
                subtitle: 'Number of reports by category',
            },
            axes: {
                x: {
                    0: { side: 'top', label: 'Category' },
                },
            },
            bar: { groupWidth: "90%" },
        };

        const chart = new google.charts.Bar(document.getElementById('spam_reports_chart'));
        chart.draw(data, google.charts.Bar.convertOptions(options));
    });
}

google.charts.load('current', { packages: ['corechart', 'bar'] });
google.charts.setOnLoadCallback(fetchActivityLogAndDrawChart);

async function fetchActivityLogAndDrawChart() {
    const activityLogsRef = collection(db, "ActivityLogs");

    try {
        const querySnapshot = await getDocs(activityLogsRef);
        const activityCounts = {};

        // Aggregate occurrences by category
        querySnapshot.forEach((doc) => {
            const activityData = doc.data();
            const category = activityData.category;

            if (activityCounts[category]) {
                activityCounts[category]++;
            } else {
                activityCounts[category] = 1;
            }
        });

        // Prepare chart data
        const chartData = [['Activity', 'Occurrences']];
        for (const [category, count] of Object.entries(activityCounts)) {
            chartData.push([category, count]);
        }

        drawMaterial(chartData); // Pass the dynamic data to the chart
    } catch (error) {
        console.error("Error fetching activity log data:", error);
    }
}

function drawMaterial(chartData) {
    const chartContainer = document.getElementById('curve_chart');

    // Ensure the chart container's height matches the parent
    const parentCard = chartContainer.closest('.card');
    chartContainer.style.height = `${parentCard.offsetHeight - 50}px`; // Adjust height dynamically

    const data = google.visualization.arrayToDataTable(chartData);

    const materialOptions = {
        chart: {
            title: 'Activity Log',
            subtitle: 'Occurrences by Activity Category',
        },
        hAxis: {
            title: 'Occurrences',
            minValue: 0,
        },
        vAxis: {
            title: 'Activity Categories',
        },
        bars: 'horizontal', // Horizontal bar chart
        colors: ['#3366CC', '#FF9900', '#DC3912', '#109618', '#990099', '#3B3EAC'],
    };

    const materialChart = new google.charts.Bar(chartContainer);
    materialChart.draw(data, materialOptions);
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






