export const fixtureRepository = 'https://github.com/test-fixture/silent-routing';
export const fixtureCommit = 'a'.repeat(40);
export const fixtureQuote = "The fixture registers GET /, sends Hello World and listens on port 3000.";
const fixtureReadme = Buffer.from('# TEST ONLY silent routing fixture\n' + fixtureQuote + '\n');

export function installFixtureGitHubFetch(mode: 'capture' | 'offline') {
  const base = 'https://api.github.com/repos/test-fixture/silent-routing';
  const responses = new Map<string, unknown>([
    [base, {full_name: 'test-fixture/silent-routing', name: 'silent-routing', default_branch: 'main', license: null}],
    [base + '/commits/HEAD', {sha: fixtureCommit}],
    [base + '/readme?ref=' + fixtureCommit, {type: 'file', path: 'README.md', encoding: 'base64',
      size: fixtureReadme.length, content: fixtureReadme.toString('base64')}],
  ]);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (mode !== 'capture' || init?.method !== 'GET' || !responses.has(url)) {
      throw new Error('TEST ONLY: unexpected fetch; real network is disabled for this CLI fixture.');
    }
    return Response.json(responses.get(url));
  };
}

if (process.env.GVE_TEST_FIXTURE_GITHUB === 'capture' || process.env.GVE_TEST_FIXTURE_GITHUB === 'offline') {
  installFixtureGitHubFetch(process.env.GVE_TEST_FIXTURE_GITHUB);
}
