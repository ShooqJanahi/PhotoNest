// Import Firebase services from the configured firebaseConfig.js file
import { db, storage, auth } from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, increment } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';


// Check if user is logged in and has the correct role which is "user"
document.addEventListener('DOMContentLoaded', () => {
    checkUserAuthentication();
});

function checkUserAuthentication() {
    const auth = getAuth();
    onAuthStateChanged(auth, user => {
        if (!user) {
            // No user is logged in, redirect to the login page
            console.warn("Access denied. No user logged in.");
            window.location.href = '../html/Login.html';
        } else {
            // User is logged in, check if they have the correct role
            console.log("User logged in:", user.uid);
            checkUserRole(user.uid);
        }
    });
}

async function checkUserRole(userId) {
    const userRef = doc(db, "users", userId);
    let userDoc;  // Declare outside to increase scope visibility
    try {
        userDoc = await getDoc(userRef);
    } catch (error) {
        console.error("Error fetching user document:", error);
        return;  // Ensure function exits if there's an error
    }

    if (!userDoc.exists()) {
        console.warn("User data not found.");
        window.location.href = '../html/Login.html';
    } else {
        const userData = userDoc.data();
        if (userData.role !== "user" || userData.status !== "active") {
            console.warn("Access denied. User does not have the necessary permissions or status.");
            window.location.href = '../html/Unauthorized.html';
        }
        console.log("User authenticated with role:", userData.role);
        // Proceed with initializing page functionalities if needed
    }
}


//=====================================Upload.html===============================//


// Initialize Places Autocomplete for location input

const locationsRef = collection(db, "Locations");

document.getElementById("location").addEventListener("input", async (event) => {
    const input = event.target.value.toLowerCase();
    const locationSuggestions = document.getElementById("location-suggestions");
    locationSuggestions.innerHTML = "";  // Clear previous suggestions

    // Query Firestore for locations that match the input in either city or country
    const q = query(locationsRef, where("city", ">=", input), where("city", "<=", input + "\uf8ff"));
    const querySnapshot = await getDocs(q);

    // Display "City, Country" suggestions
    querySnapshot.forEach((doc) => {
        const locationData = doc.data();
        const formattedLocation = `${locationData.city}, ${locationData.country}`;
        const option = document.createElement("div");
        option.textContent = formattedLocation;
        
        option.addEventListener("click", () => {
            document.getElementById("location").value = formattedLocation;
            locationSuggestions.innerHTML = "";  // Clear suggestions
        });
        locationSuggestions.appendChild(option);
    });
});

// Optional: Clear suggestions if user clicks outside of the input
document.addEventListener("click", (event) => {
    if (!document.getElementById("location").contains(event.target)) {
        document.getElementById("location-suggestions").innerHTML = "";
    }
});




// Handle file input selection and update label to show selected file name
const fileInput = document.getElementById('fileInput');
const uploadLabel = document.querySelector('.upload-label');
uploadLabel.addEventListener('click', () => {
    fileInput.click(); // Trigger file input when label is clicked
});
fileInput.addEventListener('change', () => {
    uploadLabel.querySelector('span').textContent = fileInput.files[0] ? fileInput.files[0].name : 'Upload image';
});

