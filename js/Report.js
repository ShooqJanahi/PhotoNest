// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from './firebaseConfig.js'; // Import Firestore database instance
import { logout } from './login.js';  // Import logout function from login.js

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
});

// DOM elements
const reportTableBody = document.querySelector(".reports table tbody"); // Table body to display reports
const loadMoreButton = document.createElement("button"); // Create a "Load More" button
loadMoreButton.textContent = "Load More"; // Set button text
loadMoreButton.classList.add("load-more"); // Add a class to the button for styling
document.querySelector(".reports").appendChild(loadMoreButton); // Append the button to the DOM

// Pagination variables
let lastVisible = null; // Keeps track of the last visible document for pagination
const pageSize = 5; // Number of documents to fetch per page

// Global variables for sort and filter options
let sortOption = "timestamp-desc"; // Default sorting option (newest first)
let filterOption = null; // Default: no filtering applied

// Function to fetch reports from Firestore
async function fetchReports() {
  try {
    // Clear the table before loading new data
    reportTableBody.innerHTML = "";

    // Get a reference to the "Reports" collection
    const reportsRef = collection(db, "Reports");
    let q = query(reportsRef); // Base query

    // Apply sorting based on the selected option
    if (sortOption === "timestamp-desc") {
      q = query(q, orderBy("timestamp", "desc")); // Sort by timestamp in descending order
    } else if (sortOption === "timestamp-asc") {
      q = query(q, orderBy("timestamp", "asc")); // Sort by timestamp in ascending order
    }

    // Apply filtering based on the selected filter
    if (filterOption === "Pending Review") {
      q = query(q, where("status", "==", "Pending Review")); // Filter for "Pending Review" status
    } else if (filterOption === "Closed") {
      q = query(q, where("status", "==", "Closed")); // Filter for "Closed" status
    }

    // Apply pagination if there is a last visible document
    if (lastVisible) {
      q = query(q, startAfter(lastVisible), limit(pageSize));  // Start after the last visible document
    } else {
      q = query(q, limit(pageSize)); // Fetch the first page
    }

    const querySnapshot = await getDocs(q); // Execute the query
    const reports = querySnapshot.docs.map((doc) => ({ // Map the query results to an array of reports
      id: doc.id, // Include the document ID
      ...doc.data(), // Spread the report data
    }));
    // Update the last visible document for pagination
    lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    // Display each report in the table
    for (const report of reports) {
      // Fetch usernames for the `reportedBy` and `reported` fields
      const reportedByUsername = report.reportedBy ? await getUsername(report.reportedBy) : "Unknown Reporter";
      const reportedUsername = report.reported ? await getUsername(report.reported) : "Unknown User";

      // Display the report in the table
      displayReport({
        ...report,
        reportedBy: reportedByUsername,
        reported: reportedUsername
      });
    }

    // Hide the "Load More" button if there are no more documents
    if (querySnapshot.size < pageSize) {
      loadMoreButton.style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching reports:", error); // Log any errors
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
  const row = document.createElement("tr"); // Create a new table row

  // Check if ReviewedBy exists and join the usernames for display
  const reviewedByDisplay = Array.isArray(report.ReviewedBy) && report.ReviewedBy.length > 0
    ? report.ReviewedBy.join(", ")
    : "N/A";

  row.innerHTML = `
    <td>${report.reportedBy || "N/A"}</td>
    <td>${report.ReportedUsername || "N/A"}</td>
    <td>${new Date(report.timestamp).toLocaleString() || "N/A"}</td>
     <td>${report.category || "N/A"}</td>
    <td>${report.status || "N/A"}</td>
    <td>${reviewedByDisplay}</td>
    <td>
      <a href="#" class="view-button">View</a>
      <a href="#">Close</a>
    </td>
  `; // Populate the row with report details

  // Attach the "View" button logic
  const viewButton = row.querySelector(".view-button");

  if (viewButton) {

    attachViewButtonListener(viewButton, report);  // Attach a listener for the "View" button
  } else {
    console.warn("View button not found in the row."); // Log if no button is found
  }
  // Append the row to the table body
  reportTableBody.appendChild(row);
}


// Load initial reports and set up "Load More" button
loadMoreButton.addEventListener("click", fetchReports); // Load more reports when button is clicked
fetchReports(); // Fetch the initial set of reports

// Event listeners for sort and filter dropdown
const sortFilterButton = document.getElementById("sortFilterButton");
const sortFilterDropdown = document.getElementById("sortFilterDropdown");
// Event listener for the search functionality
const searchButton = document.getElementById("searchButton");
const searchInput = document.getElementById("searchInput");

let selectedOption = ""; // Store the selected option (sort/filter)

// Toggle dropdown visibility when the button is clicked
sortFilterButton.addEventListener("click", () => {
  const dropdownContainer = sortFilterButton.parentElement;
  dropdownContainer.classList.toggle("active");
});

// Handle sort/filter item selection
sortFilterDropdown.addEventListener("click", (e) => {
  if (e.target.classList.contains("dropdown-item")) {
    selectedOption = e.target.getAttribute("data-value"); // Update selected option
    sortFilterButton.textContent = e.target.textContent;
    sortFilterButton.parentElement.classList.remove("active");
  }
});

// Handle search and fetch reports
searchButton.addEventListener("click", async () => {
  const searchTerm = searchInput.value.trim().toLowerCase();

  // Check if selected option is a sort or filter
  let sortOption = null;
  let filterOption = null;

  if (selectedOption.startsWith("filter-")) {
    filterOption = selectedOption.replace("filter-", "");
  } else {
    sortOption = selectedOption;
  }

  // Fetch and display reports
  await fetchReports(searchTerm, sortOption, filterOption);
});


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
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${messageText}</p>
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
              <p><strong>Comment:</strong> ${commentText}</p>
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
    <p><strong>Reporter:</strong> ${report.reportedBy || "N/A"}</p>
    <p><strong>Reported User:</strong> ${report.ReportedUsername || "N/A"}</p>
    <p><strong>Category:</strong> ${report.category || "N/A"}</p>
    <p><strong>Status:</strong> ${report.status || "N/A"}</p>
    <p><strong>Reviewed By:</strong> ${report.reviewedBy || "N/A"}</p>
    <p><strong>Report Timestamp:</strong> ${new Date(report.timestamp).toLocaleString() || "N/A"}</p>
     <button id="closeReportButton" class="close-report-button">Close Report</button>
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

        // Update the document
        const updateData = {
          ReviewedBy: arrayUnion(loggedInUsername), // Add the username to the `ReviewedBy` array
        };
        // If `ReviewedBy` is empty or doesn't exist, update the status to "Awaiting Decision"
        if (!reportData.ReviewedBy || reportData.ReviewedBy.length === 0) {
          updateData.status = "Awaiting Decision";
        }
        // Apply the updates to the document
        await updateDoc(reportDocRef, updateData);
        console.log(`Username "${loggedInUsername}" added to ReviewedBy field.`);
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


// Event Listener for Search Button
searchButton.addEventListener("click", () => {
  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    searchReports(searchTerm); // Call the search function with the input value
  } else {
    // If the search input is empty, fetch reports with default filters and sorting
    fetchReports(selectedOption, "timestamp-desc");
  }
});

// Event Listener for Sort/Filter Dropdown
sortFilterDropdown.addEventListener("click", (e) => {
  if (e.target.classList.contains("dropdown-item")) {
    selectedOption = e.target.getAttribute("data-value");
    sortFilterButton.textContent = e.target.textContent; // Update button text
    sortFilterButton.parentElement.classList.remove("active");

    // Fetch reports with selected filter and sort settings
    fetchReports(selectedOption, "timestamp-desc");
  }
});

// Load More Button
loadMoreButton.addEventListener("click", () => fetchReports(selectedOption, "timestamp-desc"));



