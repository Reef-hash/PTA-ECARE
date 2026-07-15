const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Afiah/OneDrive - Institut Kemahiran MARA Besut/PROJECT ECARE/E-care/frontend/src/pages';

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = getFiles(dir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    if (content.includes("t('table.")) {
        content = content.replace(/t\('table\.pending'\)/g, "t('admin_users.status_pending')");
        content = content.replace(/t\('table\.in_process'\)/g, "t('admin_users.status_in_process')");
        content = content.replace(/t\('table\.incomplete'\)/g, "t('admin_users.status_incomplete')");
        content = content.replace(/t\('table\.bawa_pulang'\)/g, "t('admin_users.status_bawa_pulang')");
        content = content.replace(/t\('table\.closed'\)/g, "t('admin_users.status_closed')");
        content = content.replace(/t\('table\.assigned'\)/g, "t('admin_users.status_assigned')");
        content = content.replace(/t\('table\.status'\)/g, "t('common_actions.status')");
        content = content.replace(/t\('table\.action'\)/g, "t('common_actions.action')");
        content = content.replace(/t\('table\.name'\)/g, "t('common.name')");
        content = content.replace(/t\('table\.department'\)/g, "t('common.department')");
        content = content.replace(/t\('table\.report_number'\)/g, "t('admin_users.report_no')");
        content = content.replace(/t\('table\.date'\)/g, "t('common_actions.date')");
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', path.basename(file));
    }
});
