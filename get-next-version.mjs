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
}, {
    cwd: process.cwd(),
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
});

if (result?.nextRelease?.version) {
    console.log(result.nextRelease.version); // 👈 SEULEMENT la version
    process.exit(0);
} else {
    console.log('NO_RELEASE');
    process.exit(0);
}
