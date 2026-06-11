import { execSync } from "child_process";
import { cpSync, mkdirSync, readdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const GITEE_REPO = "https://gitee.com/denghuo_lanshan/47cardgame.git";
const PAGES_BRANCH = "gitee-pages";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workDir = join(root, ".gitee-pages-build");

function run(cmd, cwd = root) {
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

console.log("构建生产包…");
run("npm run build");

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
const distDir = join(root, "dist");
for (const name of readdirSync(distDir)) {
  cpSync(join(distDir, name), join(workDir, name), { recursive: true });
}

process.chdir(workDir);
run("git init");
run(`git checkout -b ${PAGES_BRANCH}`);
run("git add -A");
try {
  run('git commit -m "deploy: gitee pages"');
} catch {
  console.log("无新变更，跳过提交");
}
run(`git push -f ${GITEE_REPO} ${PAGES_BRANCH}`);

console.log("\n完成。请在 Gitee 仓库 → 服务 → Gitee Pages：");
console.log(`  分支：${PAGES_BRANCH}，目录：/（根目录）`);