// Function to update or create a location document in Firestore
async function handleLocation(locationName) {
    const locationsRef = collection(db, "Locations");
    const q = query(locationsRef, where("location", "==", locationName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // No such location exists, create new document
        return addDoc(locationsRef, {
            location: locationName,
            photoCount: 1  // Initialize photo count
        });
    } else {
        // Location exists, increment the photo count
        const locationDoc = querySnapshot.docs[0];
        const locationDocRef = doc(db, "Locations", locationDoc.id);
        return updateDoc(locationDocRef, {
            photoCount: increment(1)
        });
    }
}

// Handle the upload process when the upload button is clicked
document.querySelector('.upload-btn').addEventListener('click', async () => {
    const caption = document.getElementById('caption').value;
    const location = document.getElementById('location').value;
    const isPrivate = document.getElementById('private').checked;
    const username = sessionStorage.getItem('username'); // Retrieve the username from session storage
    const userId = sessionStorage.getItem('userId'); // Retrieve the user ID from session storage

    if (!fileInput.files[0]) {
        alert('Please select an image to upload.');
        return;
    }

    const file = fileInput.files[0];
    const fileName = `${userId}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `photos/${fileName}`);

    try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        const status = isPrivate ? 'Private' : 'Public';

        // Save photo details in Firestore with initialized like and comment counts
        const photoDocRef = await addDoc(collection(db, 'Photos'), {
            caption,
            location,
            imageUrl: downloadURL,
            status,
            userId,
            username,
            uploadDate: new Date().toISOString(),
            likesCount: 0, // Initialize likes count to 0
            commentsCount: 0 // Initialize comments count to 0
        });

        // Handle location data
        await handleLocation(location);

        alert('Photo uploaded successfully!');
        document.getElementById('caption').value = '';
        document.getElementById('location').value = '';
        fileInput.value = '';
        uploadLabel.querySelector('span').textContent = 'Upload image';
    } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Failed to upload photo. Please try again.');
    }
});

// Redirect to user dashboard if cancel button is clicked
document.querySelector('.cancel-btn').addEventListener('click', () => {
    window.location.href = 'UserDashboard.html';
});

// Enhance the caption input to automatically linkify hashtags
document.getElementById('caption').addEventListener('input', function(event) {
    const inputText = event.target.innerText;
    let formattedText = inputText.replace(/(#\w+)(\s|$)/g, '<span class="hashtag">$1</span>$2');
    event.target.innerHTML = formattedText;

    // Move cursor to end to avoid issues with cursor position after innerHTML change
    document.execCommand('selectAll', false, null);
    document.getSelection().collapseToEnd();

    // Extract hashtag for suggestion
    const lastWord = inputText.split(/\s/).pop();
    if (lastWord.startsWith("#")) {
        fetchHashtags(lastWord.slice(1));
    }
});

function fetchHashtags(currentTag) {
    const suggestionsElement = document.getElementById('hashtag-suggestions');
    suggestionsElement.innerHTML = ''; // Clear previous suggestions

    // Assume hashtags is an available array of existing hashtag names
    const matchingTags = hashtags.filter(tag => tag.startsWith(currentTag));

    matchingTags.forEach(tag => {
        const option = document.createElement('div');
        option.textContent = `#${tag}`;
        option.onclick = function() {
            // Append selected tag to caption and clear suggestions
            const caption = document.getElementById('caption');
            caption.innerText += `#${tag} `;
            suggestionsElement.innerHTML = '';
        };
        suggestionsElement.appendChild(option);
    });
}


function showHashtagSuggestions(currentTag) {
    const suggestionsElement = document.getElementById('hashtag-suggestions');
    suggestionsElement.innerHTML = ''; // Clear previous suggestions
    suggestionsElement.style.display = 'block';

    // Assuming `hashtags` is an array of existing hashtag names fetched from Firestore
    const matchingTags = hashtags.filter(tag => tag.startsWith(currentTag));

    matchingTags.forEach(tag => {
        const option = document.createElement('div');
        option.textContent = `#${tag}`;
        option.onclick = function() {
            // Logic to add this tag to the caption
        };
        suggestionsElement.appendChild(option);
    });
}

// Firestore logic to add new hashtags or update counts
function updateHashtagInFirestore(tag) {
    const tagRef = db.collection('Hashtags').doc(tag);

    tagRef.get().then(doc => {
        if (doc.exists) {
            tagRef.update({ photoCount: firebase.firestore.FieldValue.increment(1) });
        } else {
            tagRef.set({ photoCount: 1 });
        }
    });
}





//=====================================Upload.html===============================//