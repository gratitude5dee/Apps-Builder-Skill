import fs from "node:fs/promises";
import path from "node:path";

export type GeneratedFile = { path: string; contents: string };

export async function writeFiles(
  rootDir: string,
  files: GeneratedFile[],
  options: { overwrite?: boolean } = {}
) {
  await fs.mkdir(rootDir, { recursive: true });

  for (const file of files) {
    const fullPath = path.join(rootDir, file.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    try {
      if (!options.overwrite) {
        await fs.access(fullPath);
        throw new Error(`File already exists: ${file.path}`);
      }
    } catch {
      // File doesn't exist - safe to write.
    }

    await fs.writeFile(fullPath, file.contents, "utf8");
  }
}
