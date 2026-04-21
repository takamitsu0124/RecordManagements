import { UserSkill } from "@rm/types";
import { createFirestoreCollection } from "./createCollection";

export const dbUserSkillsModule =
  createFirestoreCollection<UserSkill>("user_skills");
