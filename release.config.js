module.exports = {
  repositoryUrl: 'https://github.com/teclone/r-server.git',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/github',
      {
        githubUrl: 'https://github.com',
      },
    ],
    '@semantic-release/npm',
  ],
  dryRun: true,
  ci: true,
};