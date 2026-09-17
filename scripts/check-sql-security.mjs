import fs from 'node:fs';

const files = process.argv.slice(2).filter(Boolean);
let failed = false;

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  const sql = fs.readFileSync(file, 'utf8');
  if (!/\bsecurity\s+definer\b/i.test(sql)) continue;

  const problems = [];

  if (!/\bset\s+search_path\b/i.test(sql)) {
    problems.push('SECURITY DEFINER sem SET search_path explícito');
  }

  if (!/\brevoke\b[\s\S]*\banon\b/i.test(sql)) {
    problems.push('migration não revoga/trata explicitamente o role anon');
  }

  if (!/\brevoke\b[\s\S]*\bauthenticated\b/i.test(sql)) {
    problems.push('migration não revoga/trata explicitamente o role authenticated');
  }

  if (problems.length > 0) {
    failed = true;
    console.error(`\n${file}`);
    for (const problem of problems) console.error(`  - ${problem}`);
  } else {
    console.log(`OK: ${file}`);
  }
}

if (failed) {
  console.error('\nFalha: migrations novas/alteradas com SECURITY DEFINER precisam fixar search_path e tratar grants de anon/authenticated explicitamente.');
  process.exit(1);
}
