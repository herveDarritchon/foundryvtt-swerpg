const fs = require('fs');
const path = require('path');

module.exports = async function updateSystemJson(_, context = {}) {
    const { nextRelease, logger = console } = context;

    logger.log('🧪 [update-system-json] Plugin lancé avec succès');
    logger.log('🔢 Version à publier :', nextRelease?.version ?? 'inconnue');

    const dryRun = process.env.SEMANTIC_RELEASE_DRY === 'true';
    const filePath = path.join(__dirname, 'system.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const version = nextRelease.version;
    const repo = 'herveDarritchon/foundryvtt-swerpg';
    const baseURL = `https://github.com/${repo}/releases/download/v${version}`;

    json.version = version;
    json.download = `${baseURL}/system.zip`;
    json.manifest = `${baseURL}/system.json`;

    logger.log('📝 Mise à jour prévue :');
    logger.log(`→ version : ${json.version}`);
    logger.log(`→ download : ${json.download}`);
    logger.log(`→ manifest : ${json.manifest}`);

    if (!dryRun) {
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
        logger.log('✅ Fichier system.json mis à jour');
    } else {
        logger.log('🛑 Mode dry-run actif : aucune écriture faite');
    }
};
