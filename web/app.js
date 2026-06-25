const state = {
  provider: "ollama",
  blueprintPath: "",
  yaml: "",
  summary: null,
  status: null,
  env: null,
  valid: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function log(message, data) {
  const runLog = $("#runLog");
  const suffix = data ? `\n${JSON.stringify(data, null, 2)}` : "";
  runLog.textContent = `[${new Date().toLocaleTimeString()}] ${message}${suffix}\n\n${runLog.textContent}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const json = await response.json();
  if (!response.ok || json.ok === false) {
    const error = new Error(json.error || "Request failed");
    error.payload = json;
    throw error;
  }
  return json;
}

function setBusy(busy) {
  $$(".actions button, #saveBtn, #saveTemplateBtn, #saveTemplateToolbarBtn, #loadSelected, #refreshStatus, #saveEnvBtn").forEach((button) => {
    button.disabled = busy;
  });
}

function chip(label, ok, detail = "") {
  return `<span class="chip ${ok ? "ok" : "warn"}">${label}${detail ? `: ${detail}` : ""}</span>`;
}

function renderStatus() {
  const status = state.status;
  if (!status) return;

  $("#statusChips").innerHTML = [
    chip("Discord bot", status.discord.tokenConfigured),
    chip("Guild ID", status.discord.guildConfigured),
    chip("AI", status.ai.provider === "local" || status.ai.ollama.available || status.ai.openaiConfigured, status.ai.provider),
    chip("Ollama", status.ai.ollama.available, status.ai.ollama.available ? status.ai.ollama.models.length || "ready" : "offline"),
    chip("State", status.state.loaded, status.state.file)
  ].join("");

  $("#checkToken").classList.toggle("ok", status.discord.tokenConfigured);
  $("#checkGuild").classList.toggle("ok", status.discord.guildConfigured);
  $("#checkProvider").classList.toggle("ok", status.ai.provider === "local" || status.ai.ollama.available || status.ai.openaiConfigured);
  $("#checkBlueprint").classList.toggle("ok", state.valid);

  const select = $("#blueprintSelect");
  const items = [...status.blueprints.generated, ...(status.blueprints.templates || []), ...status.blueprints.examples];
  select.innerHTML = items
    .map((item) => `<option value="${item.path}">${blueprintTypeLabel(item.type)} - ${item.name}</option>`)
    .join("");
  if (state.blueprintPath) select.value = state.blueprintPath;
}

function blueprintTypeLabel(type) {
  if (type === "template") return "Template";
  if (type === "generated") return "Generated";
  return "Example";
}

function renderEnvSettings() {
  const settings = state.env?.settings;
  if (!settings) return;

  $("#envDiscordToken").value = "";
  $("#envDiscordToken").placeholder = settings.DISCORD_TOKEN_CONFIGURED ? "Keep current token" : "Paste bot token";
  $("#envGuildId").value = settings.DISCORD_GUILD_ID || "";
  $("#envAiProvider").value = settings.AI_PROVIDER || "ollama";
  $("#envOpenAiKey").value = "";
  $("#envOpenAiKey").placeholder = settings.OPENAI_API_KEY_CONFIGURED ? "Keep current key" : "Optional OpenAI key";
  $("#envOpenAiModel").value = settings.OPENAI_MODEL || "gpt-4o-mini";
  $("#envOllamaUrl").value = settings.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  $("#envOllamaModel").value = settings.OLLAMA_MODEL || "llama3.1:8b";
  $("#envOllamaTimeout").value = settings.OLLAMA_TIMEOUT_MS || "30000";
  $("#envLogLevel").value = settings.LOG_LEVEL || "info";
  $("#envDryRun").value = settings.DRY_RUN || "false";
  $("#envStateFile").value = settings.STATE_FILE || ".discordforge/state.json";
  $("#envWebHost").value = settings.WEB_HOST || "127.0.0.1";
  $("#envWebPort").value = settings.WEB_PORT || "5194";
}

function renderSummary(summary) {
  state.summary = summary;
  if (!summary) {
    $("#summaryCards").innerHTML = "";
    $("#tree").className = "tree empty";
    $("#tree").textContent = "Generate or load a blueprint to preview its structure.";
    return;
  }

  $("#summaryCards").innerHTML = [
    ["Roles", summary.roles],
    ["Categories", summary.categories],
    ["Channels", summary.channels],
    ["AutoMod", summary.automodRules]
  ]
    .map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");

  $("#tree").className = "tree";
  $("#tree").innerHTML = summary.tree
    .map(
      (category) => `
        <div class="category-node">
          <div class="category-title"><span>${escapeHtml(category.name)}</span><span>${category.channels.length}</span></div>
          <div class="channel-list">
            ${category.channels.map((channel) => `<span class="channel-pill"># ${escapeHtml(channel.name)} - ${channel.type}</span>`).join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setBlueprint({ path, content, summary, valid = true }) {
  state.blueprintPath = path || state.blueprintPath;
  state.yaml = content || state.yaml;
  state.valid = valid;
  $("#yamlEditor").value = state.yaml;
  $("#currentPath").textContent = state.blueprintPath || "unsaved";
  renderSummary(summary);
  if (state.status) renderStatus();
}

function activateTab(tab) {
  $$(".tabs button").forEach((button) => button.classList.toggle("selected", button.dataset.tab === tab));
  $$(".tab-page").forEach((page) => page.classList.remove("active"));
  $(`#${tab}Tab`).classList.add("active");
}

async function refreshStatus() {
  const [status, env] = await Promise.all([api("/api/status"), api("/api/env")]);
  state.status = status;
  state.env = env;
  state.provider = status.ai.provider;
  $$(".segmented button").forEach((button) => button.classList.toggle("selected", button.dataset.provider === state.provider));
  renderStatus();
  renderEnvSettings();
}

async function saveEnv(event) {
  event.preventDefault();
  setBusy(true);
  try {
    const updates = {
      DISCORD_TOKEN: $("#envDiscordToken").value,
      DISCORD_GUILD_ID: $("#envGuildId").value,
      AI_PROVIDER: $("#envAiProvider").value,
      OPENAI_API_KEY: $("#envOpenAiKey").value,
      OPENAI_MODEL: $("#envOpenAiModel").value,
      OLLAMA_BASE_URL: $("#envOllamaUrl").value,
      OLLAMA_MODEL: $("#envOllamaModel").value,
      OLLAMA_TIMEOUT_MS: $("#envOllamaTimeout").value,
      LOG_LEVEL: $("#envLogLevel").value,
      DRY_RUN: $("#envDryRun").value,
      STATE_FILE: $("#envStateFile").value,
      WEB_HOST: $("#envWebHost").value,
      WEB_PORT: $("#envWebPort").value
    };

    const result = await api("/api/env", {
      method: "POST",
      body: JSON.stringify({ updates })
    });

    state.env = { ok: true, settings: result.settings };
    $("#settingsNote").textContent = result.restartRequired
      ? "Saved. Restart the UI for web host or port changes to take effect."
      : "Saved to .env. Secret fields were not echoed back.";
    log("Environment settings saved.", {
      updated: result.updated,
      preservedSecrets: result.preservedSecrets,
      restartRequired: result.restartRequired
    });
    await refreshStatus();
  } catch (error) {
    log(`Saving environment failed: ${error.message}`, error.payload);
    $("#settingsNote").textContent = `Save failed: ${error.message}`;
  } finally {
    setBusy(false);
  }
}

async function generateBlueprint() {
  const prompt = $("#promptInput").value.trim();
  if (!prompt) {
    log("Prompt is required.");
    return;
  }

  setBusy(true);
  try {
    log(`Generating blueprint with ${state.provider} provider...`);
    const result = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        provider: state.provider,
        noAi: state.provider === "local",
        outputName: $("#outputName").value.trim()
      })
    });
    setBlueprint({ path: result.path, content: result.content, summary: result.summary, valid: true });
    activateTab("preview");
    log(`Generated ${result.path}`, result.summary);
    await refreshStatus();
  } catch (error) {
    log(`Generation failed: ${error.message}`, error.payload);
  } finally {
    setBusy(false);
  }
}

