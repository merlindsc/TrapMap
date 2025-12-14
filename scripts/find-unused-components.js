const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentsDir = path.join(root, 'frontend', 'src', 'components');

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  });
  return results;
}

function readAllFiles(base) {
  const exts = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html'];
  const files = [];
  function recurse(d) {
    const list = fs.readdirSync(d);
    list.forEach(f => {
      const full = path.join(d, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) return recurse(full);
      if (exts.includes(path.extname(full).toLowerCase())) files.push(full);
    })
  }
  recurse(base);
  return files;
}

if (!fs.existsSync(componentsDir)) {
  console.error('Components directory not found:', componentsDir);
  process.exit(1);
}

const compFiles = walk(componentsDir).filter(p => !p.includes('node_modules'));
const repoFiles = readAllFiles(root);

const report = [];

for (const f of compFiles) {
  const ext = path.extname(f);
  const base = path.basename(f, ext);
  const content = fs.readFileSync(f, 'utf8');

  // Count occurrences of the base name across repo files
  let total = 0;
  for (const rf of repoFiles) {
    try {
      const txt = fs.readFileSync(rf, 'utf8');
      const idx = txt.indexOf(base);
      if (idx !== -1) {
        total += (txt.match(new RegExp(base, 'g')) || []).length;
      }
    } catch (e) { }
  }

  // Subtract occurrences within the file itself (we expect at least export/default etc)
  const selfCount = (content.match(new RegExp(base, 'g')) || []).length;
  const external = total - selfCount;

  report.push({ file: path.relative(root, f), base, total, selfCount, external });
}

// Sort candidates by external ascending
report.sort((a,b) => a.external - b.external || a.file.localeCompare(b.file));

console.log('Possible unused component files (external references = 0)');
console.log('----------------------------------------------------------------');
report.filter(r => r.external === 0).forEach(r => {
  console.log(`${r.file}  (occurrences total:${r.total} self:${r.selfCount} external:${r.external})`);
});

console.log('\nFull report (top 50):');
console.log('----------------------------------------------------------------');
report.slice(0, 50).forEach(r => {
  console.log(`${r.file} => external:${r.external} total:${r.total} self:${r.selfCount}`);
});
