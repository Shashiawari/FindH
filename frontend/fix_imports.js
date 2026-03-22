const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

// All files that should have API_URL import, mapped to their relative depth from root (frontend/)
const targets = [
    { file: 'context/AppContext.jsx', rel: '../lib/api.js' },
    { file: 'hooks/useSignedUrl.js', rel: '../lib/api.js' },
    { file: 'components/Navbar.jsx', rel: '../lib/api.js' },
    { file: 'app/upload/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/signup/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/login/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/profile/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/profile/upload-docs/[bookingId]/page.jsx', rel: '../../../../lib/api.js' },
    { file: 'app/book-agent/[agentId]/page.jsx', rel: '../../../lib/api.js' },
    { file: 'app/rooms/[id]/page.jsx', rel: '../../../lib/api.js' },
    { file: 'app/agent-login/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/agents/[agentId]/page.jsx', rel: '../../../lib/api.js' },
    { file: 'app/agent/dashboard/page.jsx', rel: '../../../lib/api.js' },
    { file: 'app/agent/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/admin-login/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/admin/page.jsx', rel: '../../lib/api.js' },
    { file: 'app/admin/dashboard/page.jsx', rel: '../../../lib/api.js' },
];

let fixed = 0;
let skipped = 0;

targets.forEach(({ file, rel }) => {
    const fullPath = path.join(BASE_DIR, file);
    if (!fs.existsSync(fullPath)) { console.log('SKIP (not found):', file); return; }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Skip if API_URL import already present
    if (content.includes("from '") && content.includes('lib/api.js')) {
        console.log('OK (already imported):', file);
        skipped++;
        return;
    }

    // Skip if API_URL not used
    if (!content.includes('API_URL') && !content.includes('${API_URL}')) {
        console.log('SKIP (no usage):', file);
        return;
    }

    const importLine = `import API_URL from '${rel}';\n`;

    // Try to insert after 'use client' (with or without semicolon)
    if (content.startsWith("'use client'")) {
        // Match 'use client' with optional semicolon + newline(s)
        content = content.replace(/^'use client';?\r?\n/, (match) => match + '\n' + importLine);
    } else if (content.includes('import ')) {
        const firstImport = content.indexOf('import ');
        content = content.slice(0, firstImport) + importLine + content.slice(firstImport);
    } else {
        content = importLine + content;
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('FIXED:', file);
    fixed++;
});

console.log(`\nFixed: ${fixed}  |  Already OK: ${skipped}`);
