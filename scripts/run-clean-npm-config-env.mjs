import { spawn } from "node:child_process"

const [, , command, ...args] = process.argv

if (!command) {
  console.error("Usage: node scripts/run-clean-npm-config-env.mjs <command> [...args]")
  process.exit(1)
}

const env = { ...process.env }

for (const key of Object.keys(env)) {
  if (key.toLowerCase().startsWith("npm_config_")) {
    delete env[key]
  }
}

const child = spawn(command, args, {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
})

child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
