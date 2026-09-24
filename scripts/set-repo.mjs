// One-time helper after you create your GitHub repo:
//   npm run set-repo -- your-github-username [repo-name]
// Replaces the YOUR-USERNAME placeholders in docs, config and package.json.
import fs from 'node:fs'

const [user, repo = 'focusgateway'] = process.argv.slice(2)
if (!user || !/^[A-Za-z0-9-]+$/.test(user)) {
  console.error('Usage: npm run set-repo -- <github-username> [repo-name]')
  process.exit(1)
}
const files = [
  'package.json',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.github/CODEOWNERS',
  '.github/ISSUE_TEMPLATE/config.yml',
  'apps/web/src/config.js',
]
for (const f of files) {
  if (!fs.existsSync(f)) continue
  const before = fs.readFileSync(f, 'utf8')
  const after = before.replaceAll('YOUR-USERNAME', user).replaceAll('/focusgateway', `/${repo}`)
  if (after !== before) {
    fs.writeFileSync(f, after)
    console.log('updated', f)
  }
}
