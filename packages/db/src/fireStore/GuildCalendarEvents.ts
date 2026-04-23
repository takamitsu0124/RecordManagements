import { GuildCalendarEvent } from "@rm/types";
import { createFirestoreCollection } from "./createCollection";

export const dbGuildCalendarEventsModule =
  createFirestoreCollection<GuildCalendarEvent>("guild_calendar_events");
