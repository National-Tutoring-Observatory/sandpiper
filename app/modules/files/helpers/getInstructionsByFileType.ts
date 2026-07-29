import type { FileType } from "../files.types";

export default function getInstructionsByFileType({
  fileType,
}: {
  fileType: FileType;
}) {
  switch (fileType) {
    case "CSV":
      return {
        overview: `Upload a CSV file with the required <code>session_id</code>, <code>sequence_id</code>, <code>role</code>, and <code>content</code> columns.`,
        link: "https://docs.google.com/document/d/16dSQp_MopRPLGYYgjgaWsXaJId3oufjvvgDqEWQfiDU",
      };
    case "JSONL":
      return {
        overview: `Upload a JSONL file with the required <code>session_id</code>, <code>sequence_id</code>, <code>role</code>, and <code>content</code> fields.`,
        link: "https://docs.google.com/document/d/1x6kMZ2cpBuysJMlta7dVoRQ--G06PpWT26LenTex4R4",
      };
    default:
      return {
        overview: "",
        link: "",
      };
  }
}
