// server.js (CommonJS)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const DATA_DIR = __dirname;
const LOG_FILE = path.join(DATA_DIR, 'logs.json');
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(DATA_DIR)); // serve index.html & admin.html

// -- Config: change passwords here --
const USERS = {
  admin: { password: "Admin@2025", role: "superadmin" },
  user:  { password: "User@2025",  role: "analyst" },
};

// Fixed, hardcoded exploit token (The secret link)
// This is the key the user must paste to see the real data dashboard.
const EXPLOIT_TOKEN = 'BX-EXPLOIT-420-ASSET-DUMP'; 
// -- End config --

// Helper function to generate mock asset data (The real, sensitive data)
function generateRealDataAssets() {
  const assets = [];
  const popularTokens = ["BTC", "ETH", "USDT", "USDC", "BNB", "XRP", "SOL", "ADA", "DOGE", "TRX", "DOT", "LINK", "LTC", "AVAX", "UNI", "BCH", "MKR", "AAVE", "NEAR", "ATOM", "FTT", "APT", "VET", "EOS", "ALGO", "ZEC", "KSM"];
  
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  
  for (let i = 0; i < 15; i++) {
    const token = popularTokens[rnd(0, popularTokens.length - 1)];
    const balance = (Math.random() * 5000 + 100).toFixed(2);
    // Generate large, easily identifiable dollar values for "real" data
    const value = (parseFloat(balance) * rnd(100, 5000) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
    
    assets.push({
      id: token + '-ID-' + rnd(1000, 9999),
      token: token,
      balance: balance + ' ' + token,
      value: value,
      transactions: rnd(200, 1500),
      lastTx: new Date(Date.now() - rnd(1, 365) * 24 * 3600 * 1000).toISOString().slice(0, 10),
    });
  }
  return assets;
}

// The ACTUAL data that is revealed by the secret link
const REAL_DATA = {
    updated: new Date().toISOString(),
    // This note is the "hacker's evidence" that is prominently displayed
    notes: "!!! ALERT: Secure system data accessed via unauthenticated token exploit. This data is highly sensitive.",
    assets: generateRealDataAssets()
};

// helper: read/write logs
function readLogs(){
  try { return JSON.parse(fs.readFileSync(LOG_FILE,'utf8') || '[]'); }
  catch { return []; }
}
function writeLogs(logs){ fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2)); }

// POST /api/log  -- receive honeypot events (includes lat/lon and userAgent)
app.post('/api/log', (req,res) => {
  const entry = { ...req.body, time: new Date().toISOString(), ip: req.ip }; 
  const logs = readLogs();
  logs.unshift(entry); // newest first
  writeLogs(logs);
  
  const location = entry.lat && entry.lon ? `[${entry.lat.toFixed(4)}, ${entry.lon.toFixed(4)}]` : 'N/A';
  const ua = entry.userAgent ? entry.userAgent.substring(0, 30) + '...' : 'N/A';
  
  console.log(`LOG: ${entry.event} | User: ${entry.profileName || entry.user || 'Anon'} | Loc: ${location} | Agent: ${ua}`);

  res.json({ success: true });
});

// POST /api/real-data -- authenticate and return real data (Legacy password flow, not used by honeypot token)
app.post('/api/real-data', (req,res) => {
  const { view, key } = req.body || {};
  if(!view || !key) return res.json({ success:false, message:'missing' });
  
  const u = USERS[view];
  if(u && u.password === key){
    return res.json({ success:true, data: REAL_DATA, user:view });
  }else{
    return res.json({ success:false, message:'invalid' });
  }
});

// GET /api/secret-data -- Token-based exploit access (Honeypot trigger)
app.get('/api/secret-data', (req, res) => {
    const { token } = req.query;

    if (token === EXPLOIT_TOKEN) {
        // Successful access returns the sensitive mock data
        return res.json({ 
            success: true, 
            data: REAL_DATA, 
            message: "Access granted via privileged token."
        });
    } else {
        return res.json({ 
            success: false, 
            data: null, 
            message: "Invalid token or access denied."
        });
    }
});


// GET /api/logs -- return logs to admin
app.get('/api/logs', (req,res) => {
  res.json({ success: true, logs: readLogs() });
});

// POST /api/logs/clear -- new endpoint to clear logs
app.post('/api/logs/clear', (req,res) => {
    writeLogs([]);
    res.json({ success: true, message: "Logs cleared." });
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`
  -- Secret Exploit Link (Use this to test the honeypot!) --
  http://localhost:${PORT}/index.html?token=${EXPLOIT_TOKEN}
  `);
});