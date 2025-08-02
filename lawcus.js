// Create Lawcus API class which contains its' base url, configs and axios methods
const axios = require('axios');

class LawcusAPI {
    constructor(accessToken) {
        this.baseUrl = 'https://api.us.lawcus.com'; // Update if needed
        this.accessToken = accessToken;
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Oauth Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async getLeads() {
        const response = await this.client.get('/leadsources');
        return response;
    }

    async createLead(data) {
        const response = await this.client.post('/leads', data, { maxBodyLength: Infinity });
        return response;
    }
}

module.exports = LawcusAPI;