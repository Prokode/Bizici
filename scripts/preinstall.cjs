"use strict";

const fs = require("fs");
const path = require("path");

for (const file of ["package-lock.json", "yarn.lock"]) {
  const p = path.join(__dirname, "..", file);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {}
  }
}

const ua = process.env.npm_config_user_agent || "";
const execpath = process.env.npm_execpath || "";
const isPnpm =
  ua.startsWith("pnpm/") ||
  ua.includes(" pnpm/") ||
  /pnpm/i.test(execpath) ||
  !!process.env.PNPM_HOME ||
  !!process.env.PNPM_SCRIPT_SRC_DIR;

if (!isPnpm) {
  console.error(
    "\nThis repository uses pnpm. Please run `pnpm install` instead.\n" +
      "Install pnpm with `npm install -g pnpm` or `corepack enable && corepack prepare pnpm@latest --activate`.\n",
  );
  process.exit(1);
}
