const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', (file) => {
    if (file.endsWith('.tsx')) {
        let content = fs.readFileSync(file, 'utf8');
        if (content.includes('getStatusBadge') && content.includes("case 'closed':")) {
            if (!content.includes("case 'incomplete':")) {
                content = content.replace(
                    /case 'closed':/g,
                    "case 'incomplete':\n                return <span className=\"badge bg-orange-100 text-orange-700 border-orange-200\">Incomplete</span>;\n            case 'ready_pickup':\n                return <span className=\"badge bg-indigo-100 text-indigo-700 border-indigo-200\">Ready Pickup</span>;\n            case 'closed':"
                );
                fs.writeFileSync(file, content, 'utf8');
                console.log(`Updated ${file}`);
            }
        }
    }
});