async function validateCurrent() {
  setBusy(true);
  try {
    const result = await api("/api/validate", {
      method: "POST",
      body: JSON.stringify({ path: state.blueprintPath, content: $("#yamlEditor").value })
    });
    setBlueprint({ path: state.blueprintPath, content: $("#yamlEditor").value, summary: result.summary, valid: result.valid });
    log("Blueprint is valid.", result.summary);
  } catch (error) {
    state.valid = false;
    if (state.status) renderStatus();
    log(`Validation failed: ${error.message}`, error.payload);
  } finally {
    setBusy(false);
  }
}

async function saveCurrent({ kind = "generated", name = "" } = {}) {
  setBusy(true);
  try {
    const result = await api("/api/save-blueprint", {
      method: "POST",
      body: JSON.stringify({ path: state.blueprintPath, content: $("#yamlEditor").value, kind, name })
    });
    setBlueprint({ path: result.path, content: $("#yamlEditor").value, summary: result.summary, valid: true });
    log(`Saved ${kind === "template" ? "template" : "blueprint"} ${result.path}`);
    await refreshStatus();
  } catch (error) {
    log(`Save failed: ${error.message}`, error.payload);
  } finally {
    setBusy(false);
  }
}

async function saveTemplateCurrent() {
  const name = $("#templateName").value.trim();
  await saveCurrent({ kind: "template", name });
}

