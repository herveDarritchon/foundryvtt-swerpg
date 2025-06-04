import semanticRelease from 'semantic-release';

const result = await semanticRelease({
    dryRun: true,
    branches: ['main'],
    repositoryUrl: 'https://github.com/herveDarritchon/foundryvtt-swerpg',
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
    ],
}, {
    cwd: process.cwd(),
    env: process.env,
    stdout: null, // 👈 désactive les logs parasites
    stderr: null,
});

if (result?.nextRelease?.version) {
    console.log(result.nextRelease.version); // 👈 seule sortie attendue
} else {
    console.log('NO_RELEASE');
}
