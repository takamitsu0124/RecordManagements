import { DocumentData } from "firebase/firestore";
import { DefaultType } from "@rm/types";
import { auth, magnetar } from "../config";
import { formatDataTimestampToDate } from "../utils";

export const createFirestoreCollection = <T extends DefaultType & DocumentData>(
  collectionName: string
) =>
  magnetar.collection<T>(collectionName, {
    modifyPayloadOn: {
      insert: (payload) => ({
        ...payload,
        updatedBy: auth.currentUser?.uid || "",
        createdBy: auth.currentUser?.uid || "",
      }),
      merge: (payload) => ({
        ...payload,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.uid || "",
      }),
    },
    modifyReadResponseOn: {
      added: formatDataTimestampToDate,
      modified: formatDataTimestampToDate,
    },
  });
