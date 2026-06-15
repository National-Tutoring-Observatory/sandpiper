import dayjs from "dayjs";
import find from "lodash/find";
import { redirect } from "react-router";
import { GitHubStrategy } from "remix-auth-github";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import INVITE_LINK_TTL_DAYS from "~/modules/teams/helpers/inviteLink";
import { UserService } from "~/modules/users/user";
import type { UserTeam } from "~/modules/users/users.types";
import sessionStorage from "../../../../sessionStorage";
import setupNewUser from "../services/setupNewUser.server";
import extractPrimaryEmail from "./extractPrimaryEmail";

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

    const session = await sessionStorage.getSession(
      request.headers.get("cookie"),
    );

    const teamInviteId = session.get("teamInviteId");
    if (teamInviteId) {
      const handleTeamInviteSignup = (
        await import("./handleTeamInviteSignup.server")
      ).default;
      return handleTeamInviteSignup({
        teamInviteId,
        githubUser,
        emails,
        request,
      });
    }

    const inviteId = session.get("inviteId");

    const isInvitedUser = !!inviteId;

    const users = await UserService.find({
      match: { githubId: githubUser.id, hasGithubSSO: true },
    });
    let user = users.length > 0 ? users[0] : null;

    const update: Record<string, unknown> = {};

    if (!user) {
      // if no user but is invite, update the invitedUser
      if (isInvitedUser) {
        const invitedUsers = await UserService.find({ match: { inviteId } });
        user = invitedUsers.length > 0 ? invitedUsers[0] : null;

        if (user) {
          if (
            dayjs().isAfter(
              dayjs(user.invitedAt).add(INVITE_LINK_TTL_DAYS, "day"),
            )
          ) {
            throw redirect("/signup?error=EXPIRED_INVITE");
          }
          update.inviteId = null;
          update.isRegistered = true;
          update.registeredAt = new Date();
          update.githubId = githubUser.id;
          update.hasGithubSSO = true;
          await setupNewUser(
            user._id,
            `${githubUser.name || githubUser.login}'s Workspace`,
          );
          trackServerEvent({ name: "user_registered", userId: user._id });
        } else {
          throw redirect("/signup?error=UNREGISTERED");
        }
      } else {
        // Direct signup — no invite required
        const primaryEmail = extractPrimaryEmail(emails);
        if (!primaryEmail) throw redirect("/signup?error=NO_EMAIL");
        const newUser = await UserService.create({
          username: githubUser.login,
          name: githubUser.name || githubUser.login,
          email: primaryEmail,
          githubId: githubUser.id,
          hasGithubSSO: true,
          isRegistered: true,
          registeredAt: new Date(),
          role: "USER",
          onboardingComplete: false,
        });
        await setupNewUser(
          newUser._id,
          `${githubUser.name || githubUser.login}'s Workspace`,
        );
        trackServerEvent({ name: "user_registered", userId: newUser._id });
        return (await UserService.findById(newUser._id))!;
      }
    } else if (isInvitedUser) {
      // If user already exists, check teams and add if that team does not exist on the user.
      const invitedUsers = await UserService.find({ match: { inviteId } });
      const invitedUser = invitedUsers.length > 0 ? invitedUsers[0] : null;

      if (!invitedUser) throw redirect("/signup?error=UNREGISTERED");

      if (
        dayjs().isAfter(
          dayjs(invitedUser.invitedAt).add(INVITE_LINK_TTL_DAYS, "day"),
        )
      ) {
        throw redirect("/signup?error=EXPIRED_INVITE");
      }

      const invitedUserTeam = invitedUser.teams[0] as UserTeam;
      const currentUserTeams = user.teams;
      const isPartOfInvitedTeam = find(currentUserTeams, {
        team: invitedUserTeam.team,
      });
      if (!isPartOfInvitedTeam) {
        currentUserTeams.push(invitedUserTeam);
        update.teams = currentUserTeams;
      }
      // Remove old invited user.
      await UserService.deleteById(invitedUser._id);
    }

    update.username = githubUser.login;
    update.name = githubUser.name || githubUser.login;

    // Only update the email when GitHub returned a usable one, so a failed
    // /user/emails response never overwrites an existing valid email with "".
    const primaryEmail = extractPrimaryEmail(emails);
    if (primaryEmail) update.email = primaryEmail;

    user = await UserService.updateById(user._id, update);

    return user;
  },
);

export default githubStrategy;
