import { readFileSync, writeFileSync } from 'node:fs';

function replaceExact(path, from, to) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Expected text not found in ${path}: ${from}`);
  writeFileSync(path, source.replace(from, to));
}

replaceExact(
  'src/pages/therapist/DiaryDetail.tsx',
  '                  <option value="scale">Escala (1 a 10)</option>\n                  <option value="emotion">Emoções</option>',
  '                  <option value="scale">Escala (1 a 10)</option>',
);

replaceExact(
  'src/pages/therapist/SMIResponseDetail.tsx',
  "        submitted_at: assessmentRow.submitted_at ?? '',",
  '        submitted_at: assessmentRow.submitted_at as string,',
);

console.log('PR84 zero-runtime cleanup applied.');
