const fs = require('fs');
const log = fs.readFileSync('C:\\Users\\Afiah\\.gemini\\antigravity\\brain\\5db945b4-e100-4cd2-a186-5a56255576b2\\.system_generated\\logs\\overview.txt', 'utf8');

const lines = log.split('\n');
let found = false;

for (let line of lines) {
    if (line.includes('"name":"view_file"') && line.includes('auth.controller.ts')) {
        try {
            const data = JSON.parse(line);
            if (data.tool_responses) {
                for (let r of data.tool_responses) {
                    if (r.name === 'view_file' && r.output.includes('auth.controller.ts')) {
                        // Extract lines
                        const outputLines = r.output.split('\n');
                        let capturing = false;
                        let capturedLines = [];
                        let target = 1;
                        for (let outLine of outputLines) {
                            if (!capturing) {
                                if (outLine.startsWith('1: ')) {
                                    capturing = true;
                                    capturedLines.push(outLine.substring(3));
                                    target = 2;
                                }
                            } else {
                                const prefix = target + ': ';
                                if (outLine.startsWith(prefix)) {
                                    capturedLines.push(outLine.substring(prefix.length));
                                    target++;
                                }
                            }
                        }
                        if (capturedLines.length > 500) {
                            fs.writeFileSync('backend/src/controllers/auth.controller.ts', capturedLines.join('\n'));
                            console.log('RECOVERED ' + capturedLines.length + ' LINES!');
                            found = true;
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            // ignore JSON parse error on bad lines
        }
        if (found) break;
    }
}
if (!found) console.log('Could not find it');
