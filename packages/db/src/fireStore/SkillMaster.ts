import { SkillMaster } from "@rm/types";
import { createFirestoreCollection } from "./createCollection";

export const dbSkillMasterModule =
  createFirestoreCollection<SkillMaster>("skill_master");