async function dryRunCurrent() {
  setBusy(true);
  try {
    const result = await api("/api/dry-run", {
      method: "POST",
      body: JSON.stringify({ path: state.blueprintPath, content: $("#yamlEditor").value })
    });
    log("Dry run complete.", result.plan);
    activateTab("log");
  } catch (error) {
    log(`Dry run failed: ${error.message}`, error.payload);
  } finally {
    setBusy(false);
  }
}

async function applyCurrent() {
  const confirmed = confirm("Apply this blueprint to the configured Discord server? This will create or update roles, channels, messages, webhooks, and AutoMod rules.");
  if (!confirmed) return;

  setBusy(true);
  try {
    log("Applying blueprint to Discord...");
    const result = await api("/api/setup", {
      method: "POST",
      body: JSON.stringify({ path: state.blueprintPath, content: $("#yamlEditor").value, confirm: true })
    });
    log("Discord setup complete.", result.summary);
    activateTab("log");
    await refreshStatus();
  } catch (error) {
    log(`Discord setup failed: ${error.message}`, error.payload);
  } finally {
    setBusy(false);
  }
}

async function loadSelectedBlueprint() {
  const path = $("#blueprintSelect").value;
  if (!path) return;

  setBusy(true);
  try {
    const result = await api(`/api/blueprint?path=${encodeURIComponent(path)}`);
    setBlueprint({ path: result.path, content: result.content, summary: result.summary, valid: true });
    activateTab("preview");
    log(`Loaded ${result.path}`, result.summary);
  } catch (error) {
    log(`Load failed: ${error.message}`, error.payload);
  } finally {
    setBusy(false);
  }
}

function bindEvents() {
  $$(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      state.provider = button.dataset.provider;
      $$(".segmented button").forEach((item) => item.classList.toggle("selected", item === button));
    });
  });

  $$(".tabs button").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tab)));
  $("#refreshStatus").addEventListener("click", () => refreshStatus().catch((error) => log(`Status failed: ${error.message}`)));
  $("#generateBtn").addEventListener("click", generateBlueprint);
  $("#validateBtn").addEventListener("click", validateCurrent);
  $("#dryRunBtn").addEventListener("click", dryRunCurrent);
  $("#applyBtn").addEventListener("click", applyCurrent);
  $("#saveBtn").addEventListener("click", () => saveCurrent());
  $("#saveTemplateBtn").addEventListener("click", saveTemplateCurrent);
  $("#saveTemplateToolbarBtn").addEventListener("click", saveTemplateCurrent);
  $("#settings").addEventListener("submit", saveEnv);
  $("#loadSelected").addEventListener("click", loadSelectedBlueprint);
}

bindEvents();
refreshStatus()
  .then(() => {
    const first = $("#blueprintSelect").value;
    if (first) return api(`/api/blueprint?path=${encodeURIComponent(first)}`);
    return null;
  })
  .then((result) => {
    if (result) setBlueprint({ path: result.path, content: result.content, summary: result.summary, valid: true });
  })
  .catch((error) => log(`Startup status failed: ${error.message}`, error.payload));
