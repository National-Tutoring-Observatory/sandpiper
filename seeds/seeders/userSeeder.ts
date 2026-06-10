import { UserService } from "../../app/modules/users/user.js";

// Use SUPER_ADMIN_GITHUB_ID from env if available, otherwise use test ID
const superAdminGithubId = process.env.SUPER_ADMIN_GITHUB_ID
  ? parseInt(process.env.SUPER_ADMIN_GITHUB_ID)
  : 100001;

const SEED_USERS = [
  {
    username: "testadmin",
    name: "Test Admin",
    role: "SUPER_ADMIN",
    githubId: superAdminGithubId,
    hasGithubSSO: true,
    isRegistered: true,
    onboardingComplete: true,
    institution: "Seed University",
    userRole: "Researcher",
    useCases: ["Educational research"],
    scholarshipInterest: false,
    featureFlags: ["HAS_PROMPT_LIBRARY"],
    teams: [],
    registeredAt: new Date(),
  },
  {
    username: "testuser1",
    name: "Test User 1",
    role: "USER",
    githubId: 100002,
    hasGithubSSO: true,
    isRegistered: true,
    featureFlags: ["HAS_PROMPT_LIBRARY"],
    teams: [],
    registeredAt: new Date(),
  },
  {
    username: "testuser2",
    name: "Test User 2",
    role: "USER",
    githubId: 100003,
    hasGithubSSO: true,
    isRegistered: true,
    featureFlags: ["HAS_PROMPT_LIBRARY"],
    teams: [],
    registeredAt: new Date(),
  },
];

export async function seedUsers() {
  for (const userData of SEED_USERS) {
    try {
      // Check if user already exists
      const existing = await UserService.find({
        match: { githubId: userData.githubId },
      });

      if (existing.length > 0) {
        console.log(
          `  ⏭️  User '${userData.username}' already exists, skipping...`,
        );
        continue;
      }

      const result = await UserService.create(userData);

      console.log(`  ✓ Created user: ${userData.username} (ID: ${result._id})`);
    } catch (error) {
      console.error(`  ✗ Error creating user ${userData.username}:`, error);
      throw error;
    }
  }
}

export async function getSeededUsers() {
  const result = await UserService.find({
    match: { username: { $in: SEED_USERS.map((u) => u.username) } },
  });
  return result;
}
