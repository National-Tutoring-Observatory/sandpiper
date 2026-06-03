import { test as setup } from "@playwright/test";
import dotenv from "dotenv";
import mongoose from "mongoose";
import sessionStorage from "../sessionStorage";

dotenv.config({ path: "../.env" });

const authFile = ".auth/user.json";
const ACTIVE_TEAM_NAME = "Research Team Alpha";

async function findFixtures(): Promise<{
  userId: string;
  activeTeamId: string;
}> {
  const githubId = parseInt(process.env.SUPER_ADMIN_GITHUB_ID as string);
  if (!githubId) {
    throw new Error("SUPER_ADMIN_GITHUB_ID environment variable is required.");
  }

  const {
    DOCUMENT_DB_CONNECTION_STRING,
    DOCUMENT_DB_USERNAME,
    DOCUMENT_DB_PASSWORD,
  } = process.env;
  if (
    !DOCUMENT_DB_CONNECTION_STRING ||
    !DOCUMENT_DB_USERNAME ||
    !DOCUMENT_DB_PASSWORD
  ) {
    throw new Error("Database connection environment variables are required.");
  }

  const connectionString = `mongodb://${encodeURIComponent(DOCUMENT_DB_USERNAME)}:${encodeURIComponent(DOCUMENT_DB_PASSWORD)}@${DOCUMENT_DB_CONNECTION_STRING}`;
  await mongoose.connect(connectionString, { connectTimeoutMS: 10000 });

  const usersCollection = mongoose.connection.collection("users");
  const user = await usersCollection.findOne({ githubId });
  if (!user) {
    await mongoose.disconnect();
    throw new Error(`No user found with githubId ${githubId}`);
  }

  // The app routes users without completed onboarding to /onboarding before
  // they can reach any sidebar nav. Mark the seed user onboarded so tests
  // land on the real workspace.
  if (!user.onboardingComplete || !user.termsAcceptedAt) {
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          onboardingComplete: true,
          termsAcceptedAt: user.termsAcceptedAt ?? new Date(),
        },
      },
    );
  }

  const team = await mongoose.connection
    .collection("teams")
    .findOne({ name: ACTIVE_TEAM_NAME });
  await mongoose.disconnect();
  if (!team) {
    throw new Error(`No team found with name '${ACTIVE_TEAM_NAME}'`);
  }

  return { userId: user._id.toString(), activeTeamId: team._id.toString() };
}

setup("authenticate", async ({ page }) => {
  const { userId, activeTeamId } = await findFixtures();

  const session = await sessionStorage.getSession();
  session.set("user", { _id: userId });

  const setCookie = await sessionStorage.commitSession(session);
  const cookieValue = setCookie.split(";")[0].split("=").slice(1).join("=");

  await page.context().addCookies([
    {
      name: "__session",
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // useActiveTeam reads sandpiper.activeTeamId from localStorage before
  // falling back to the personal team. Seed it so tests land on the
  // seeded "Research Team Alpha" instead of the admin's personal workspace.
  await page.goto("/");
  await page.evaluate(
    ({ id }) => window.localStorage.setItem("sandpiper.activeTeamId", id),
    { id: activeTeamId },
  );

  await page.context().storageState({ path: authFile });
});
