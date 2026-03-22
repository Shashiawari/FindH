const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

const targets = [
    'components/Navbar.jsx',
    'app/admin-login/page.jsx',
    'context/AppContext.jsx',
    'app/login/page.jsx',
    'app/agent-login/page.jsx',
    'app/agent/page.jsx',
    'app/admin/page.jsx',
    'app/agent/dashboard/page.jsx',
    'app/signup/page.jsx',
    'app/upload/page.jsx',
    'app/profile/page.jsx',
    'app/profile/upload-docs/[bookingId]/page.jsx',
    'hooks/useSignedUrl.js',
    'app/book-agent/[agentId]/page.jsx',
    'app/agents/[agentId]/page.jsx',
    'app/rooms/[id]/page.jsx',
    'app/admin/dashboard/page.jsx',
];

let total = 0;

targets.forEach(rel => {
    const file = path.join(BASE_DIR, rel);
    if (!fs.existsSync(file)) return;

    let content = fs.readFileSync(file, 'utf8');

    // Fix: '${API_URL}/path' → `${API_URL}/path`
    // Match single-quoted strings that start with ${API_URL}
    const before = content;
    content = content.replace(/'(\$\{API_URL\}[^']*)'/g, (_, inner) => '`' + inner + '`');

    if (content !== before) {
        const count = (before.match(/'(\$\{API_URL\}[^']*)'/g) || []).length;
        fs.writeFileSync(file, content, 'utf8');
        total += count;
        console.log(`FIXED (${count}): ${rel}`);
    }
});

console.log(`\nDone. Total fixed: ${total}`);
