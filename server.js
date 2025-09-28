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

// IMPORTANT: Set CORS to allow all origins during development. 
// For production, this should be restricted to your deployment URL.
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
  const popularTokens = ["BTC", "ETH", "USDT", "USDC", "BNB", "XRP", "SOL", "ADA", "DOGE", "TRX", "DOT", "LINK", "LTC", "AVAX", "UNI", "FIL", "ICP", "VET", "XMR", "EOS"];
  for(let i=0; i<5; i++){
    const token = popularTokens[Math.floor(Math.random() * popularTokens.length)];
    const price = (Math.random() * 50000).toFixed(2);
    const mcap = (Math.random() * 100000000000).toFixed(0);

    assets.push({
      id: `ASSET-${i+1}`,
      token: token,
      currentPrice: `$${Number(price).toLocaleString()}`,
      marketCap: `$${Number(mcap).toLocaleString()}`,
      holding: `${(Math.random() * 10000).toFixed(2)} ${token}`,
      status: i % 2 === 0 ? 'Active' : 'Warning'
    });
  }
  return assets;
}

const REAL_DATA = {
    totalValue: "$1.4 Billion",
    assets: generateRealDataAssets(),
    privateKeys: [
        "0xPr1vat3K3yBTC1...420",
        "0xPr1vat3K3yETH2...690",
        "0xPr1vat3K3yUSDT3...333"
    ]
};

// --- LOGGING UTILITIES ---

function readLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading or parsing logs:", error.message);
    return [];
  }
}

function appendLog(logEntry) {
  try {
    const logs = readLogs();
    logs.unshift({ 
        ...logEntry, 
        time: new Date().toISOString()
    });
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error("Error writing to logs:", error.message);
  }
}


// --- API ENDPOINTS ---

// POST /api/log -- receive and save client-side logs
app.post('/api/log', (req, res) => {
  const logEntry = req.body;
  const ip = req.ip; // Get IP address

  // Clean up any sensitive data before logging (e.g., if a token was accidentally sent)
  if (logEntry.key) delete logEntry.key;

  appendLog({ ...logEntry, ip });
  res.json({ success: true });
});


// POST /api/real-data -- Check login credentials (Legitimate flow)
app.post('/api/real-data', (req, res) => {
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
app.post('/api/logs/clear', (req, res) => {
  try {
    fs.writeFileSync(LOG_FILE, '[]', 'utf8');
    res.json({ success: true, message: "Logs cleared successfully." });
  } catch (e) {
    console.error("Failed to clear logs:", e.message);
    res.status(500).json({ success: false, message: "Failed to clear logs." });
  }
});


// --- SERVER START ---

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`\n======================================================`);
  console.log(`\n  🔓 ADMIN PANEL: http://localhost:${PORT}/admin.html`);
  console.log(`  \t(View=admin | Key=Admin@2025)`);
  console.log(`\n  🎣 HONEYPOT URL (The Secret Link to Log):`);
  console.log(`  \t[Copy this link into index.html's address bar]`);
  console.log(`  \thttp://localhost:${PORT}/index.html?token=${EXPLOIT_TOKEN}`);
  console.log(`\n======================================================\n`);
});
