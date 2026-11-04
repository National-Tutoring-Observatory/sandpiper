import { isValidObjectId } from "mongoose";
import type { ControllerContext } from "../../api/api.types";

export default function getActiveTokenMatch(
  tokenId: string,
  context: ControllerContext,
) {
  const { activeTeam, user } = context;
  if (!user || !activeTeam) {
    throw { statusCode: 400, message: "No active team" };
  }
  if (!isValidObjectId(tokenId)) {
    throw { statusCode: 404, message: "Token not found" };
  }
  return {
    user,
    match: { _id: tokenId, ref: activeTeam, refType: "team", isDeleted: false },
  };
}
