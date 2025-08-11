const fs = require('fs');

class Auth {
    constructor() {
        this.tokensFile = 'tokens.txt';
    }

    getTokenFromFile(tokenType) {
        try {
            if (!fs.existsSync(this.tokensFile)) return null;
            const tokens = fs.readFileSync(this.tokensFile, 'utf-8');
            if (tokenType === 'access') {
                return tokens.match(/Access Token: (\S+)/)[1];
            } else if (tokenType === 'refresh') {
                return tokens.match(/Refresh Token: (\S+)/)[1];
            } else {
                throw new Error('Invalid token type requested');
            }
        } catch (error) {
            console.error(`Error reading tokens file: ${error.message}`);
            return null;
        }
    }
    saveTokens(accessToken, refreshToken) {
        try {
            fs.writeFileSync(this.tokensFile, `Access Token: ${accessToken}\nRefresh Token: ${refreshToken}`);
        } catch (error) {
            console.error(`Error writing tokens to file: ${error.message}`);
        }
    }
}

module.exports = new Auth();