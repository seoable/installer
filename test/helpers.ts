import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Create a fresh temporary directory and point `process.env.HOME` (and on
 * Windows, USERPROFILE/APPDATA) at it so the path helpers resolve to
 * sandboxed locations. Returns the dir path and a `cleanup` callback that
 * restores the original env and removes the dir.
 */
export async function withFakeHome(): Promise<{
  home: string;
  cleanup: () => Promise<void>;
}> {
  const home = await mkdtemp(join(tmpdir(), "seoable-install-test-"));
  const orig = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    APPDATA: process.env.APPDATA,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = join(home, "AppData", "Roaming");
  delete process.env.XDG_CONFIG_HOME;

  return {
    home,
    cleanup: async () => {
      for (const [k, v] of Object.entries(orig)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      await rm(home, { recursive: true, force: true });
    },
  };
}
