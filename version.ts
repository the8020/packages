import { kernel } from "@the8020/kernel";

/** Presentation metadata only; repository paths, remotes and history stay private. */
export async function packageVersion(packageId: string) {
  // Version history fetches remotes; diagnostics must remain a local read.
  const repository = await kernel.packages.repository.inspect(packageId);
  return {
    commit: repository.head ?? "",
    modified: repository.clean === false,
  };
}
