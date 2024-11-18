// Import Firebase services
import { db, storage } from './firebaseConfig.js'; // Ensure `storage` is imported
import { collection, addDoc, query, where, getDocs, doc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';


// Firebase Authentication
const auth = getAuth();

// Allowed image formats
const allowedImageFormats = ['image/jpeg', 'image/png', 'image/gif'];
const maxFileSizeMB = 20; // Maximum file size in MB 


// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkUserAuthentication(); // Ensure user authentication
    setupHashtags(); // Initialize hashtag functionality

     // Change upload label text and check file format immediately after file selection
     document.getElementById('fileInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            if (allowedImageFormats.includes(file.type) && file.size <= maxFileSizeMB * 1024 * 1024) {
                document.querySelector('.upload-label span').textContent = file.name; // Update label with file name
            } else if (file.size > maxFileSizeMB * 1024 * 1024) {
                alert(`File size exceeds ${maxFileSizeMB}MB. Please select a smaller file.`);
                event.target.value = ''; // Clear the file input
                document.querySelector('.upload-label span').textContent = 'Upload image'; // Reset label text
            } else {
                alert('Invalid file format. Please select a valid image file (JPEG, PNG, GIF).');
                event.target.value = ''; // Clear the file input
                document.querySelector('.upload-label span').textContent = 'Upload image'; // Reset label text
            }
        } else {
            document.querySelector('.upload-label span').textContent = 'Upload image'; // Reset if no file selected
        }
    });

});

function checkUserAuthentication() {
    document.body.style.display = "none"; // Hide the page content initially

    onAuthStateChanged(auth, user => {
        if (!user) {
            redirectToLogin(); // Redirect to login if not authenticated
        } else {
            // Retrieve the role from session storage
            const userRole = sessionStorage.getItem("role");

            if (userRole !== "user") {
                redirectToLogin(); // Redirect to login if not a "user"
            } else {
                document.body.style.display = "block"; // Show the page content
                console.log("Access granted for user with role:", userRole);
            }
        }
    });
}

// Redirect to login function
function redirectToLogin() {
    window.location.href = '../html/Login.html'; // Redirect to the login page
}


