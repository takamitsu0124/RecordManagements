import { BannerMaster } from "@rm/types";
import { createFirestoreCollection } from "./createCollection";

export const dbBannerMasterModule =
  createFirestoreCollection<BannerMaster>("banner_master");
