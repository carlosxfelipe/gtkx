import { execSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { arch } from "node:os";

execSync("cargo build --message-format=json-render-diagnostics --release > cargo.log", { stdio: "inherit" });
execSync("neon dist < cargo.log", { stdio: "inherit" });
copyFileSync("index.node", `../native-linux-${arch()}/index.node`);
