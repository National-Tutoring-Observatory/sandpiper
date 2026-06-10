import { PromptService } from "../../app/modules/prompts/prompt.js";
import { TeamService } from "../../app/modules/teams/team.js";

type LibraryEntry = {
  promptName: string;
  description: string;
  authors: { name: string; affiliation?: string }[];
  paperRefs: { title: string; url: string }[];
};

const LIBRARY_ENTRIES: LibraryEntry[] = [
  {
    promptName: "Talk Moves (sample prompt)",
    description:
      "Label each teacher utterance with a single TalkMove drawn from a fixed taxonomy. Useful for analyzing accountable-talk patterns turn-by-turn.",
    authors: [
      { name: "Dorottya Demszky", affiliation: "Stanford University" },
      { name: "Jing Liu", affiliation: "University of Maryland" },
    ],
    paperRefs: [
      {
        title:
          "Measuring Conversational Uptake: A Case Study on Student-Teacher Interactions",
        url: "https://aclanthology.org/2021.acl-long.130/",
      },
    ],
  },
  {
    promptName: "Tutor Moves (sample prompt)",
    description:
      "Per-utterance coding of tutor learning-support moves (e.g. modeling, scaffolding, eliciting). Run on tutoring transcripts to surface support patterns over time.",
    authors: [{ name: "NTO Research Team", affiliation: "Cornell Bowers" }],
    paperRefs: [
      {
        title: "Learning Support Taxonomy for One-on-One Tutoring",
        url: "https://example.org/learning-support-taxonomy",
      },
    ],
  },
  {
    promptName: "Tutoring Quality Rubric (sample prompt)",
    description:
      "Per-session binary scoring of tutor quality across six dimensions, with evidence snippets pulled from the transcript. Drop-in evaluation for whole-session tutor performance.",
    authors: [{ name: "NTO Research Team", affiliation: "Cornell Bowers" }],
    paperRefs: [
      {
        title: "Rubric-based Evaluation of Tutoring Sessions",
        url: "https://example.org/tutoring-rubric",
      },
    ],
  },
];

const CURATOR_TEAM_NAME = "Research Team Alpha";

export async function seedPromptLibrary() {
  const curatorTeam = await TeamService.findOne({ name: CURATOR_TEAM_NAME });
  if (!curatorTeam) {
    console.warn(
      `  ⚠️  Curator team '${CURATOR_TEAM_NAME}' not found. Run team and prompt seeders first.`,
    );
    return;
  }

  for (const entry of LIBRARY_ENTRIES) {
    const prompt = await PromptService.findOne({
      name: entry.promptName,
      team: curatorTeam._id,
    });

    if (!prompt) {
      console.warn(
        `  ⚠️  Source prompt '${entry.promptName}' not found in '${CURATOR_TEAM_NAME}'. Run prompt seeder first.`,
      );
      continue;
    }

    if (prompt.library?.isPublished) {
      console.log(`  ⏭️  '${entry.promptName}' already published, skipping...`);
      continue;
    }

    await PromptService.publish(prompt._id, {
      description: entry.description,
      authors: entry.authors,
      paperRefs: entry.paperRefs,
    });

    console.log(`  ✓ Published '${entry.promptName}' to the library`);
  }
}
