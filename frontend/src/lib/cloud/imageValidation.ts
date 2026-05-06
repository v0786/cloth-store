import { driveHasFilenames } from "@/lib/gdrive";

export type CloudValidationResult =
  | { mode: "SKIPPED"; missing: string[] }
  | { mode: "VALIDATED"; missing: string[] };

export async function validateImageFilenamesInCloud(params: {
  userId: string;
  provider: "GOOGLE_DRIVE" | "ONEDRIVE";
  filenames: string[];
}) {
  const enabled = (process.env.ENABLE_CLOUD_IMAGE_VALIDATION || "").toLowerCase() === "true";
  if (!enabled) return { mode: "SKIPPED", missing: [] } satisfies CloudValidationResult;

  if (params.provider !== "GOOGLE_DRIVE") return { mode: "SKIPPED", missing: [] } satisfies CloudValidationResult;
  if (!process.env.GDRIVE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { mode: "SKIPPED", missing: [] } satisfies CloudValidationResult;
  }

  const { missing } = await driveHasFilenames(params.filenames);

  return { mode: "VALIDATED", missing } satisfies CloudValidationResult;
}
