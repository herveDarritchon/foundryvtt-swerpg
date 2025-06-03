const fs = require('fs');
const path = require('path');

module.exports = async function (_, context = {}) {
    const { nextRelease, logger = console } = context;
    const dryRun = process.env.SEMANTIC_RELEASE_DRY === 'true';

    const version = nextRelease?.version;
    const repo = 'herveDarritchon/foundryvtt-swerpg';
    const baseURL = `https://github.com/${repo}/releases/download/v${version}`;

    const templatePath = path.join(__dirname, 'system.template.json');
    const outputPath = path.join(__dirname, 'system.json');
    const template = fs.readFileSync(templatePath, 'utf8');

    const updated = template
        .replace(/#{VERSION}#/g, version)
        .replace(/#{MANIFEST}#/g, `${baseURL}/system.json`)
        .replace(/#{DOWNLOAD}#/g, `${baseURL}/system.zip`);

    logger.log(`📝 Mise à jour de system.json pour la release ${version}`);
    logger.log(`→ manifest : ${baseURL}/system.json`);
    logger.log(`→ download : ${baseURL}/system.zip`);

    if (!dryRun) {
        fs.writeFileSync(outputPath, updated, 'utf8');
        logger.log('✅ Fichier system.json généré avec succès');
    } else {
        logger.log('🛑 Dry run : aucune écriture réalisée');
    }
};
