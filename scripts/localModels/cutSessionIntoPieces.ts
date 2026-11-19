import type { Utterance } from "../../app/modules/sessions/sessions.types";

// A unit is one lead-role turn plus the turns before it. Utterances after the
// last lead-role turn join the last unit. A piece is N consecutive units.
export default (
  transcript: Utterance[],
  leadRole: string,
  unitsPerPiece: number,
): Utterance[][] => {
  const units: Utterance[][] = [];
  let pending: Utterance[] = [];
  for (const utterance of transcript) {
    pending.push(utterance);
    if (utterance.role === leadRole) {
      units.push(pending);
      pending = [];
    }
  }
  if (pending.length > 0) {
    if (units.length > 0) {
      units[units.length - 1].push(...pending);
    } else {
      units.push(pending);
    }
  }
  const pieces: Utterance[][] = [];
  for (let start = 0; start < units.length; start += unitsPerPiece) {
    pieces.push(units.slice(start, start + unitsPerPiece).flat());
  }
  return pieces;
};
