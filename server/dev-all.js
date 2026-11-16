// Starts the API and the PDF worker together, so `npm run dev:server` is all you need.
// Each one still runs as its own process with auto-restart (node --watch).
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverFolder = path.dirname(fileURLToPath(import.meta.url));
const programs = [
    { name: "server", file: "src/index.js", color: "\x1b[36m" },
    { name: "worker", file: "src/worker.js", color: "\x1b[35m" },
];

const children = programs.map(({ name, file, color }) => {
    const prefix = `${color}[${name}]\x1b[0m `;
    const child = spawn(process.execPath, ["--watch", file], {
        cwd: serverFolder,
        stdio: ["ignore", "pipe", "pipe"],
    });
    for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
        let pending = "";
        stream.setEncoding("utf8");
        stream.on("data", (chunk) => {
            const lines = (pending + chunk).split(/\r?\n/);
            pending = lines.pop() ?? "";
            for (const line of lines)
                target.write(`${prefix}${line}\n`);
        });
        stream.on("end", () => {
            if (pending)
                target.write(`${prefix}${pending}\n`);
        });
    }
    child.on("exit", (code) => console.log(`${prefix}stopped (exit code ${code ?? "none"})`));
    return child;
});

function stopAll() {
    for (const child of children)
        child.kill();
    process.exit(0);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
