#!/usr/bin/env node
/**
 * Seeds Script
 *
 * This script seeds the database with test data including:
 * - Users
 * - Teams
 * - Projects
 * - Files (with actual file uploads to storage)
 * - Billing plans
 *
 * Usage:
 *   yarn seeds                    # Run all seeds
 *   yarn seeds --users            # Seed only users
 *   yarn seeds --teams            # Seed only teams
 *   yarn seeds --prompts          # Seed only prompts
 *   yarn seeds --prompt-library   # Publish seeded prompts to the library
 *   yarn seeds --projects         # Seed only projects
 *   yarn seeds --billing          # Seed only billing plans
 *   yarn seeds --clean            # Clean all seeded data before seeding
 */

import { initializeDatabase } from "../app/lib/database";
import "../app/modules/storage/storage";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.length === 0,
  users: args.includes("--users"),
  teams: args.includes("--teams"),
  prompts: args.includes("--prompts"),
  promptLibrary: args.includes("--prompt-library"),
  projects: args.includes("--projects"),
  billing: args.includes("--billing"),
  dataset: args.includes("--dataset"),
  clean: args.includes("--clean"),
};

async function main() {
  if (process.env.NODE_ENV != "development") {
    throw new Error("Seeds can only be run in development environment.");
  }
  console.log("🌱 Starting seeds...\n");

  await initializeDatabase();

  try {
    if (options.clean) {
      console.log("🧹 Cleaning existing data...");
      const { cleanAll } = await import("./seeders/cleaner.js");
      await cleanAll();
      console.log("✅ Data cleaned\n");
    }

    if (options.all || options.users) {
      console.log("👤 Seeding users...");
      const { seedUsers } = await import("./seeders/userSeeder.js");
      await seedUsers();
      console.log("✅ Users seeded\n");
    }

    if (options.all || options.billing) {
      console.log("💰 Seeding billing plans...");
      const { seedBillingPlans } =
        await import("./seeders/billingPlanSeeder.js");
      await seedBillingPlans();
      console.log("✅ Billing plans seeded\n");
    }

    if (options.all || options.teams) {
      console.log("👥 Seeding teams...");
      const { seedTeams } = await import("./seeders/teamSeeder.js");
      await seedTeams();
      console.log("✅ Teams seeded\n");
    }

    if (options.all || options.prompts) {
      console.log("💬 Seeding prompts...");
      const { seedPrompts } = await import("./seeders/promptSeeder.js");
      await seedPrompts();
      console.log("✅ Prompts seeded\n");
    }

    if (options.all || options.promptLibrary) {
      console.log("📚 Publishing prompts to the library...");
      const { seedPromptLibrary } =
        await import("./seeders/promptLibrarySeeder.js");
      await seedPromptLibrary();
      console.log("✅ Prompt library seeded\n");
    }

    if (options.all || options.projects) {
      console.log("📁 Seeding projects...");
      const { seedProjects } = await import("./seeders/projectSeeder.js");
      await seedProjects();
      console.log("✅ Projects seeded\n");
    }

    if (options.all || options.dataset) {
      console.log("🗂️  Seeding MTM dataset...");
      const { seedDataset } = await import("./seeders/datasetSeeder.js");
      await seedDataset();
      console.log("✅ MTM dataset seeded\n");
    }

    console.log("🎉 Seeds completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running seeds:", error);
    process.exit(1);
  }
}

main();
