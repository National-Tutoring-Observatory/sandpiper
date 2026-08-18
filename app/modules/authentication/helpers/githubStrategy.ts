import { GitHubStrategy } from "remix-auth-github";
import resolveGithubUser from "./resolveGithubUser.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const githubStrategy = new GitHubStrategy<any>(
  {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectURI: `${process.env.AUTH_CALLBACK_URL}/github`,
    scopes: ["user:email"],
  },
  async ({ tokens, request }) => {
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokens.accessToken()}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokens.accessToken()}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const githubUser = await userResponse.json();

    const emails = await emailsResponse.json();

    return resolveGithubUser({ githubUser, emails, request });
  },
);

export default githubStrategy;
