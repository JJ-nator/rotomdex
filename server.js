const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate credentials on first run
const CREDS_FILE = path.join(DATA_DIR, 'credentials.json');
const CREDS_TXT = path.join(__dirname, 'credentials.txt');
let credentials;

if (fs.existsSync(CREDS_FILE)) {
  credentials = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
} else {
  // Generate new credentials
  const username = 'rotom_' + uuidv4().substring(0, 8);
  const password = uuidv4().substring(0, 16) + '!';
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  credentials = { username, hashedPassword };
  fs.writeFileSync(CREDS_FILE, JSON.stringify(credentials, null, 2));
  fs.writeFileSync(CREDS_TXT, `ROTOMDEX CREDENTIALS\n====================\nUsername: ${username}\nPassword: ${password}\n`);
  
  console.log('\n⚡ ROTOMDEX CREDENTIALS GENERATED ⚡');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('=====================================\n');
}

// Apps configuration
const APPS_FILE = path.join(DATA_DIR, 'apps.json');
function loadApps() {
  if (fs.existsSync(APPS_FILE)) {
    return JSON.parse(fs.readFileSync(APPS_FILE, 'utf8'));
  }
  // Default apps - will be populated from GitHub/Render
  const defaultApps = {
    apps: [
      {
        name: "Clinic Onboarding",
        description: "Create ClickUp tasks for new clinic onboarding",
        url: "https://clinic-onboarding.onrender.com",
        repo: "https://github.com/JJ-nator/vip-clinic-onboarding",
        icon: "🏥"
      }
    ]
  };
  fs.writeFileSync(APPS_FILE, JSON.stringify(defaultApps, null, 2));
  return defaultApps;
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || uuidv4(),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production' && process.env.RENDER,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
}

// Routes
app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === credentials.username && bcrypt.compareSync(password, credentials.hashedPassword)) {
    req.session.authenticated = true;
    req.session.username = username;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/api/apps', requireAuth, (req, res) => {
  const data = loadApps();
  res.json(data.apps);
});

app.get('/api/status', requireAuth, (req, res) => {
  res.json({ 
    status: 'ONLINE',
    user: req.session.username,
    timestamp: new Date().toISOString()
  });
});

// GitHub integration - fetch Render services
app.get('/api/scan-github', requireAuth, async (req, res) => {
  const GITHUB_TOKEN = process.env.GH_TOKEN;
  const RENDER_API_KEY = process.env.RENDER_API_KEY;
  
  if (!GITHUB_TOKEN || !RENDER_API_KEY) {
    return res.json({ error: 'API keys not configured', apps: [] });
  }
  
  try {
    // Fetch Render services
    const renderRes = await fetch('https://api.render.com/v1/services?limit=50', {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}` }
    });
    const services = await renderRes.json();
    
    const apps = services
      .filter(s => s.service && s.service.serviceDetails?.url)
      .map(s => ({
        name: s.service.name,
        description: `Deployed on Render (${s.service.serviceDetails.region})`,
        url: s.service.serviceDetails.url,
        repo: s.service.repo,
        icon: getServiceIcon(s.service.name)
      }));
    
    // Save to apps.json
    const data = { apps, lastScan: new Date().toISOString() };
    fs.writeFileSync(APPS_FILE, JSON.stringify(data, null, 2));
    
    res.json({ success: true, apps });
  } catch (err) {
    res.json({ error: err.message, apps: [] });
  }
});

function getServiceIcon(name) {
  const lower = name.toLowerCase();
  if (lower.includes('clinic') || lower.includes('medical')) return '🏥';
  if (lower.includes('rotom') || lower.includes('dex')) return '⚡';
  if (lower.includes('api')) return '🔌';
  if (lower.includes('bot')) return '🤖';
  return '📦';
}

// Version endpoint
const BUILD_VERSION = process.env.RENDER_GIT_COMMIT?.substring(0, 7) || 'dev';
app.get('/api/version', (req, res) => {
  res.json({ version: BUILD_VERSION });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n⚡ ROTOMDEX ONLINE ⚡`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📦 Version: ${BUILD_VERSION}`);
});
