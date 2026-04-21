import { GuildScheduleResponse } from "@rm/types";
import { createFirestoreCollection } from "./createCollection";

export const dbGuildScheduleResponsesModule =
  createFirestoreCollection<GuildScheduleResponse>("guild_schedule_responses");
