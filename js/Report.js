// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc, updateDoc, arrayUnion, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from './firebaseConfig.js'; // Import Firestore database instance
import { logout } from './login.js';  // Import logout function from login.js

let selectedOption = "timestamp-desc"; // Default selected option for sorting

document.addEventListener('DOMContentLoaded', async () => {

  // Wait for 2 seconds and then hide the splash screen
  setTimeout(() => {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      splashScreen.style.transition = 'opacity 0.5s ease'; // Smooth fade-out
      splashScreen.style.opacity = '0'; // Fade-out effect

      // Remove the splash screen from the DOM after the fade-out
      setTimeout(() => {
        splashScreen.style.display = 'none';
      }, 500); // Matches the transition duration
    }
  }, 2000); // 2 seconds

  const logoutButton = document.getElementById('logout-button'); // Find logout button in DOM

  if (logoutButton) {
    // Attach logout functionality to the logout button
    logoutButton.addEventListener('click', () => {
      logout(); // Call the logout function from login.js
    });
  } else {
    console.error("Logout button not found in the DOM.");
  }
  // Initialize application
  initializeAppLogic();
});

// Global variables for filter and sort options
let filterKey = null; // Initialize filterKey
let filterValue = null; // Initialize filterValue

function initializeAppLogic() {

  const sortFilterButton = document.getElementById("sortFilterButton");
  const sortFilterDropdown = document.getElementById("sortFilterDropdown");
  const searchButton = document.getElementById("searchButton");
  const searchInput = document.getElementById("searchInput");

  if (!sortFilterButton || !sortFilterDropdown || !searchButton || !searchInput) {
    console.error("One or more required DOM elements are missing!");
    return;
  }

  // Ensure the dropdown is closed by default on page load
  sortFilterDropdown.classList.remove("active");



  // Toggle dropdown visibility
  sortFilterButton.addEventListener("click", () => {
    sortFilterDropdown.classList.toggle("active");
  });

  // Close dropdown if clicked outside
  document.addEventListener("click", (e) => {
    if (!sortFilterDropdown.contains(e.target) && !sortFilterButton.contains(e.target)) {
      sortFilterDropdown.classList.remove("active");
    }
  });

  // Handle sort and filter options
  sortFilterDropdown.addEventListener("click", (e) => {
    if (e.target.classList.contains("dropdown-item")) {
      const value = e.target.dataset.value;

      // Check if the clicked value is a filter
      if (value.startsWith("filter-")) {
        filterKey = "status"; // Set filterKey to match your Firestore field
        filterValue = value.replace("filter-", ""); // Extract filterValue from dropdown item
        sortOption = null; // Reset sorting when filtering
      } else {
        sortOption = value; // Set sorting option
        filterKey = null; // Reset filterKey
        filterValue = null; // Reset filterValue
      }

      console.log("Filter Key:", filterKey);
      console.log("Filter Value:", filterValue);

      // Update button text to match selected option
      sortFilterButton.textContent = e.target.textContent;

      // Close the dropdown and fetch new data
      sortFilterDropdown.classList.remove("active");
      lastVisible = null; // Reset pagination
      fetchReports("", sortOption, filterKey, filterValue);
    }
  });




  // Search functionality
  searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    lastVisible = null; // Reset pagination
    fetchReports(searchTerm, sortOption, filterOption);
  });
}

// DOM elements
const reportTableBody = document.querySelector(".reports table tbody");
const loadMoreButton = document.createElement("button");
loadMoreButton.textContent = "Load More";
loadMoreButton.classList.add("load-more");
document.querySelector(".reports").appendChild(loadMoreButton);

const sortFilterButton = document.getElementById("sortFilterButton");
const sortFilterDropdown = document.getElementById("sortFilterDropdown");
const searchButton = document.getElementById("searchButton");
const searchInput = document.getElementById("searchInput");

// Pagination variables
let lastVisible = null;
const pageSize = 5;

