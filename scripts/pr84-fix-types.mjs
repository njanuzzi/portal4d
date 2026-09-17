import { readFileSync, writeFileSync } from 'node:fs';

function replaceExact(path, from, to) {
  const source = readFileSync(path, 'utf8');
  if (!source.includes(from)) {
    throw new Error(`Expected text not found in ${path}: ${from.slice(0, 80)}`);
  }
  writeFileSync(path, source.replace(from, to));
}

replaceExact(
  'src/pages/client/DiaryHistory.tsx',
  "import { Card, CardBody } from '../../components/ui/Card';",
  "import { Card } from '../../components/ui/Card';",
);

replaceExact(
  'src/pages/client/DiaryPage.tsx',
  "import type { Diary, DiaryQuestion, DiaryEntry, DayNote } from '../../lib/database.types';",
  "import type { Diary, DiaryQuestion, DiaryEntry, DayNote, Json } from '../../lib/database.types';",
);
replaceExact(
  'src/pages/client/DiaryPage.tsx',
  'interface SelectedEmotion { label: string; intensity: number; }',
  'interface SelectedEmotion { label: string; intensity: number; [key: string]: Json | undefined; }',
);
replaceExact(
  'src/pages/client/DiaryPage.tsx',
  '      const latestGoal = goalRows?.[0] ?? null;',
  '      // The query explicitly filters confirmed_at IS NOT NULL; preserve that narrowing for TypeScript.\n      const latestGoal = (goalRows?.[0] as ClientGoal | undefined) ?? null;',
);

replaceExact(
  'src/pages/therapist/ClientDetail.tsx',
  '  const [waInviteSent, setWaInviteSent] = useState(false);',
  '  const [, setWaInviteSent] = useState(false);',
);

replaceExact(
  'src/pages/therapist/NewClient.tsx',
  '  is_active: boolean;\n  created_at: string;',
  '  is_active: boolean | null;\n  created_at: string | null;',
);

replaceExact(
  'src/pages/therapist/SMIResponseDetail.tsx',
  '        submitted_at: assessmentRow.submitted_at,',
  "        submitted_at: assessmentRow.submitted_at ?? '',",
);

console.log('PR84 focused type fixes applied.');
