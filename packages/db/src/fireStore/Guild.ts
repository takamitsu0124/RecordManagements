import { Guild } from "@rm/types";
import { createFirestoreCollection } from "./createCollection";

export const dbGuildModule = createFirestoreCollection<Guild>("guild");
