import DEFAULT_PROMPTS from "../../app/modules/prompts/helpers/defaultPrompts.js";
import tokenizePromptVersion from "../../app/modules/prompts/helpers/tokenizePromptVersion.js";
import { PromptService } from "../../app/modules/prompts/prompt.js";
import { PromptVersionService } from "../../app/modules/prompts/promptVersion.js";
import { TeamService } from "../../app/modules/teams/team.js";
import { getSeededTeams } from "./teamSeeder.js";

export async function seedPrompts() {
  const personalTeams = await TeamService.find({
    match: { isPersonal: true },
  });
  const seededTeams = await getSeededTeams();

  const teams = [...personalTeams, ...seededTeams];

  if (teams.length === 0) {
    console.warn(
      "  ⚠️  No personal or seeded teams found. Please run team seeder first.",
    );
    return;
  }

  for (const team of teams) {
    for (const promptData of DEFAULT_PROMPTS) {
      try {
        const existing = await PromptService.find({
          match: { name: promptData.name, team: team._id },
        });

        if (existing.length > 0) {
          console.log(
            `  ⏭️  Prompt '${promptData.name}' already exists in '${team.name}', skipping...`,
          );
          continue;
        }

        const prompt = await PromptService.create({
          name: promptData.name,
          team: team._id,
          annotationType: promptData.annotationType,
          productionVersion: 1,
        });

        console.log(
          `  ✓ Created prompt in '${team.name}': ${promptData.name} (ID: ${prompt._id})`,
        );

        const inputTokens = tokenizePromptVersion(
          promptData.userPrompt,
          promptData.annotationSchema,
        );

        await PromptVersionService.create({
          name: "initial",
          prompt: prompt._id,
          version: 1,
          userPrompt: promptData.userPrompt,
          annotationSchema: promptData.annotationSchema,
          hasBeenSaved: true,
          inputTokens,
        });

        console.log(`    ✓ Created version 1 for prompt: ${promptData.name}`);
      } catch (error) {
        console.error(`  ✗ Error creating prompt ${promptData.name}:`, error);
        throw error;
      }
    }
  }
}

export async function getSeededPrompts() {
  return PromptService.find({
    match: { name: { $in: DEFAULT_PROMPTS.map((p) => p.name) } },
  });
}
