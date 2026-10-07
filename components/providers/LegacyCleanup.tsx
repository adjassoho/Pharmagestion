"use client";

import { purgeLegacyObasaData } from "@/lib/db/legacy-purge";

purgeLegacyObasaData();

export function LegacyCleanup() {
  return null;
}
