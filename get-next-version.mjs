import semanticRelease from 'semantic-release';

const result = await semanticRelease({
    dryRun: true,
    debug: false,
    branches: ['main'],
    repositoryUrl: 'https://github.com/herveDarritchon/foundryvtt-swerpg',
}, {
    cwd: process.cwd(),
    env: process.env,
});

if (result?.nextRelease?.version) {
    console.log(result.nextRelease.version);
} else {
    console.log('NO_RELEASE');
}
