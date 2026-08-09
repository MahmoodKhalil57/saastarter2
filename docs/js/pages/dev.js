// dev.html — enable/disable the devgit module (see js/devgit.js).
import { clearConfig, getFile, loadConfig, repoInfo, saveConfig, targets } from "../devgit-github.js";
import { toast } from "../chrome.js";

const form = document.getElementById("devgit-form");
const status = document.getElementById("devgit-status");
const say = (html, tone = "neutral") => {
  status.innerHTML = `<wa-callout variant="${tone}">${html}</wa-callout>`;
};

const saved = loadConfig();
if (saved) {
  for (const [key, value] of Object.entries(saved))
    if (form.elements[key] && key !== "token") form.elements[key].value = value;
  say(
    `Enabled as <code>${saved.owner}/${saved.repo}</code> @ <code>${saved.branch}</code>. Token stays hidden — re-paste to change it.`,
    "success",
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const cfg = { ...data, token: data.token || saved?.token, sourceDir: data.sourceDir.replace(/^\/|\/$/g, "") };
  if (!cfg.token) return say("Paste a token first.", "danger");
  try {
    say("verifying token against GitHub…");
    const info = await repoInfo(cfg);
    cfg.branch ||= info.default_branch;
    if (!info.permissions?.push) throw new Error("token cannot push to this repo — check Contents: Read and write");
    const probe = targets(cfg)[0]; // prove the layout: index.html must exist where we'll write
    await getFile(cfg, cfg.branch, `${cfg.sourceDir ? `${cfg.sourceDir}/` : ""}index.html`).catch(() => {
      throw new Error(`no index.html under ${cfg.branch}:${cfg.sourceDir || "/"} — wrong branch or dir?`);
    });
    saveConfig(cfg);
    say(
      `Verified — devgit enabled on <code>${probe.branch}</code>${cfg.deployBranch ? ` + deploy to <code>${cfg.deployBranch}</code>` : ""}. Open any page and hit the <code>&lt;/&gt;</code> button.`,
      "success",
    );
    void toast("devgit enabled");
  } catch (error) {
    say(error.message, "danger");
  }
});

document.getElementById("devgit-clear").addEventListener("click", () => {
  clearConfig();
  form.reset();
  say("Disabled — token removed from this browser.", "warning");
  void toast("devgit disabled");
});
