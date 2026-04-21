import { AppRole, defaultAppUser } from "@rm/types";
import { dbUsersModule } from "@rm/db";

type RegisterInfo = {
  email: string;
  name: string;
  guildId: string;
  role: AppRole;
};

export const dbUserCreate = async (uid: string, info: RegisterInfo) => {
  try {
    await dbUsersModule.doc(uid).insert({
      ...defaultAppUser(),
      id: uid,
      uid,
      email: info.email,
      displayName: info.name,
      guildId: info.guildId,
      role: info.role,
    });
  } catch (e) {
    console.error("Failed to create user document:", e);
    throw e;
  }
};
