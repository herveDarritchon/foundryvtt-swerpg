export default {
    branches: ['main'],
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        [
            '@semantic-release/changelog',
            {
                changelogFile: 'CHANGELOG.md'
            }
        ],
        [
            '@semantic-release/git',
            {
                assets: [
                    'CHANGELOG.md',
                    'package.json',
                    'pnpm-lock.yaml',
                    'system.json'
                ],
                message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
            }
        ],
        [
            '@semantic-release/exec',
            {
                prepareCmd: 'echo RELEASE_VERSION=${nextRelease.version} >> $GITHUB_ENV && echo PREV_RELEASE_VERSION=${lastRelease.version} >> $GITHUB_ENV'
            }
        ],
        [
            '@semantic-release/github',
            {
                assets: [
                    {path: 'system.json', label: 'System Manifest'},
                    {path: 'system.zip', label: 'System Archive'}
                ]
            }
        ]
    ]
};
