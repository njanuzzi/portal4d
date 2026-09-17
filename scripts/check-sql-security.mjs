import fs from 'node:fs';

const files = process.argv.slice(2).filter(Boolean);
let failed = false;

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

function stripSingleQuotedStrings(sql) {
  return sql.replace(/'(?:''|[^'])*'/g, "''");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  const rawSql = fs.readFileSync(file, 'utf8');
  const sql = stripComments(rawSql);
  if (!/\bsecurity\s+definer\b/i.test(stripSingleQuotedStrings(sql))) continue;

  const problems = [];
  const securedFunctions = [];

  // Inspeciona os atributos da função entre a assinatura e o AS $tag$.
  // O objetivo não é ser um parser SQL completo; é falhar fechado para o padrão
  // de migrations usado no Portal4D e obrigar revisão quando o formato divergir.
  const functionRegex = /create\s+(?:or\s+replace\s+)?function\s+([a-zA-Z0-9_."]+)\s*\(([\s\S]*?)\)\s*([\s\S]*?)\bas\s+\$[a-zA-Z0-9_]*\$/gi;
  let match;

  while ((match = functionRegex.exec(sql)) !== null) {
    const qualifiedName = match[1].replace(/"/g, '');
    const functionName = qualifiedName.split('.').at(-1);
    const attributes = match[3];

    if (!/\bsecurity\s+definer\b/i.test(attributes)) continue;

    securedFunctions.push(functionName);

    if (!/\bset\s+search_path\b/i.test(attributes)) {
      problems.push(`${functionName}: SECURITY DEFINER sem SET search_path na própria definição`);
    }

    const escapedName = escapeRegex(functionName);
    const escapedQualifiedName = escapeRegex(qualifiedName);
    const revokeTarget = qualifiedName.includes('.')
      ? `(?:${escapedQualifiedName}|${escapedName})`
      : escapedName;
    const revokeRegex = new RegExp(
      `revoke\\s+(?:all|execute)\\s+on\\s+function\\s+${revokeTarget}\\s*\\([^;]*\\)\\s+from\\s+([^;]+);`,
      'ig',
    );

    let revokeMatch;
    let hasRequiredRevoke = false;
    while ((revokeMatch = revokeRegex.exec(sql)) !== null) {
      const roles = revokeMatch[1].toLowerCase();
      if (/\bpublic\b/.test(roles) && /\banon\b/.test(roles) && /\bauthenticated\b/.test(roles)) {
        hasRequiredRevoke = true;
        break;
      }
    }

    if (!hasRequiredRevoke) {
      problems.push(`${functionName}: falta REVOKE explícito de PUBLIC, anon e authenticated`);
    }
  }

  // Não conta ocorrências dentro de strings (por exemplo mensagens de RAISE),
  // apenas SECURITY DEFINER que fazem parte da estrutura SQL.
  const sqlForCounting = stripSingleQuotedStrings(sql);
  const securityDefinerCount = (sqlForCounting.match(/\bsecurity\s+definer\b/gi) ?? []).length;
  if (securedFunctions.length !== securityDefinerCount) {
    problems.push(
      `foram encontrados ${securityDefinerCount} SECURITY DEFINER, mas apenas ${securedFunctions.length} definições puderam ser validadas; revisar formato SQL`,
    );
  }

  if (problems.length > 0) {
    failed = true;
    console.error(`\n${file}`);
    for (const problem of problems) console.error(`  - ${problem}`);
  } else {
    console.log(`OK: ${file} (${securedFunctions.join(', ')})`);
  }
}

if (failed) {
  console.error(
    '\nFalha: cada SECURITY DEFINER nova/alterada precisa fixar search_path e revogar explicitamente EXECUTE de PUBLIC, anon e authenticated antes dos GRANTs necessários.',
  );
  process.exit(1);
}
