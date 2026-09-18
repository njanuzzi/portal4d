import fs from "node:fs";

const checks = [
  {
    label: "therapist admin functions",
    files: [
      "generate-client-report",
      "generate-technical-report",
      "revise-client-report",
      "revise-session-report",
      "revise-technical-report",
      "smi-generate-client-report",
      "smi-generate-technical-report",
      "whatsapp-send-invite",
      "generate-monthly-report",
      "send-report-observation",
      "sync-notion-sessions",
      "extract-roteiro",
      "review-roteiro",
    ],
    requireAny: [
      [
        "supabase.auth.getUser",
        'role === "therapist"',
        "role='therapist'",
        "role = 'therapist'",
        'profile?.role === "therapist"',
        'role !== "therapist"',
      ],
    ],
  },
  {
    label: "internal privileged callers",
    files: [
      "generate-bot-context",
      "send-push-notifications",
      "send-diary-reminder-emails",
      "send-diary-fill-reminder-emails",
    ],
    requireAll: ["verify_internal_edge_token", "X-Portal-Internal-Token"],
  },
  {
    label: "manychat register dual auth",
    files: ["manychat-register-subscriber"],
    requireAll: ["verify_internal_edge_token", "supabase.auth.getUser", 'profile?.role === "therapist"'],
  },
  {
    label: "public assessment capability start",
    files: [
      "schema-assessment-start",
      "smi-assessment-start",
      "bfi-assessment-start",
      "marq-assessment-start",
      "rbs-assessment-start",
      "ecr-assessment-start",
      "ensra-assessment-start",
      "etas-assessment-start",
    ],
    requireAll: ["issue_assessment_edit_token", "resume_token", "verify_assessment_edit_token"],
  },
  {
    label: "public assessment capability save",
    files: [
      "schema-assessment-save",
      "smi-assessment-save",
      "bfi-assessment-save",
      "marq-assessment-save",
      "rbs-assessment-save",
      "ecr-assessment-save",
      "ensra-assessment-save",
      "etas-assessment-save",
    ],
    requireAll: ["edit_token", "verify_assessment_edit_token"],
  },
  {
    label: "public signup abuse protection",
    files: ["client-self-signup"],
    requireAll: ["check_client_signup_rate_limit", "Retry-After", "deleteUser(created.user.id)"],
  },
  {
    label: "Cal.com Vault verification",
    files: ["cal-webhook"],
    requireAll: ["verify_cal_webhook_signature", "x-cal-signature-256"],
    forbid: [/const\s+CAL_WEBHOOK_SECRET\s*=\s*["']/],
  },
  {
    label: "risk notifier server-to-server auth",
    files: ["notify-therapist-risk"],
    requireAll: ["BOT_INTERNAL_SECRET"],
  },
  {
    label: "retired Tally tombstones",
    files: ["tally-schema-webhook", "tally-client-signup"],
    requireAll: ["integration_retired", "status: 410"],
  },
  {
    label: "retired test/runtime tombstones",
    files: ["import-esmeralda-test-sessions", "whatsapp-send-reminder"],
    requireAny: [["status: 410", "{ status: 410 }", "Gone"]],
  },
];

const failures = [];

function readFunction(slug) {
  const path = `supabase/functions/${slug}/index.ts`;
  if (!fs.existsSync(path)) {
    failures.push(`${slug}: missing ${path}`);
    return "";
  }
  return fs.readFileSync(path, "utf8");
}

for (const check of checks) {
  for (const slug of check.files) {
    const content = readFunction(slug);
    if (!content) continue;

    for (const needle of check.requireAll ?? []) {
      if (!content.includes(needle)) {
        failures.push(`${slug}: ${check.label} missing "${needle}"`);
      }
    }

    for (const alternatives of check.requireAny ?? []) {
      if (!alternatives.some((needle) => content.includes(needle))) {
        failures.push(`${slug}: ${check.label} missing one of: ${alternatives.join(", ")}`);
      }
    }

    for (const pattern of check.forbid ?? []) {
      if (pattern.test(content)) {
        failures.push(`${slug}: ${check.label} matched forbidden pattern ${pattern}`);
      }
    }
  }
}

if (failures.length) {
  console.error("Edge security regression guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Edge security regression guard passed (${checks.reduce((sum, c) => sum + c.files.length, 0)} checks).`);