// Handle file upload and save data to Firestore
document.querySelector('.upload-btn').addEventListener('click', async () => {
    const caption = document.getElementById('caption').value;
    const city = document.getElementById('city').value.trim().toLowerCase();
    const country = document.getElementById('country').value.trim().toLowerCase();
    const isPrivate = document.getElementById('private').checked;
    const userId = auth.currentUser?.uid;

    if (!userId || !document.getElementById('fileInput').files[0]) {
        alert('Please select an image to upload and ensure you are logged in.');
        return;
    }

    if (!city || !country) {
        alert('Please provide both city and country.');
        return;
    }

    const file = document.getElementById('fileInput').files[0];
    const fileName = `${userId}_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `photos/${fileName}`);

    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    if (!allowedImageFormats.includes(file.type)) {
        alert('Invalid file format. Please select a valid image file (JPEG, PNG, GIF).');
        return;
    }

    if (file.size > maxFileSizeMB * 1024 * 1024) {
        alert(`File size exceeds ${maxFileSizeMB}MB. Please select a smaller file.`);
        return;
    }

    // Check if location exists and add it if necessary, and update photo count
    await checkAndAddOrUpdateLocation(city, country);

    // Start the upload process
    const uploadTask = uploadBytesResumable(storageRef, file);
console.log("Starting upload for file:", file.name);


    // Monitor upload progress
    uploadTask.on(
        "state_changed",
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log("Upload is " + progress + "% done");
            document.getElementById("progress-bar").style.width = progress + "%"; // Update the progress bar width
            document.getElementById("progress-text").textContent = "Upload " + Math.round(progress) + "%"; // Update the progress text
        },

        (error) => {
            console.error("Error uploading file:", error);
            alert('Failed to upload photo. Please try again.');
        },
        async () => {
            // Handle upload success
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const status = isPrivate ? 'Private' : 'Public';

                // Retrieve hashtags from the input
                const hashtags = getHashtagsFromInput(); // Extract hashtags from the input
                 
                
                await addDoc(collection(db, 'Photos'), {
                    caption,
                    city,
                    country,
                    imageUrl: downloadURL,
                    status,
                    userId,
                    uploadDate: new Date().toISOString(),
                    likesCount: 0,
                    commentsCount: 0,
                    hashtags, // Save hashtags in the photo document
                });
                
                // Update the label text with the uploaded photo name
            document.querySelector('.upload-label span').textContent = file.name;

                // Save hashtags to Firestore and increment their photo count
                await saveHashtagsToFirestore(hashtags);

                // Update the label text with the uploaded photo name
                document.querySelector('.upload-label span').textContent = file.name;

                alert('Photo uploaded successfully!');
                resetUploadForm();
            } catch (error) {
                console.error('Error saving photo details to Firestore:', error);
                alert('Failed to save photo details. Please try again.');
            }
        }
    );
});

// Function to check and add/update location and photo count
async function checkAndAddOrUpdateLocation(city, country) {
    const locationsRef = collection(db, "Location");
    const q = query(locationsRef, where("city", "==", city), where("country", "==", country));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // Add the new location with photoCount = 1
        await addDoc(locationsRef, {
            city,
            country,
            photoCount: 1
        });
    } else {
        // Increment photoCount if location exists
        const locationDoc = querySnapshot.docs[0];
        const locationRef = doc(db, "Location", locationDoc.id);
        await updateDoc(locationRef, {
            photoCount: increment(1)
        });
    }
}


// Save hashtags to Firestore
async function saveHashtagsToFirestore(hashtags) {
    const hashtagRef = collection(db, 'Hashtag');

    for (const hashtag of hashtags) {
        const q = query(hashtagRef, where('hashtag', '==', hashtag));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            await addDoc(hashtagRef, { hashtag, photoCount: 1 });
        } else {
            const hashtagDoc = querySnapshot.docs[0];
            const hashtagDocRef = doc(db, 'Hashtag', hashtagDoc.id);
            await updateDoc(hashtagDocRef, { photoCount: increment(1) });
        }
    }
}


// Extract hashtags from input
function getHashtagsFromInput() {
    const hashtagElements = document.querySelectorAll('.hashtag-circle span');
    return Array.from(hashtagElements).map((el) => el.textContent.replace('#', ''));
}



// Reset the upload form
function resetUploadForm() {
    document.getElementById('caption').value = '';
    document.getElementById('city').value = '';
    document.getElementById('country').value = '';
    document.getElementById('fileInput').value = '';
    document.querySelector('.upload-label span').textContent = 'Upload image'; // Reset the label text
    document.getElementById('progress-bar').style.width = '0%'; // Reset the progress bar
    document.getElementById('progress-text').textContent = 'Upload 0%'; // Reset progress text
    document.getElementById('hashtag-warning').style.display = 'none'; // Hide the warning

    // Clear hashtag input wrapper and reinitialize
    const hashtagWrapper = document.getElementById('hashtag-wrapper');
    hashtagWrapper.innerHTML = '<input type="text" id="hashtagInput" placeholder="Type a hashtag and press space...">';

    // Remove existing hashtag count display
    const hashtagCountDisplay = document.getElementById('hashtag-count');
    if (hashtagCountDisplay) {
        hashtagCountDisplay.remove();
    }

    // Reinitialize hashtags
    setupHashtags();
}


// Handle location autocomplete suggestions
const cityInput = document.getElementById("city");
const countryInput = document.getElementById("country");
const citySuggestions = document.getElementById("city-suggestions");
const countrySuggestions = document.getElementById("country-suggestions");

// Autocomplete for city
cityInput.addEventListener("input", async (event) => {
    const input = event.target.value.toLowerCase();
    citySuggestions.innerHTML = ""; // Clear previous suggestions

    if (input.trim() === "") {
        citySuggestions.style.display = "none";
        return;
    }

    const locationsRef = collection(db, "Location");
    const q = query(locationsRef, where("city", ">=", input), where("city", "<=", input + "\uf8ff"));
    const querySnapshot = await getDocs(q);

    const uniqueCities = new Set(); // Ensure uniqueness

    querySnapshot.forEach((doc) => {
        const locationData = doc.data();
        uniqueCities.add(locationData.city.toLowerCase()); // Add unique city
    });

    uniqueCities.forEach((cityName) => {
        const option = document.createElement("div");
        option.textContent = cityName;

        option.addEventListener("click", () => {
            cityInput.value = cityName;
            citySuggestions.style.display = "none"; // Hide on selection
        });

        citySuggestions.appendChild(option);
    });

    citySuggestions.style.display = "block"; // Show suggestions
});

// Autocomplete for country
countryInput.addEventListener("input", async (event) => {
    const input = event.target.value.toLowerCase();
    countrySuggestions.innerHTML = ""; // Clear previous suggestions

    if (input.trim() === "") {
        countrySuggestions.style.display = "none";
        return;
    }

    const locationsRef = collection(db, "Location");
    const q = query(locationsRef, where("country", ">=", input), where("country", "<=", input + "\uf8ff"));
    const querySnapshot = await getDocs(q);

    const uniqueCountries = new Set(); // Ensure uniqueness

    querySnapshot.forEach((doc) => {
        const locationData = doc.data();
        uniqueCountries.add(locationData.country.toLowerCase()); // Add unique country
    });

    uniqueCountries.forEach((countryName) => {
        const option = document.createElement("div");
        option.textContent = countryName;

        option.addEventListener("click", () => {
            countryInput.value = countryName;
            countrySuggestions.style.display = "none"; // Hide on selection
        });

        countrySuggestions.appendChild(option);
    });

    countrySuggestions.style.display = "block"; // Show suggestions
});

// Hide dropdowns when clicking outside
document.addEventListener("click", (event) => {
    if (!cityInput.contains(event.target) && !citySuggestions.contains(event.target)) {
        citySuggestions.style.display = "none"; // Hide city dropdown
    }
    if (!countryInput.contains(event.target) && !countrySuggestions.contains(event.target)) {
        countrySuggestions.style.display = "none"; // Hide country dropdown
    }
});

// Show suggestions when input is focused
cityInput.addEventListener("focus", () => {
    if (citySuggestions.innerHTML.trim() !== "") {
        citySuggestions.style.display = "block";
    }
});
countryInput.addEventListener("focus", () => {
    if (countrySuggestions.innerHTML.trim() !== "") {
        countrySuggestions.style.display = "block";
    }
});


// Enhance caption input with hashtag suggestions
const captionInput = document.getElementById('caption');
const wordCountDisplay = document.getElementById('word-count');
const maxLetters = 100; // Set the letter limit


// Enhance caption input with letter counting and hashtag suggestions
captionInput.addEventListener('input', async () => {
    const inputText = captionInput.value;

    // Count letters excluding spaces
    const letterCount = inputText.replace(/\s/g, '').length;
    wordCountDisplay.textContent = `${letterCount} / ${maxLetters} letters`;

    // Enforce the letter limit
    if (letterCount > maxLetters) {
        captionInput.value = captionInput.value.slice(0, maxLetters);
        wordCountDisplay.textContent = `${maxLetters} / ${maxLetters} letters`;
    }

    
});


// Hashtag functionality
function setupHashtags() {
    const hashtagInput = document.getElementById('hashtagInput');
    const hashtagWrapper = document.getElementById('hashtag-wrapper');
    const hashtagWarning = document.getElementById('hashtag-warning');

    // Check if hashtagCountDisplay already exists
    let hashtagCountDisplay = document.getElementById('hashtag-count');
    if (!hashtagCountDisplay) {
        hashtagCountDisplay = document.createElement('div');
        hashtagCountDisplay.className = 'word-count';
        hashtagCountDisplay.id = 'hashtag-count';
        document.querySelector('.hashtag-container').appendChild(hashtagCountDisplay);
    }

    hashtagCountDisplay.textContent = '0 / 5 hashtags'; // Reset count

    let hashtags = [];

    hashtagInput.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            const hashtag = hashtagInput.value.trim();

            if (hashtags.length >= 5) {
                showWarning('Maximum 5 hashtags allowed.');
            } else if (!/^[a-zA-Z0-9]+$/.test(hashtag)) {
                showWarning('Invalid hashtag. Only letters and numbers allowed.');
            } else {
                addHashtag(hashtag);
                hashtagInput.value = '';
            }
        }
    });

    function addHashtag(hashtag) {
        hashtags.push(hashtag);
        const hashtagCircle = document.createElement('div');
        hashtagCircle.className = 'hashtag-circle';
        hashtagCircle.innerHTML = `<span>#${hashtag}</span><button class="remove-hashtag">&times;</button>`;
        hashtagWrapper.insertBefore(hashtagCircle, hashtagInput);

        hashtagCircle.querySelector('.remove-hashtag').addEventListener('click', () => {
            hashtags = hashtags.filter((h) => h !== hashtag);
            hashtagCircle.remove();
            updateHashtagCount();
        });

        updateHashtagCount();
    }

    function updateHashtagCount() {
        hashtagCountDisplay.textContent = `${hashtags.length} / 5 hashtags`;
        if (hashtags.length < 5) hashtagWarning.style.display = 'none';
    }

    function showWarning(message) {
        hashtagWarning.textContent = message;
        hashtagWarning.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cancelButton = document.querySelector('.cancel-btn');

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // Redirect to the UserDashboard
            window.location.href = '../html/UserDashboard.html';
        });
    }
});
