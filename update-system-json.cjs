const fs = require('fs');
const path = require('path');

module.exports = async function updateSystemJson(_, context = {}) {
    const {nextRelease, logger = console} = context;

    logger.log('🧪 [update-system-json] Plugin lancé avec succès');
    logger.log('🔢 Version à publier :', nextRelease?.version ?? 'inconnue');

    const dryRun = process.env.SEMANTIC_RELEASE_DRY === 'true';
    const filePath = path.join(__dirname, 'src', 'system.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const newVersion = `${nextRelease.version}`;
    const newDownload = `https://github.com/herveDarritchon/foundryvtt-swerpg/-/archive/v${nextRelease.version}/foundryvtt-tor2e-v${nextRelease.version}.zip`;

    logger.log('📝 Mise à jour prévue :');
    logger.log(`→ version : ${newVersion}`);
    logger.log(`→ download    : ${newDownload}`);

    if (!dryRun) {
        json.version = newVersion;
        json.download = newDownload;
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
        logger.log('✅ Fichier system.json mis à jour');
    } else {
        logger.log('🛑 Mode dry-run actif : aucune écriture faite');
    }
};
