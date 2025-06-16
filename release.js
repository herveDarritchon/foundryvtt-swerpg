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
            '@semantic-release/exec',
            {
                // 👉 placé AVANT git
                prepareCmd: [
                    'echo RELEASE_VERSION=${nextRelease.version} >> $GITHUB_ENV',
                    'echo PREV_RELEASE_VERSION=${lastRelease.version} >> $GITHUB_ENV',
                    'node ./update-system-json.cjs',
                    'node ./append-links-to-changelog.cjs'
                ].join(' && ')
            }
        ],
        [
            '@semantic-release/git',
            {
                assets: [
                    'CHANGELOG.md',
                    'system.json',
                    'package.json',
                    'pnpm-lock.yaml'
                ],
                message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
            }
        ],
        [
            '@semantic-release/github',
            {
                assets: [
                    { path: 'system.json', label: 'System Manifest' },
                    { path: 'system.zip', label: 'System Archive' }
                ]
            }
        ]
    ]
};
