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

// Recherche plus flexible : ligne de titre avec la version
const versionHeaderRegex = new RegExp(`^#{1,6} ?v?${newVersion}\\b`, 'm');
const match = changelog.match(versionHeaderRegex);

if (!match) {
    console.error(`❌ Impossible de trouver l'entrée pour la version "${newVersion}" dans le CHANGELOG.md`);
    process.exit(1);
}

changelog = changelog.replace(versionHeaderRegex, match[0] + linkLine);
fs.writeFileSync(changelogPath, changelog);

console.log(`✅ Lien de diff ajouté entre v${oldVersion} et v${newVersion}`);
