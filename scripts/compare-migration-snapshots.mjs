import { readFileSync } from "fs";

const [beforeFile = "before.json", afterFile = "after.json"] =
  process.argv.slice(2);

const before = JSON.parse(readFileSync(beforeFile, "utf8"));
const after = JSON.parse(readFileSync(afterFile, "utf8"));

const allTeams = new Set([
  ...Object.keys(before.teams),
  ...Object.keys(after.teams),
]);

const EPSILON = 1e-6;
let allOk = true;

const rows = [];
for (const teamId of [...allTeams].sort()) {
  const b = before.teams[teamId];
  const a = after.teams[teamId];

  if (!b) {
    rows.push({ teamId, status: "MISSING_BEFORE", diff: null, b: null, a });
    allOk = false;
    continue;
  }
  if (!a) {
    rows.push({ teamId, status: "MISSING_AFTER", diff: null, b, a: null });
    allOk = false;
    continue;
  }

  const diff = Math.abs((a.availableBalance ?? 0) - (b.availableBalance ?? 0));
  const ok = diff < EPSILON;
  if (!ok) allOk = false;
  rows.push({ teamId, status: ok ? "OK" : "MISMATCH", diff, b, a });
}

const mismatches = rows.filter((r) => r.status !== "OK");
console.log(`\nTotal teams: ${allTeams.size}`);
console.log(`Mismatches:  ${mismatches.length}`);
console.log(
  `\n${"Team".padEnd(26)} ${"Before balance".padStart(20)} ${"After balance".padStart(20)} ${"Diff".padStart(14)}  Status`,
);
console.log("-".repeat(90));

for (const r of rows) {
  const bBal = r.b?.availableBalance ?? "-";
  const aBal = r.a?.availableBalance ?? "-";
  const diff = r.diff != null ? r.diff.toExponential(2) : "-";
  const flag = r.status !== "OK" ? " <<<" : "";
  console.log(
    `${r.teamId.padEnd(26)} ${String(bBal).padStart(20)} ${String(aBal).padStart(20)} ${diff.padStart(14)}  ${r.status}${flag}`,
  );
}

if (allOk) {
  console.log("\n✓ All available balances preserved.");
} else {
  console.log(`\n✗ ${mismatches.length} mismatch(es) found.`);
}
