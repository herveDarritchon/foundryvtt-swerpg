const fs = require('fs');
const path = require('path');

const changelogPath = path.join(__dirname, 'CHANGELOG.md');
const repo = 'herveDarritchon/foundryvtt-swerpg';

const oldVersion = process.env.PREV_RELEASE_VERSION?.replace(/^v/, '');
const newVersion = process.env.RELEASE_VERSION?.replace(/^v/, '');

if (!oldVersion || !newVersion) {
    console.warn('❗ Versions manquantes : PREV_RELEASE_VERSION ou RELEASE_VERSION non définies');
    process.exit(0);
}

const diffLink = `https://github.com/${repo}/compare/v${oldVersion}...v${newVersion}`;
const linkLine = `\n🔗 [Voir les changements entre v${oldVersion} et v${newVersion}](${diffLink})\n`;

let changelog = fs.readFileSync(changelogPath, 'utf8');

// Supporte :
// ## [0.1.1](...) (...)
// ## [0.1.1] (...)
// ## 0.1.1 (...)
const regex = new RegExp(`^##\\s+(\\[)?${newVersion}(\\])?.*`, 'm');

if (!regex.test(changelog)) {
    console.error(`❌ Impossible de trouver l'entrée pour la version "${newVersion}" dans le CHANGELOG.md`);
    process.exit(1);
}

changelog = changelog.replace(regex, match => `${match}${linkLine}`);
fs.writeFileSync(changelogPath, changelog);
console.log(`✅ Lien de diff ajouté au CHANGELOG.md`);
