const express = require('express');
const cors = require('cors');
const axios = require('axios');
const LawcusAPI = require('./lawcus.js'); // Assuming lawcus.js exports LawcusAPI
const fs = require('fs');
const Auth = require('./auth.js'); // Assuming auth.js exports Auth
const cron = require('node-cron');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

// Redirect to Auth
app.get('/', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUri = process.env.REDIRECT_URI;
    const authUrl = `https://auth.lawcus.com/auth?response_type=code&state=&client_id=${clientId}&scope=&redirect_uri=${encodeURIComponent(redirectUri)}`;

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
            const { access_token, refresh_token } = data;
            // Store in a text file
            Auth.saveTokens(access_token, refresh_token);
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
app.get('/oauth/refresh', async (req, res) => {
    try {
        // Get refresh token from tokens.txt
        const refresh_token = Auth.getTokenFromFile('refresh');
        const auth = await axios.post("https://auth.lawcus.com/oauth/token", {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": process.env.CLIENT_ID,
            "client_secret": process.env.CLIENT_SECRET,
            "redirect_uri": process.env.REDIRECT_URI
        })
        if (auth.status === 200) {
            const data = auth.data;
            const { access_token, refresh_token } = data;
            // Store in a text file
            Auth.saveTokens(access_token, refresh_token);
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
        // const { access_token } = req.query;
        // Get access token from tokens.txt
        const access_token = Auth.getTokenFromFile('access');
        if (!access_token) return res.status(401).json({ message: 'Access token not found. Please authenticate the app first. (It is a one time step.)' });
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
        const { lead_data } = req.body;
        const access_token = Auth.getTokenFromFile('access');
        if (!access_token) return res.status(401).json({ message: 'Access token not found. Please authenticate the app first. (It is a one time step.)' });
        // Check Lead Data Validation
        if (!validateLead(lead_data)) {
            return res.status(400).json({ message: 'Invalid lead data' });
        }
        console.log(`${lead_data.contact_first_name}`);
        var dump = `{\n   "contact_first_name": "${lead_data.contact_first_name}",\n    "contact_last_name": "${lead_data.contact_last_name}",\n    "contact_type": "${lead_data.contact_type}",\n    "contact_email": "${lead_data.contact_email}",\n    "contact_phone": "${lead_data.contact_phone}",\n    "contact_city": "${lead_data.contact_city}",\n    "contact_state": "${lead_data.contact_state}",\n    "matter_description": "${lead_data.matter_description}"\n}`;
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
    const requiredFields = ['contact_first_name', 'contact_last_name', 'contact_email', 'contact_type', 'contact_phone', 'contact_city', 'contact_state', 'matter_description'];
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

cron.schedule('*/50 * * * *', async () => {
    console.log('Refreshing access token...');
    try {
        // Get refresh token from tokens.txt
        const refresh_token = Auth.getTokenFromFile('refresh');
        const auth = await axios.post("https://auth.lawcus.com/oauth/token", {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": process.env.CLIENT_ID,
            "client_secret": process.env.CLIENT_SECRET,
            "redirect_uri": process.env.REDIRECT_URI
        })
        if (auth.status === 200) {
            const data = auth.data;
            const { access_token, refresh_token } = data;
            // Store in a text file
            Auth.saveTokens(access_token, refresh_token);
            console.log(data);
        } else {
            console.error({ status: auth.status, message: auth.statusText });
        }
    } catch (error) {
        console.error('Token refresh failed:', error.message);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});