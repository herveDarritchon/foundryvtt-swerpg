import semanticRelease from 'semantic-release';

const result = await semanticRelease({
    dryRun: true,
    branches: ['main'],
    repositoryUrl: 'https://github.com/herveDarritchon/foundryvtt-swerpg',
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
    ]
});

if (result?.nextRelease?.version) {
    console.log(result.nextRelease.version); // seule sortie
} else {
    console.log('NO_RELEASE'); // seule sortie
}