import type { ServerEvents } from "../server";
import { app } from "electron";
import fs from "fs/promises";
import path from "path";

// Dev shares the installed fork's userData folder but persists to its own
// config.dev.json, so dev experiments never overwrite the installed app's
// config.json. Seeded once from config.json on first dev run (seedIfMissing).
const isDev = !!process.env.VITE_DEV_SERVER_URL;

export class ConfigStore {
  private isTmpFile = false;
  private cfgPath = path.join(
    app.getPath("userData"),
    "apt-data",
    isDev ? "config.dev.json" : "config.json",
  );

  constructor(server: ServerEvents) {
    server.onEventAnyClient("CLIENT->MAIN::save-config", (cfg) => {
      this.save(cfg.contents, cfg.isTemporary);
      server.sendEventTo("broadcast", {
        name: "MAIN->CLIENT::config-changed",
        payload: { contents: cfg.contents },
      });
    });
  }

  async load(): Promise<string | null> {
    await this.seedIfMissing();
    let contents: string | null = null;
    try {
      contents = await fs.readFile(this.cfgPath, "utf8");
    } catch {}
    return contents;
  }

  // Seed a missing config from an existing one, once:
  //  - installed app: from an installed upstream EE2, so users keep their config
  //  - dev: from the fork's own config.json, so dev starts with your real settings
  // One-time copy — once our config exists we never read the source again.
  private async seedIfMissing() {
    const sourcePath = isDev
      ? path.join(app.getPath("userData"), "apt-data", "config.json")
      : path.join(
          app.getPath("appData"),
          "exiled-exchange-2",
          "apt-data",
          "config.json",
        );
    if (sourcePath === this.cfgPath) return; // no distinct source to seed from
    try {
      await fs.access(this.cfgPath);
      return; // our config already exists
    } catch {}
    try {
      const source = await fs.readFile(sourcePath, "utf8");
      await fs.mkdir(path.dirname(this.cfgPath), { recursive: true });
      await fs.writeFile(this.cfgPath, source);
    } catch {
      // source missing or unreadable — start fresh
    }
  }

  private async save(contents: string, tmp: boolean) {
    if (tmp && !this.isTmpFile) {
      this.cfgPath += ".tmp";
      this.isTmpFile = true;
    }
    try {
      await fs.mkdir(path.dirname(this.cfgPath), { recursive: true });
      await fs.writeFile(this.cfgPath, contents);
    } catch {
      app.exit(1);
    }
  }
}
