const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'DanteSystems97';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'dantealbertus/unbreakablesystems-library';
const GITHUB_FILE = 'data.json';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function readData() {
  // Try GitHub API first (persistent across deployments)
  if (GITHUB_TOKEN) {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      if (res.ok) {
        const json = await res.json();
        const content = Buffer.from(json.content, 'base64').toString('utf8');
        return JSON.parse(content);
      }
    } catch(e) { console.error('GitHub read error:', e.message); }
  }
  // Fallback: local file (resets on redeploy)
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) {}
  return { systems: null, categories: null };
}

async function writeData(data) {
  // Write to GitHub (persistent)
  if (GITHUB_TOKEN) {
    try {
      // Get current SHA (needed for update)
      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      let sha;
      if (getRes.ok) {
        const json = await getRes.json();
        sha = json.sha;
      }

      const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
      const body = {
        message: 'Update data via admin',
        content,
        ...(sha ? { sha } : {})
      };

      await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(body)
      });
      return;
    } catch(e) { console.error('GitHub write error:', e.message); }
  }
  // Fallback: local file
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Public: get all data
app.get('/api/data', async (req, res) => {
  try {
    res.json(await readData());
  } catch(e) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Admin: save data (requires password)
app.post('/api/data', async (req, res) => {
  const { password, systems, categories } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const current = await readData();
    if (systems !== undefined) current.systems = systems;
    if (categories !== undefined) current.categories = categories;
    await writeData(current);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Running on port ${PORT}${GITHUB_TOKEN ? ' [GitHub storage]' : ' [local file storage]'}`));
