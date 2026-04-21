import { AppUser } from "@rm/types";
import { createFirestoreCollection } from "./createCollection";

export const dbUsersModule = createFirestoreCollection<AppUser>("users");
