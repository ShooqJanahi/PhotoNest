const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { db, auth } = require('./firebaseAdmin');  // Import both `db` and `auth`

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Basic route
app.get('/', (req, res) => {
    res.send('Welcome to the PhotoNest backend');
});

// Signup route
app.post('/signup', async (req, res) => {
    const { firstName, lastName, username, email, phone, password } = req.body;

    try {
        // Use `auth` to create a new user in Firebase Authentication
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: `${firstName} ${lastName}`,
        });

        // Prepare user data for Firestore
        const userData = {
            uid: userRecord.uid,
            firstName,
            lastName,
            username,
            email,
            phone,
            status: 'active',
            profilePic: 'https://example.com/default-profile-pic.jpg',
            lastActive: new Date().toISOString(),
            role: 'user',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: new Date().toISOString(),
        };

        // Store user data in Firestore
        await db.collection('users').doc(userRecord.uid).set(userData);

        res.status(201).json({ message: 'User created successfully', userId: userRecord.uid });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
