import { auth, db } from "@rm/db";
import { AppUser, User } from "@rm/types";
import { doc, getDoc, writeBatch } from "firebase/firestore";

type SyncCollection = "users" | "user";
type SyncMode = "insert" | "merge";

type SyncDocumentBase = {
  id: string;
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
};

type SyncTarget<T extends SyncDocumentBase> = {
  mode: SyncMode;
  payload: Partial<T> | T;
};

type InternalTarget<T extends SyncDocumentBase> = SyncTarget<T> & {
  collection: SyncCollection;
};

export type SyncUserDocumentsOptions = {
  uid: string;
  operation: string;
  appUser?: SyncTarget<AppUser> | null;
  legacyUser?: SyncTarget<User> | null;
};

export type SyncUserDocumentsErrorDetails = {
  operation: string;
  failedCollections: SyncCollection[];
  targetCollections: SyncCollection[];
  reason: "precheck" | "commit";
  messages: string[];
};

export class SyncUserDocumentsError extends Error {
  readonly details: SyncUserDocumentsErrorDetails;
  readonly rawError: unknown;

  constructor(details: SyncUserDocumentsErrorDetails, rawError?: unknown) {
    super(
      `[syncUserDocuments:${details.operation}] ${details.messages.join(" ")}`
    );
    this.name = "SyncUserDocumentsError";
    this.details = details;
    this.rawError = rawError;
  }
}

const collectionPathMap: Record<SyncCollection, string> = {
  users: "users",
  user: "user",
};

const toTargets = (
  options: SyncUserDocumentsOptions
): InternalTarget<SyncDocumentBase>[] => {
  const targets: InternalTarget<SyncDocumentBase>[] = [];

  if (options.appUser) {
    targets.push({
      collection: "users",
      mode: options.appUser.mode,
      payload: options.appUser.payload,
    });
  }

  if (options.legacyUser) {
    targets.push({
      collection: "user",
      mode: options.legacyUser.mode,
      payload: options.legacyUser.payload,
    });
  }

  return targets;
};

const getActorUid = () => auth.currentUser?.uid || "";

const prepareInsertPayload = <T extends SyncDocumentBase>(
  uid: string,
  payload: Partial<T> | T
): T => {
  const now = new Date();
  return {
    ...payload,
    id: payload.id || uid,
    createdAt: payload.createdAt ?? now,
    createdBy: payload.createdBy ?? getActorUid(),
    updatedAt: payload.updatedAt ?? payload.createdAt ?? now,
    updatedBy: payload.updatedBy ?? getActorUid(),
  } as T;
};

const prepareMergePayload = <T extends SyncDocumentBase>(
  payload: Partial<T> | T
) => {
  return {
    ...payload,
    updatedAt: new Date(),
    updatedBy: getActorUid(),
  } as Partial<T>;
};

const createPrecheckError = (
  options: SyncUserDocumentsOptions,
  targetCollections: SyncCollection[],
  messages: string[],
  failedCollections: SyncCollection[]
) => {
  return new SyncUserDocumentsError({
    operation: options.operation,
    failedCollections,
    targetCollections,
    reason: "precheck",
    messages,
  });
};

export const syncUserDocuments = async (options: SyncUserDocumentsOptions) => {
  const targets = toTargets(options);

  if (targets.length === 0) {
    return;
  }

  const snapshots = await Promise.all(
    targets.map((target) =>
      getDoc(doc(db, collectionPathMap[target.collection], options.uid))
    )
  );

  const messages: string[] = [];
  const failedCollections: SyncCollection[] = [];

  snapshots.forEach((snapshot, index) => {
    const target = targets[index];

    if (target.mode === "insert" && snapshot.exists()) {
      messages.push(
        `${target.collection}/${options.uid} already exists, so insert was cancelled.`
      );
      failedCollections.push(target.collection);
    }

    if (target.mode === "merge" && !snapshot.exists()) {
      messages.push(
        `${target.collection}/${options.uid} is missing, so merge was cancelled.`
      );
      failedCollections.push(target.collection);
    }
  });

  if (failedCollections.length > 0) {
    throw createPrecheckError(
      options,
      targets.map((target) => target.collection),
      messages,
      failedCollections
    );
  }

  const batch = writeBatch(db);

  targets.forEach((target) => {
    const targetRef = doc(
      db,
      collectionPathMap[target.collection],
      options.uid
    );

    if (target.mode === "insert") {
      batch.set(targetRef, prepareInsertPayload(options.uid, target.payload));
      return;
    }

    batch.set(targetRef, prepareMergePayload(target.payload), { merge: true });
  });

  try {
    await batch.commit();
  } catch (error) {
    throw new SyncUserDocumentsError(
      {
        operation: options.operation,
        failedCollections: targets.map((target) => target.collection),
        targetCollections: targets.map((target) => target.collection),
        reason: "commit",
        messages: [
          `Atomic sync commit failed for ${targets
            .map((target) => `${target.collection}/${options.uid}`)
            .join(", ")}.`,
        ],
      },
      error
    );
  }
};

export const getSyncUserDocumentsErrorDetails = (error: unknown) => {
  return error instanceof SyncUserDocumentsError ? error.details : null;
};
