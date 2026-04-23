const fs = require('fs');
const path = require('path');

// Set this to your source directory
const TARGET_DIR = './src';

function walkFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
                results = results.concat(walkFiles(fullPath));
            }
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walkFiles(TARGET_DIR);
let updatedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Only target files that actually use the searchParams pattern
    if (content.includes('useSearchParams') && content.includes("searchParams.get('q')")) {

        // 1. Handle the import swap
        if (!content.includes('useLocation')) {
            // Swap if useLocation isn't there
            content = content.replace('useSearchParams', 'useLocation');
        } else {
            // Strip useSearchParams if useLocation is already imported
            content = content.replace(/,\s*useSearchParams/, '');
            content = content.replace(/useSearchParams\s*,\s*/, '');
        }

        // 2. Replace the hook initialization
        content = content.replace(/const\s+\[searchParams\]\s*=\s*useSearchParams\(\);?/g, 'const location = useLocation();');

        // 3. Replace the extraction logic 
        // Turns `const q = searchParams.get('q');` into `const q = location.state?.target;`
        // It captures whatever variable name was used (like 'q' or 'targetDomain')
        content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*searchParams\.get\(['"]q['"]\);?/g, 'const $1 = location.state?.target;');

        // 4. Update the useEffect dependency array
        content = content.replace(/\[searchParams\]/g, '[location.state]');

        fs.writeFileSync(file, content, 'utf8');
        console.log(`[MODIFIED] ${file}`);
        updatedCount++;
    }
});

console.log(`\nRefactor complete. Updated ${updatedCount} files.`);
console.log(`Run 'git diff' to verify the changes before pushing.`);