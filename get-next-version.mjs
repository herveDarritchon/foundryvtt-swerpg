import semanticRelease from 'semantic-release';

const result = await semanticRelease({
    dryRun: true,
    debug: true,
    branches: ['main'],
    repositoryUrl: 'https://github.com/herveDarritchon/foundryvtt-swerpg',
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
    ]
}, {
    cwd: process.cwd(),
    env: process.env,
});

if (result?.nextRelease?.version) {
    console.log(result.nextRelease.version);
} else {
    console.log('NO_RELEASE');
}
