
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';


// DOM elements
const reportTableBody = document.querySelector(".reports table tbody");
const loadMoreButton = document.createElement("button");
loadMoreButton.textContent = "Load More";
loadMoreButton.classList.add("load-more");
document.querySelector(".reports").appendChild(loadMoreButton);

// Pagination variables
let lastVisible = null;
const pageSize = 5; // Number of documents to fetch per page

// Fetch reports from Firestore
async function fetchReports() {
    try {
      const reportsRef = collection(db, "Reports");
      let q;
  
      // If this is the first fetch, order by timestamp and limit results
      if (!lastVisible) {
        q = query(reportsRef, orderBy("timestamp", "desc"), limit(pageSize));
      } else {
        // For subsequent fetches, start after the last visible document
        q = query(
          reportsRef,
          orderBy("timestamp", "desc"),
          startAfter(lastVisible),
          limit(pageSize)
        );
      }
  
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map((doc) => doc.data());
  
      // For each report, fetch the usernames for both `reportedBy` and `reported`
      for (const report of reports) {
  const reportedByUsername = report.reportedBy ? await getUsername(report.reportedBy) : "Unknown Reporter";
  const reportedUsername = report.reported ? await getUsername(report.reported) : "Unknown User";

  displayReport({ 
    ...report, 
    reportedBy: reportedByUsername, 
    reported: reportedUsername 
  });
}

      
  
      // Update the last visible document for pagination
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  
      // Hide the "Load More" button if there are no more documents
      if (querySnapshot.size < pageSize) {
        loadMoreButton.style.display = "none";
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  }
  

// Fetch username by user ID from the "users" collection
async function getUsername(userId) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId)); // Assuming "users" collection stores user details
      if (userDoc.exists()) {
        return userDoc.data().username; // Replace "username" with the actual field in your Firestore
      } else {
        console.warn(`User with ID ${userId} not found.`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching username for user ID ${userId}:`, error);
      return null;
    }
  }

  
// Display a single report in the table
function displayReport(report) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${report.reportedBy || "N/A"}</td>
    <td>${report.reported || "N/A"}</td>
    <td>${new Date(report.timestamp).toLocaleString() || "N/A"}</td>
    <td>${report.status || "N/A"}</td>
    <td>${report.reviewedBy || "N/A"}</td>
    <td>
      <a href="#">View</a>
      <a href="#">Close</a>
    </td>
  `;
  reportTableBody.appendChild(row);
}

// Load initial reports and set up "Load More" button
loadMoreButton.addEventListener("click", fetchReports);
fetchReports();


const sortFilterButton = document.getElementById("sortFilterButton");
const sortFilterDropdown = document.getElementById("sortFilterDropdown");
const searchButton = document.getElementById("searchButton");
const searchInput = document.getElementById("searchInput");

let selectedOption = ""; // Store the selected option (sort/filter)

// Toggle dropdown visibility
sortFilterButton.addEventListener("click", () => {
    const dropdownContainer = sortFilterButton.parentElement;
    dropdownContainer.classList.toggle("active");
});

// Handle dropdown item selection
sortFilterDropdown.addEventListener("click", (e) => {
    if (e.target.classList.contains("dropdown-item")) {
        selectedOption = e.target.getAttribute("data-value");
        sortFilterButton.textContent = e.target.textContent; // Update button text
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
