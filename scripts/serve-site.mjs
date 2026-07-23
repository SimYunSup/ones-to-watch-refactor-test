#!/usr/bin/env node
// Small standalone runner that assembles (or reuses) the Pages artifact and
// serves it on a fixed port — this is the `webServer.command` Playwright
// (playwright.config.mjs) shells out to before running e2e/*.spec.mjs.
// Unlike scripts/visual-diff.mjs and scripts/perf-bench.mjs, which spin up
// their own server for the duration of a single script run and close it
// themselves, this one is meant to be launched as a long-lived child process
// and torn down externally (Playwright sends SIGTERM when the test run ends).
//
// Usage:
//   node ./scripts/serve-site.mjs                  # assemble site/ from the
//                                                    # four build outputs,
//                                                    # then serve it
//   node ./scripts/serve-site.mjs --port 4200       # serve on a fixed port
//                                                    # (default 4173)
//   node ./scripts/serve-site.mjs --no-assemble     # reuse an already-
//                                                    # assembled site/ as-is
//                                                    # instead of rebuilding
//                                                    # it (fails if site/
//                                                    # doesn't exist yet)
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleSite, startServer } from "./lib/site-server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const siteDir = path.join(repoRoot, "site");

function parseArgs(argv) {
  const args = { port: 4173, assemble: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") {
      args.port = Number(argv[++i]);
    } else if (argv[i] === "--no-assemble") {
      args.assemble = false;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.assemble) {
    assembleSite(repoRoot, siteDir, { toolName: "serve-site" });
  } else if (!existsSync(siteDir)) {
    console.error(
      `serve-site: --no-assemble was passed but ${siteDir} doesn't exist. Run without --no-assemble first, or run \`pnpm run build:all\`.`,
    );
    process.exit(1);
  } else {
    console.log(`serve-site: --no-assemble, reusing existing ${siteDir}`);
  }

  const server = await startServer(siteDir, args.port);
  console.log(`serve-site: listening on http://127.0.0.1:${args.port}`);

  // Playwright's webServer manages this process's lifetime: it sends SIGTERM
  // when the test run finishes (SIGINT covers a manual Ctrl-C run too).
  // Close the HTTP server cleanly on either so no port is left dangling.
  const shutdown = (signal) => {
    console.log(`serve-site: received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

await main();
