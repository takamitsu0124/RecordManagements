import { defaultAppUser, defaultUser } from "@rm/types";
import { RegisterInfo } from "src/pages/RMUserRegister/register";
import { useToast } from "src/components/RMToast/RMToast";
import {
  getSyncUserDocumentsErrorDetails,
  syncUserDocuments,
} from "./syncUserDocuments";

export const dbUserCreate = async (uid: string, info: RegisterInfo) => {
  try {
    await syncUserDocuments({
      uid,
      operation: "dbUserCreate",
      appUser: {
        mode: "insert",
        payload: {
          ...defaultAppUser(),
          id: uid,
          uid,
          email: info.email,
          displayName: info.name,
          guildId: info.guildId,
          role: info.role,
        },
      },
      legacyUser: {
        mode: "insert",
        payload: {
          ...defaultUser(),
          id: uid,
          charaName: info.name,
          guildId: info.guildId,
          role: info.role === "admin" ? "管理者" : "エンドユーザー",
          contact: {
            email: info.email,
            phone: "",
          },
        },
      },
    });
  } catch (e) {
    useToast({
      toastTitle: "ユーザー登録に失敗しました",
      toastColor: "red",
      toastMovingTime: 3,
      isCheckCircle: false,
    });
    console.error(
      "Failed to create synced user documents:",
      getSyncUserDocumentsErrorDetails(e) || e
    );
    throw e;
  }
};