// Global variables for sort and filter options
let sortOption = "timestamp-desc";
let filterOption = null;
// Function to fetch reports from Firestore
async function fetchReports(searchTerm = "", sortKey = "", filterKey = "", filterValue = "") {
  try {

    reportTableBody.innerHTML = ""; // Clear existing data on fresh fetch


    let q = query(collection(db, "Reports"));

    // Apply sort option
    if (sortKey === "timestamp-desc") {
      q = query(q, orderBy("timestamp", "desc"));
    } else if (sortKey === "timestamp-asc") {
      q = query(q, orderBy("timestamp", "asc"));
    } else if (sortKey === "status") {
      q = query(q, orderBy("status")); // Example for sorting by status
    }

    // Apply filter option
    if (filterKey && filterValue) {
      q = query(q, where(filterKey, "==", filterValue));
    }

    // Apply pagination
    if (lastVisible) {
      q = query(q, startAfter(lastVisible), limit(pageSize));
    } else {
      q = query(q, limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    const reports = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by search term locally
    const filteredReports = reports.filter((report) => {
      const reportedBy = (report.reportedByUsername || "").toLowerCase();
      const reported = (report.ReportedUsername || "").toLowerCase();
      const category = (report.category || "").toLowerCase();
      return (
        reportedBy.includes(searchTerm) ||
        reported.includes(searchTerm) ||
        category.includes(searchTerm)
      );
    });

    // Render the reports
    filteredReports.forEach((report) => displayReport(report));

    // Hide "Load More" button if fewer results
    loadMoreButton.style.display = querySnapshot.size < pageSize ? "none" : "block";
  } catch (error) {
    console.error("Error fetching reports:", error);
  }
}


// Function to fetch a username by user ID from the "users" collection
async function getUsername(userId) {
  if (!userId) return "Unknown User"; // Return default if userId is undefined
  try {
    // Get the user document by ID
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      // Return the username or a default value if not available
      return userDoc.data().username || "Unknown User";
    } else {
      console.warn(`User with ID ${userId} not found.`); // Warn if the user is not found
      return "Unknown User";
    }
  } catch (error) {
    console.error(`Error fetching username for user ID ${userId}:`, error); // Log errors
    return "Unknown User"; // Return default value on error
  }
}


// Function to display a single report in the table
function displayReport(report) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${report.reportedByUsername || "N/A"}</td>
    <td>${report.ReportedUsername || "N/A"}</td>
    <td>${new Date(report.timestamp).toLocaleString() || "N/A"}</td>
    <td>${report.category || "N/A"}</td>
    <td>${report.status || "N/A"}</td>
    <td>${report.ReviewedBy?.join(", ") || "N/A"}</td>
    <td>
      <a href="#" class="view-button">View</a>
      <a href="#" class="close-button">Close</a>
    </td>
  `;

  const viewButton = row.querySelector(".view-button");
  const closeButton = row.querySelector(".close-button");

  // Attach the view button functionality
  attachViewButtonListener(viewButton, report);

  viewButton.addEventListener("click", (e) => {
    e.preventDefault();
    showPopup(report);
  });

  closeButton.addEventListener("click", (e) => {
    e.preventDefault();
    closeReport(report);
  });

  reportTableBody.appendChild(row);
}



// Load initial reports and set up "Load More" button
loadMoreButton.addEventListener("click", fetchReports); // Load more reports when button is clicked
fetchReports(); // Fetch the initial set of reports






// Function to fetch a message by ID
async function fetchMessage(messageId) {
  try {
    const messageDoc = await getDoc(doc(db, "Messages", messageId));
    if (messageDoc.exists()) {
      return messageDoc.data();
    } else {
      console.warn(`Message with ID ${messageId} not found.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching message with ID ${messageId}:`, error);
    return null;
  }
}

// DOM Elements for the popup
const popupOverlay = document.getElementById("popupOverlay");
const popupDetails = document.getElementById("popupDetails");
const popupCloseButton = document.getElementById("popupCloseButton");
const popupCloseAction = document.getElementById("popupCloseAction");

// Function to show the popup with dynamic content
async function showPopup(report) {
  console.log("Popup triggered for report:", report); // Debug log

  let messageDetailsHTML = `<p>No message details available.</p>`; // Default if no message is found
  let commentDetailsHTML = ""; // Default empty for comments

  // Check if the report contains a messageId
  if (report.messageId) {
    const message = await fetchMessage(report.messageId); // Fetch the message
    if (message) {
      const subject = message.subject || "No Subject";
      const messageText = message.message || "No message content.";

      // Handle links for shared photos or albums
      let linkHTML = "";
      if (message.albumId) {
        linkHTML = `<p><a href="PhotoGallery.html?albumId=${message.albumId}">View Album</a></p>`;
      } else if (message.photoId) {
        linkHTML = `<p><a href="ViewImage.html?photoId=${message.photoId}">View Photo</a></p>`;
      }

      // Populate the message details
      messageDetailsHTML = `
        <div class="message-box">
          <h3>Message Details</h3>
          <p><strong>Subject:</strong> ${message.subject || "No Subject"}</p>
          <p><strong>Message:</strong> ${message.message || "No Content"}</p>
          ${linkHTML}
        </div>
      `;
    }
  }
  // Check if the report category is a comment
  if (report.category === "comment") {
    // Fetch comment details (e.g., photo link and comment text)
    if (report.photoId && report.commentId) {
      try {
        // Fetch comment data from Firestore (assuming a Comments collection exists)
        const commentDoc = await getDoc(doc(db, "Comments", report.commentId));
        if (commentDoc.exists()) {
          const commentData = commentDoc.data();
          const commentText = commentData.text || "No comment text available.";
          const photoId = report.photoId;

          commentDetailsHTML = `
            <div class="comment-box">
              <h3>Comment Details</h3>
              <p><strong>Comment:</strong> ${comment.text || "No Comment"}</p>
              <p><a href="ViewImage.html?photoId=${photoId}" class="photo-link" data-photo-id="${photoId}">View Photo</a></p>
            </div>
          `;
        } else {
          console.warn(`Comment with ID ${report.commentId} not found.`);
        }
      } catch (error) {
        console.error(`Error fetching comment with ID ${report.commentId}:`, error);
      }
    } else {
      console.warn("No photoId or commentId found for the comment report.");
    }
  }

  popupDetails.innerHTML = `
  ${messageDetailsHTML}
  ${commentDetailsHTML}
    <h2>Reported Content Details</h2>
    <p><strong>Reporter:</strong> ${report.reportedByUsername || "N/A"}</p>
    <p><strong>Reported User:</strong> ${report.ReportedUsername || "N/A"}</p>
    <p><strong>Category:</strong> ${report.category || "N/A"}</p>
    <p><strong>Status:</strong> ${report.status || "N/A"}</p>
    <p><strong>Reviewed By:</strong> ${report.ReviewedBy?.join(", ") || "N/A"}</p>
    <p><strong>Report Timestamp:</strong> ${new Date(report.timestamp).toLocaleString() || "N/A"}</p>
    <button 
    id="closeReportButton" 
    class="close-report-button" 
    style="
        background-color: #ff0000; /* Red background */
        color: #fff; /* White text */
        padding: 12px 20px; /* Padding for size */
        border-radius: 8px; /* Rounded corners */
        font-size: 16px; 
        font-weight: bold;
        border: none; /* No border */
        cursor: pointer; /* Pointer cursor */
        margin-top: 20px; /* Space above button */
        transition: background-color 0.3s ease, transform 0.2s ease; /* Smooth hover effects */
    " 
    onmouseover="this.style.backgroundColor='#5a4dbc'; this.style.transform='scale(1.05)';"
    onmouseout="this.style.backgroundColor='#6a0dad'; this.style.transform='scale(1)';"
    onmousedown="this.style.backgroundColor='#482c9e'; this.style.transform='scale(1)';"
    onmouseup="this.style.backgroundColor='#5a4dbc'; this.style.transform='scale(1.05)';"
>
    Close Report
</button>

    `;

  // Attach event listener to the "Close Report" button
  const closeReportButton = document.getElementById("closeReportButton");
  closeReportButton.addEventListener("click", () => closeReport(report));

  // Attach event listeners to the links
  const albumLink = popupDetails.querySelector(".album-link");
  const photoLink = popupDetails.querySelector(".photo-link");

  if (albumLink) {
    albumLink.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default navigation
      const albumId = albumLink.getAttribute("data-album-id");
      localStorage.setItem("currentAlbumId", albumId); // Save albumId to localStorage
      console.log("Album ID saved to localStorage:", albumId);
      window.location.href = albumLink.getAttribute("href"); // Navigate to the album page
    });
  }
  if (photoLink) {
    photoLink.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default navigation
      const photoId = photoLink.getAttribute("data-photo-id");
      localStorage.setItem("photoId", photoId); // Save photoId to localStorage
      console.log("Photo ID saved to localStorage:", photoId);
      window.location.href = photoLink.getAttribute("href"); // Navigate to the photo page
    });
  }
  popupOverlay.classList.remove("hidden");
}

async function closeReport(report) {
  try {
    const reportDocRef = doc(db, "Reports", report.id); // Reference the report document

    // Update the status to "Closed" in Firestore
    await updateDoc(reportDocRef, {
      status: "Closed",
    });

    console.log(`Report with ID ${report.id} has been closed.`);

    // Update the UI to reflect the status change
    report.status = "Closed";
    showPopup(report); // Re-render the popup with updated details

    // Optionally, refresh the reports table
    fetchReports();
  } catch (error) {
    console.error("Error closing the report:", error);
  }
}

// Function to hide the popup and refresh reports
function hidePopup() {
  popupOverlay.classList.add("hidden");

  // Reset pagination variables for a fresh fetch
  lastVisible = null;

  // Fetch the initial set of reports again
  fetchReports();
}

// Attach event listeners for closing the popup
popupCloseButton.addEventListener("click", hidePopup);
popupCloseAction.addEventListener("click", hidePopup);
popupOverlay.addEventListener("click", (event) => {
  if (event.target === popupOverlay) {
    hidePopup();
  }
});


// Attach event listener to the "View" button in the report row
function attachViewButtonListener(button, report) {
  button.addEventListener("click", async (event) => {
    event.preventDefault(); // Prevent default link behavior
    console.log("View button clicked. Showing popup for report:", report); // Debug log

    // Get the logged-in user's username
    const loggedInUsername = sessionStorage.getItem("username"); // Retrieve from sessionStorage
    if (!loggedInUsername) {
      console.error("Logged-in username not found.");
      return;
    }
    try {
      const reportDocRef = doc(db, "Reports", report.id); // Reference to the specific report document

      // Fetch the report data to check if "ReviewedBy" exists
      const reportSnapshot = await getDoc(reportDocRef);

      if (reportSnapshot.exists()) {
        const reportData = reportSnapshot.data();

        // Check if the "ReviewedBy" array exists and contains the username
        if (reportData.ReviewedBy && reportData.ReviewedBy.includes(loggedInUsername)) {
          console.log(`Username "${loggedInUsername}" already exists in ReviewedBy.`);
        } else {
          console.log(`Adding username "${loggedInUsername}" to ReviewedBy field.`);
          await updateDoc(reportDocRef, {
            ReviewedBy: arrayUnion(loggedInUsername), // Add the username to the array
            status: reportData.ReviewedBy ? reportData.status : "Awaiting Decision", // Update status if the field was not created
          });
          console.log(`Username "${loggedInUsername}" successfully added.`);
        }
      } else {
        console.warn(`Report with ID ${report.id} does not exist. Cannot update.`);
      }
    } catch (error) {
      console.error("Error updating ReviewedBy field:", error);


      // Handle case where the `ReviewedBy` array does not exist or any other error
      try {
        console.log("Attempting to create 'ReviewedBy' field...");
        await updateDoc(doc(db, "Reports", report.id), {
          ReviewedBy: [loggedInUsername], // Create and initialize the array with the username
        });
        console.log(`'ReviewedBy' field created and username "${loggedInUsername}" added.`);
      } catch (createError) {
        console.error("Error creating 'ReviewedBy' field:", createError);
      }
    }
    // Show the popup with report details
    showPopup(report);
  });
}


// Function to handle search separately
async function searchReports(searchTerm) {
  try {
    const reportsRef = collection(db, "Reports");
    const q = query(reportsRef); // Fetch all reports (you can limit this if needed)

    // Fetch all reports
    const querySnapshot = await getDocs(q);
    const allReports = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter results locally based on the search term
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredReports = allReports.filter((report) =>
      (report.reportedBy || "").toLowerCase().includes(lowerCaseSearchTerm) ||
      (report.ReportedUsername || "").toLowerCase().includes(lowerCaseSearchTerm) ||
      (report.category || "").toLowerCase().includes(lowerCaseSearchTerm)
    );

    // Clear the existing table and display the filtered reports
    reportTableBody.innerHTML = ""; // Clear table
    filteredReports.forEach((report) => displayReport(report)); // Display each filtered report
  } catch (error) {
    console.error("Error searching reports:", error);
  }
}







// Load More Button
loadMoreButton.addEventListener("click", () => fetchReports(selectedOption, "timestamp-desc"));



