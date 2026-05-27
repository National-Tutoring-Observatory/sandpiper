import "dotenv/config";
import mongoose from "mongoose";

const {
  DOCUMENT_DB_CONNECTION_STRING,
  DOCUMENT_DB_USERNAME,
  DOCUMENT_DB_PASSWORD,
} = process.env;
const connectionString = `mongodb://${encodeURIComponent(DOCUMENT_DB_USERNAME)}:${encodeURIComponent(DOCUMENT_DB_PASSWORD)}@${DOCUMENT_DB_CONNECTION_STRING}`;

await mongoose.connect(connectionString, { connectTimeoutMS: 10000 });
const db = mongoose.connection.db;

const balances = await db.collection("teambillingbalances").find({}).toArray();

const teams = {};
for (const b of balances) {
  teams[b.team.toString()] = {
    availableBalance: b.availableBalance,
    totalCredits: b.totalCredits,
    totalBilledCosts: b.totalBilledCosts,
    totalRawCosts: b.totalRawCosts,
  };
}

const ledgerTotals = await db
  .collection("billingledgerentries")
  .aggregate([
    {
      $group: {
        _id: { team: "$team", direction: "$direction" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.team": 1, "_id.direction": 1 } },
  ])
  .toArray();

const ledger = {};
for (const row of ledgerTotals) {
  const key = row._id.team.toString();
  if (!ledger[key]) ledger[key] = {};
  ledger[key][row._id.direction] = { total: row.total, count: row.count };
}
for (const dirs of Object.values(ledger)) {
  dirs.net = (dirs.credit?.total ?? 0) - (dirs.debit?.total ?? 0);
}

const legacy = {
  llmcosts: await db.collection("llmcosts").countDocuments({ isLegacy: true }),
  teamcredits: await db
    .collection("teamcredits")
    .countDocuments({ isLegacy: true }),
  ledgerEntries: await db
    .collection("billingledgerentries")
    .countDocuments({ isLegacy: true }),
  carryForwards: await db
    .collection("billingledgerentries")
    .countDocuments({ idempotencyKey: { $regex: /^legacy-balance:/ } }),
};

console.log(JSON.stringify({ teams, ledger, legacy }, null, 2));

await mongoose.disconnect();
