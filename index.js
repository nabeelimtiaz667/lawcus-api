const express = require('express');
const cors = require('cors');
const axios = require('axios');
const LawcusAPI = require('./lawcus.js'); // Assuming lawcus.js exports LawcusAPI

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Redirect to Auth
app.get('/', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUri = process.env.REDIRECT_URI;
    const authUrl = `https://auth.lawcus.com/auth?response_type=code&state=&client_id=${process.env.CLIENT_ID}&scope=&redirect_uri=${process.env.REDIRECT_URI}`;

    res.redirect(authUrl);
});

// Get access token
app.get('/oauth', async (req, res) => {
    try {
        // Fetch code from query parameters
        const { code } = req.query;
        const auth = await axios.post("https://auth.lawcus.com/oauth/token", {
            "code": code,
            "grant_type": "authorization_code",
            "client_id": process.env.CLIENT_ID,
            "client_secret": process.env.CLIENT_SECRET,
            "redirect_uri": process.env.REDIRECT_URI
        })
        if (auth.status === 200) {
            const data = auth.data;
            res.status(200).json({ ...data });
        } else {
            res.status(auth.status).json({ message: auth.statusText });
        }
    } catch (error) {
        console.error('Error during OAuth token exchange:', error);
        res.status(500).json({ message: 'Internal Server Error' });
        return;
    }
})

// Referesh token
app.post('/oauth/refresh', async (req, res) => {
    try {
        // Fetch code from query parameters
        const { refresh_token } = req.body;
        const auth = await axios.post("https://auth.lawcus.com/oauth/token", {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": process.env.CLIENT_ID,
            "client_secret": process.env.CLIENT_SECRET,
            "redirect_uri": process.env.REDIRECT_URI
        })
        if (auth.status === 200) {
            const data = auth.data;
            res.status(200).json({ ...data });
        } else {
            res.status(auth.status).json({ message: auth.statusText });
        }
    } catch (error) {
        console.error('Error during OAuth token exchange:', error);
        res.status(500).json({ message: 'Internal Server Error' });
        return;
    }
})

// List contacts
app.get('/leads', async (req, res) => {
    try {
        const { access_token } = req.query;
        const lawcus = new LawcusAPI(access_token);
        const response = await lawcus.getLeads();
        if (response.status === 200) {
            console.log("API fetch Successfull");
        }
        res.status(response.status).json({ data: response.data });
    } catch (error) {
        const result = catchError(error);
        res.status(result.status).json(result);
    }
})

// Generate Leads
app.post('/leads', async (req, res) => {
    try {
        const { access_token, lead_data } = req.body;
        // Check Lead Data Validation
        if (!validateLead(lead_data)) {
            return res.status(400).json({ message: 'Invalid lead data' });
        }
        console.log(`${lead_data.contact_first_name}`);
        var dump = `{\n   "contact_first_name": "${lead_data.contact_first_name}",\n    "contact_last_name": "${lead_data.contact_last_name}",\n    "contact_type": "${lead_data.contact_type}",\n    "contact_email": "${lead_data.contact_email}",\n    "contact_phone": "${lead_data.contact_phone}",\n    "contact_city": "${lead_data.contact_city}",\n    "contact_state": "${lead_data.contact_state}"\n}`;
        const lawcus = new LawcusAPI(access_token);
        const response = await lawcus.createLead(dump);
        if (response.status === 200) {
            console.log("API fetch Successfull");
        }
        res.status(response.status).json({ data: response.data });
    } catch (error) {
        const result = catchError(error);
        res.status(result.status).json(result);
    }
});

function validateLead(data) {
    // The lead data should contain the following fields:
    // First Name, Last Name, Email, Phone, City, State
    const requiredFields = ['contact_first_name', 'contact_last_name', 'contact_email', 'contact_type', 'contact_phone', 'contact_city', 'contact_state'];
    for (const field of requiredFields) {
        if (!data[field]) {
            console.error(`Missing required field: ${field}`);
            return false;
        }
    }
    // Contact type is Enum: Either Person or Company
    if (!['Person', 'Company'].includes(data.contact_type)) {
        console.error('Invalid contact type:', data.contact_type);
        return false;
    }
    // Email should be a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contact_email)) {
        console.error('Invalid email format:', data.contact_email);
        return false;
    }
    // Phone should be a valid phone format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    if (!phoneRegex.test(data.contact_phone)) {
        console.error('Invalid phone format:', data.contact_phone);
        return false;
    }
    return true;
}

function catchError(error) {
    // Here we will check if error is an Axios or not and display accordingly
    if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.message);
        return { status: error.response?.status || 500, message: error.message };
    } else {
        console.error('Unexpected error:', error);
        return { status: 500, message: 'Internal Server Error' };
    }
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});