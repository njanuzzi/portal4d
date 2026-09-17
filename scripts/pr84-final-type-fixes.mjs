import { readFileSync, writeFileSync } from 'node:fs';

function replaceExact(path, from, to) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Expected text not found in ${path}: ${from}`);
  writeFileSync(path, source.replace(from, to));
}

function replaceAllExact(path, from, to) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Expected text not found in ${path}: ${from}`);
  writeFileSync(path, source.split(from).join(to));
}

const diarySelect = ".select('id, name, is_active, created_at')";
const fullDiarySelect = ".select('id, name, is_active, available_from, available_to, created_at')";

replaceAllExact('src/pages/therapist/ClientDetail.tsx', diarySelect, fullDiarySelect);
replaceExact('src/pages/therapist/Clients.tsx', diarySelect, fullDiarySelect);
replaceExact('src/pages/therapist/DiaryDetail.tsx', diarySelect, fullDiarySelect);

replaceExact(
  'src/pages/therapist/Clients.tsx',
  '      p_whatsapp:  editWhatsapp || null,\n      p_address:   editAddress || null,',
  '      p_whatsapp:  editWhatsapp || undefined,\n      p_address:   editAddress || undefined,',
);

replaceExact(
  'src/pages/client/DiaryPage.tsx',
  '        const loadedQuestions = qs || [];',
  '        const loadedQuestions = (qs || []) as DiaryQuestion[];',
);

replaceExact(
  'src/pages/therapist/DiaryDetail.tsx',
  '    setQuestions(qs ?? []);',
  '    setQuestions((qs ?? []) as DiaryQuestion[]);',
);
replaceExact(
  'src/pages/therapist/DiaryDetail.tsx',
  '      setQuestions((prev) => [...prev, newQ]);',
  '      setQuestions((prev) => [...prev, newQ as DiaryQuestion]);',
);

console.log('PR84 final focused type fixes applied.');
