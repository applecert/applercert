const DATA = window.ANIME_RIFT_DATA;
const SAVE_KEY = "neon-rift-tactics-save-v3";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ui = {
  app: $("#app"),
  currency: $("#currency"),
  topbarTitle: $("#topbarTitle"),
  topbarSub: $("#topbarSub"),
  tabs: $$(".tab"),
  squadList: $("#squadList"),
  stageList: $("#stageList"),
  bannerList: $("#bannerList"),
  pvpList: $("#pvpList"),
  inventoryList: $("#inventoryList"),
  detailPane: $("#detailPane"),
  arena: $("#arena"),
  arenaGlows: $("#arenaGlows"),
  battleUnits: $("#battleUnits"),
  battleFx: $("#battleFx"),
  battlePopups: $("#battlePopups"),
  battleTimeline: $("#battleTimeline"),
  skillBar: $("#skillBar"),
  battleTitle: $("#battleTitle"),
  battleSub: $("#battleSub"),
  battleSelect: $("#battleSelect"),
  combatLog: $("#combatLog"),
  modal: $("#modal"),
  modalTitle: $("#modalTitle"),
  modalBody: $("#modalBody"),
  toast: $("#toast"),
  btnCampaign: $("#btnCampaign"),
  btnPvp: $("#btnPvp"),
  btnTraining: $("#btnTraining"),
  btnAuto: $("#btnAuto"),
  btnNext: $("#btnNext"),
  btnRestart: $("#btnRestart"),
  btnSpeed: $("#btnSpeed"),
  btnReset: $("#btnReset")
};

const portraitGrid = {
  rin: "0% 0%",
  gale: "50% 0%",
  lyra: "100% 0%",
  yuna: "0% 100%",
  mina: "50% 100%",
  kuro: "100% 100%",
  raider: "50% 0%",
  drone: "100% 0%",
  assassin: "0% 100%",
  warden: "100% 100%"
};

const effectGrid = {
  slash: "0% 0%",
  impact: "50% 0%",
  bolt: "100% 0%",
  heal: "0% 100%",
  shield: "50% 100%",
  burst: "100% 100%"
};

const defaultCollection = () => {
  const collection = {};
  for (const hero of DATA.heroes) {
    collection[hero.id] = {
      level: hero.rarity === "SSR" ? 1 : 1,
      shards: hero.rarity === "SSR" ? 12 : 24,
      unlocked: ["rin", "gale", "mina"].includes(hero.id),
      stars: 0,
      gear: 0
    };
  }
  return collection;
};

const defaultState = () => ({
  currencies: { ...DATA.currencies },
  activeMode: "campaign",
  activeStage: 1,
  selectedHeroId: "rin",
  selectedTeam: ["rin", "gale", "mina"],
  activeBannerId: "standard",
  autoBattle: false,
  speed: 1,
  collection: defaultCollection(),
  banners: Object.fromEntries(DATA.banners.map((banner) => [banner.id, { pity: 0 }])),
  materials: {
    alloy: 14,
    prism: 8,
    catalyst: 6,
    chip: 10
  },
  pvpRank: DATA.currencies.rank,
  unlockedStage: 1,
  trainingWins: 0
});

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const fresh = defaultState();
    return {
      ...fresh,
      ...parsed,
      currencies: { ...fresh.currencies, ...(parsed.currencies || {}) },
      collection: { ...fresh.collection, ...(parsed.collection || {}) },
      banners: { ...fresh.banners, ...(parsed.banners || {}) },
      materials: { ...fresh.materials, ...(parsed.materials || {}) },
      selectedTeam: Array.isArray(parsed.selectedTeam) && parsed.selectedTeam.length ? parsed.selectedTeam : fresh.selectedTeam
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function fmt(value) {
  return Math.round(value).toLocaleString("vi-VN");
}

function formatSigned(value) {
  return `${value >= 0 ? "+" : ""}${fmt(value)}`;
}

function heroDef(id) {
  return DATA.heroes.find((hero) => hero.id === id);
}

function enemyDef(id) {
  return DATA.enemies.find((enemy) => enemy.id === id);
}

function skillDef(id) {
  return DATA.skills[id];
}

function heroRecord(id) {
  return state.collection[id];
}

function unlockedHeroes() {
  return DATA.heroes.filter((hero) => heroRecord(hero.id)?.unlocked);
}

function squadHeroes() {
  const chosen = state.selectedTeam.filter((id) => heroRecord(id)?.unlocked);
  if (!chosen.length) {
    const fallback = unlockedHeroes().slice(0, DATA.maxSquadSize).map((hero) => hero.id);
    state.selectedTeam = fallback;
    saveState();
    return fallback.map((id) => heroDef(id));
  }
  state.selectedTeam = chosen.slice(0, DATA.maxSquadSize);
  saveState();
  return state.selectedTeam.map((id) => heroDef(id));
}

function heroStats(hero, record) {
  const level = record.level;
  const stars = record.stars || 0;
  const hp = Math.round(hero.base.hp + (level - 1) * 54 + stars * 42);
  const atk = Math.round(hero.base.atk + (level - 1) * 11 + stars * 7);
  const def = Math.round(hero.base.def + (level - 1) * 4 + stars * 3);
  const spd = Math.round(hero.base.spd + stars * 1.5);
  const mana = hero.base.mana + Math.floor(level / 4);
  return { hp, atk, def, spd, mana };
}

function enemyStats(enemy, stageId) {
  const scale = 1 + (stageId - 1) * 0.16;
  return {
    hp: Math.round(enemy.base.hp * scale),
    atk: Math.round(enemy.base.atk * scale),
    def: Math.round(enemy.base.def * scale),
    spd: Math.round(enemy.base.spd * scale),
    mana: enemy.base.mana
  };
}

function portraitPosition(id) {
  return portraitGrid[id] || "0% 0%";
}

function effectPosition(id) {
  return effectGrid[id] || "0% 0%";
}

function applySprite(el, key, isEnemy = false) {
  el.style.backgroundPosition = portraitPosition(key);
  if (isEnemy) {
    el.style.filter = "saturate(0.92) hue-rotate(16deg) brightness(0.92)";
  }
}

const state = loadState();
let battle = null;
let selectedSkillId = null;
let selectedTargetId = null;
let toastTimer = null;
let modalCloseTimer = null;

renderShell();
renderAll();

ui.btnCampaign.addEventListener("click", () => startCampaign(state.activeStage));
ui.btnPvp.addEventListener("click", () => startPvP());
ui.btnTraining.addEventListener("click", () => startTraining());
ui.btnAuto.addEventListener("click", () => {
  state.autoBattle = !state.autoBattle;
  saveState();
  renderTopbar();
  toast(state.autoBattle ? "Auto-battle bật." : "Auto-battle tắt.");
});
ui.btnNext.addEventListener("click", () => advanceStage());
ui.btnRestart.addEventListener("click", () => restartBattle());
ui.btnSpeed.addEventListener("click", () => {
  state.speed = state.speed >= 2.5 ? 1 : state.speed + 0.5;
  saveState();
  renderTopbar();
  toast(`Tốc độ x${state.speed.toFixed(1)}`);
});
ui.btnReset.addEventListener("click", () => {
  if (!confirm("Xóa tiến độ local và quay về mặc định?")) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
});

document.addEventListener("click", onGlobalClick);
document.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", () => {
  if (battle) renderBattleUnits();
});

function renderShell() {
  document.title = `${DATA.title} | Anime Game`;
  ui.topbarTitle.textContent = DATA.title;
  ui.topbarSub.textContent = DATA.subtitle;
}

function renderTopbar() {
  ui.currency.innerHTML = [
    ["Credits", state.currencies.credits, "gold"],
    ["Gems", state.currencies.gems, "cyan"],
    ["Tickets", state.currencies.tickets, "violet"],
    ["Rank", state.pvpRank, "magenta"]
  ].map(([label, value, tone]) => `<span class="currency__item tag--${tone}">${label} <b>${fmt(value)}</b></span>`).join("");
}

function renderAll() {
  renderTopbar();
  renderRoster();
  renderStages();
  renderBanners();
  renderPvp();
  renderInventory();
  renderDetailPane();
  renderBattleHub();
}

function renderRoster() {
  const chosen = new Set(state.selectedTeam);
  ui.squadList.innerHTML = DATA.heroes.map((hero) => {
    const record = heroRecord(hero.id);
    const stats = heroStats(hero, record);
    const unlocked = record.unlocked;
    const inSquad = chosen.has(hero.id);
    const portraitStyle = `background-position:${portraitPosition(hero.id)};`;
    return `
      <article class="hero-card ${inSquad ? "is-active" : ""}" data-hero-card="${hero.id}">
        <div class="hero-card__portrait" style="${portraitStyle}"></div>
        <div class="hero-card__meta">
          <h3 class="hero-card__name">${hero.name}</h3>
          <p class="hero-card__sub">${hero.callsign} · ${hero.role} · Lv.${record.level} · ${hero.faction}</p>
          <div class="hero-card__tags">
            <span class="tag tag--${hero.rarity.toLowerCase()}">${hero.rarity}</span>
            <span class="tag tag--${hero.color}">${hero.element}</span>
            <span class="tag">${stats.hp} HP</span>
            <span class="tag">${stats.atk} ATK</span>
          </div>
          <div class="action-row">
            <button class="btn btn--soft" data-action="toggleSquad" data-id="${hero.id}" ${!unlocked ? "disabled" : ""}>${inSquad ? "Bench" : "Squad"}</button>
            <button class="btn btn--soft" data-action="upgradeHero" data-id="${hero.id}" ${!unlocked ? "disabled" : ""}>Upgrade</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderStages() {
  ui.stageList.innerHTML = DATA.stages.map((stage) => {
    const locked = stage.id > state.unlockedStage;
    const active = stage.id === state.activeStage && state.activeMode === "campaign";
    return `
      <article class="stage-card ${locked ? "is-locked" : ""} ${active ? "is-active" : ""}">
        <div class="stage-card__title">${stage.id}. ${stage.name}</div>
        <p class="stage-card__sub">${stage.scene}</p>
        <div class="stage-badges">
          <span class="tag tag--gold">${fmt(stage.reward.credits)} Cr</span>
          <span class="tag tag--cyan">${fmt(stage.reward.gems)} Gem</span>
          ${Object.entries(stage.reward.shards || {}).map(([id, shards]) => `<span class="tag">${heroDef(id).name} +${shards}</span>`).join("")}
        </div>
        <div class="action-row">
          <button class="btn btn--soft" data-action="startStage" data-id="${stage.id}" ${locked ? "disabled" : ""}>Play</button>
          <button class="btn btn--ghost" data-action="previewStage" data-id="${stage.id}">Preview</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderBanners() {
  ui.bannerList.innerHTML = DATA.banners.map((banner) => {
    const active = banner.id === state.activeBannerId;
    const status = state.banners[banner.id];
    return `
      <article class="banner-card ${active ? "is-active" : ""}">
        <div class="banner-card__art" style="background-image:url('${DATA.battleBackground}');"></div>
        <div class="banner-card__title">${banner.name}</div>
        <p class="banner-card__sub">${banner.desc}</p>
        <div class="stage-badges">
          ${Object.entries(banner.rates).map(([rarity, rate]) => `<span class="tag tag--${rarity.toLowerCase()}">${rarity} ${rate}%</span>`).join("")}
          <span class="tag">Pity ${status.pity}/${banner.pityAt}</span>
        </div>
        <div class="action-row">
          <button class="btn btn--soft" data-action="setBanner" data-id="${banner.id}">Use</button>
          <button class="btn btn--cyan" data-action="pull" data-id="${banner.id}" data-count="1">Pull x1</button>
          <button class="btn btn--primary" data-action="pull" data-id="${banner.id}" data-count="10">Pull x10</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderPvp() {
  ui.pvpList.innerHTML = DATA.pvpOpponents.map((opponent, index) => `
    <article class="pvp-card ${index === 0 ? "is-active" : ""}">
      <div class="pvp-card__title">${opponent.name}</div>
      <p class="pvp-card__sub">Rank ${fmt(opponent.rank)} · ${opponent.mood}</p>
      <div class="opponent-tags">
        <span class="tag tag--${index % 2 ? "cyan" : "magenta"}">Best of 3</span>
        <span class="tag">AI mimic</span>
      </div>
      <div class="action-row">
        <button class="btn btn--soft" data-action="startPvP" data-id="${opponent.name}">Challenge</button>
      </div>
    </article>
  `).join("");
}

function renderInventory() {
  ui.inventoryList.innerHTML = [
    ["Alloy", state.materials.alloy, "gold"],
    ["Prism", state.materials.prism, "cyan"],
    ["Catalyst", state.materials.catalyst, "violet"],
    ["Chip", state.materials.chip, "green"]
  ].map(([label, value, tone]) => `
    <article class="inventory-card">
      <div class="inventory-card__title">${label}</div>
      <p class="inventory-card__sub">${fmt(value)} in stock</p>
      <span class="tag tag--${tone}">${label}</span>
    </article>
  `).join("");
}

function renderDetailPane(heroId = state.selectedHeroId) {
  const hero = heroDef(heroId);
  const record = heroRecord(hero.id);
  const stats = heroStats(hero, record);
  const synergies = DATA.synergies.filter((syn) => syn.members.every((id) => state.selectedTeam.includes(id)));
  ui.detailPane.innerHTML = `
    <div class="detail-grid">
      <div class="detail-art" style="background-position:${portraitPosition(hero.id)}; background-image:url('${DATA.portraitSheet}');"></div>
      <div class="detail-card">
        <div class="detail-card__title">${hero.name}</div>
        <p class="detail-card__sub">${hero.callsign} · ${hero.role} · ${hero.faction}</p>
        <div class="stage-badges">
          <span class="tag tag--${hero.rarity.toLowerCase()}">${hero.rarity}</span>
          <span class="tag tag--${hero.color}">${hero.element}</span>
          <span class="tag">Lv.${record.level}</span>
          <span class="tag">Stars ${record.stars}</span>
        </div>
      </div>
      <div class="meter">
        <div class="meter__label"><span>HP</span><span>${fmt(stats.hp)}</span></div>
        <div class="meter__bar meter__bar--hp"><span style="width:${clamp((stats.hp / (stats.hp + 400)) * 100, 12, 100)}%"></span></div>
      </div>
      <div class="meter">
        <div class="meter__label"><span>ATK</span><span>${fmt(stats.atk)}</span></div>
        <div class="meter__bar meter__bar--exp"><span style="width:${clamp((stats.atk / 320) * 100, 12, 100)}%"></span></div>
      </div>
      <div class="meter">
        <div class="meter__label"><span>SPD</span><span>${fmt(stats.spd)}</span></div>
        <div class="meter__bar meter__bar--mana"><span style="width:${clamp((stats.spd / 160) * 100, 12, 100)}%"></span></div>
      </div>
      <div class="detail-card">
        <div class="detail-card__title">Passive</div>
        <p class="detail-card__sub">${hero.passive}</p>
      </div>
      <div class="detail-card">
        <div class="detail-card__title">Synergy</div>
        <p class="detail-card__sub">${synergies.length ? synergies.map((syn) => `${syn.name}: ${syn.bonus}`).join("<br>") : "No active synergy with the current squad."}</p>
      </div>
      <div class="detail-card">
        <div class="detail-card__title">Skill deck</div>
        <div class="skill-tags">${hero.skills.map((skillId) => {
          const skill = skillDef(skillId);
          return `<span class="tag tag--${hero.color}">${skill.slot} · ${skill.name}</span>`;
        }).join("")}</div>
      </div>
      <div class="action-row">
        <button class="btn btn--cyan" data-action="playHero" data-id="${hero.id}">Set as focus</button>
        <button class="btn btn--soft" data-action="toggleSquad" data-id="${hero.id}" ${!record.unlocked ? "disabled" : ""}>${state.selectedTeam.includes(hero.id) ? "Bench" : "Squad"}</button>
      </div>
    </div>
  `;
}

function renderBattleHub() {
  ui.battleTitle.textContent = "Campaign Hub";
  ui.battleSub.textContent = "Choose a stage, enter the arena, and play skills in turn order.";
  ui.battleSelect.textContent = "No battle loaded";
  ui.battleTimeline.innerHTML = "";
  ui.skillBar.innerHTML = "";
  ui.combatLog.innerHTML = `
    <div class="log-item">Select a stage or PvP match to begin. The arena will render characters, skill cards, and the current turn order.</div>
  `;
  ui.battleUnits.innerHTML = "";
  ui.battleFx.innerHTML = "";
  ui.battlePopups.innerHTML = "";
  ui.arenaGlows.innerHTML = `<div class="arena__glow"></div>`;
}

function startCampaign(stageId) {
  state.activeMode = "campaign";
  state.activeStage = stageId;
  saveState();
  beginBattle({
    mode: "campaign",
    label: DATA.stages.find((stage) => stage.id === stageId).name,
    subtitle: DATA.stages.find((stage) => stage.id === stageId).scene,
    stageId,
    enemyLineup: DATA.stages.find((stage) => stage.id === stageId).enemyLineup,
    reward: DATA.stages.find((stage) => stage.id === stageId).reward,
    opponent: null,
    background: DATA.battleBackground
  });
}

function startPvP(opponentName = null) {
  state.activeMode = "pvp";
  saveState();
  const opponent = opponentName ? DATA.pvpOpponents.find((item) => item.name === opponentName) : pick(DATA.pvpOpponents);
  beginBattle({
    mode: "pvp",
    label: `PvP · ${opponent.name}`,
    subtitle: `Rank ${fmt(opponent.rank)} · ${opponent.mood}`,
    stageId: state.activeStage,
    enemyLineup: ["assassin", "drone", "warden"],
    reward: { credits: 0, gems: 0, shards: {} },
    opponent,
    background: DATA.battleBackground
  });
}

function startTraining() {
  state.activeMode = "training";
  saveState();
  beginBattle({
    mode: "training",
    label: "Training Simulation",
    subtitle: "No penalty, full feedback, instant restart.",
    stageId: state.activeStage,
    enemyLineup: ["drone", "raider", "assassin"],
    reward: { credits: 0, gems: 0, shards: {} },
    opponent: { name: "Training Dummy", rank: state.pvpRank },
    background: DATA.battleBackground,
    safe: true
  });
}

function advanceStage() {
  if (state.activeMode === "campaign") {
    const next = clamp(state.activeStage + 1, 1, DATA.stages.length);
    state.activeStage = next;
    saveState();
    startCampaign(next);
  } else {
    toast("Campaign only.");
  }
}

function restartBattle() {
  if (!battle) return;
  if (battle.mode === "campaign") startCampaign(state.activeStage);
  else if (battle.mode === "pvp") startPvP(battle.opponent?.name);
  else startTraining();
}

function beginBattle(config) {
  selectedSkillId = null;
  selectedTargetId = null;
  const heroUnits = squadHeroes().map((hero, index) => buildHeroUnit(hero, index));
  const enemyUnits = config.enemyLineup.map((enemyId, index) => buildEnemyUnit(enemyId, index, config.stageId));
  battle = {
    ...config,
    round: 1,
    activeUnitId: null,
    turnIndex: 0,
    order: [],
    units: [...heroUnits, ...enemyUnits],
    log: [],
    finished: false,
    locked: false,
    targetedSkill: null,
    waitForTarget: false,
    effectSeed: 0,
    auto: state.autoBattle,
    synergies: computeSynergies(squadHeroes().map((hero) => hero.id))
  };
  battle.order = buildTurnOrder();
  renderBattleShell();
  renderBattleUnits();
  renderBattleTimeline();
  renderBattleLog();
  renderBattleControls();
  pushLog(`<strong>${config.label}</strong> started.`);
  pushLog(config.subtitle);
  syncBattleView();
  beginTurn();
}

function buildHeroUnit(hero, lane) {
  const record = heroRecord(hero.id);
  const stats = heroStats(hero, record);
  return createUnit({
    id: `${hero.id}-hero`,
    heroId: hero.id,
    side: "player",
    lane,
    name: hero.name,
    callsign: hero.callsign,
    role: hero.role,
    rarity: hero.rarity,
    element: hero.element,
    portrait: hero.id,
    skills: hero.skills,
    passive: hero.passive,
    stats,
    maxHp: stats.hp,
    hp: stats.hp,
    maxMana: stats.mana,
    mana: stats.mana,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    shield: 0,
    statuses: {},
    cooldowns: {},
    focus: 0,
    xp: 0,
    dx: 0,
    dy: 0
  });
}

function buildEnemyUnit(enemyId, lane, stageId) {
  const enemy = enemyDef(enemyId);
  const stats = enemyStats(enemy, stageId);
  return createUnit({
    id: `${enemy.id}-${lane}-${stageId}`,
    enemyId: enemy.id,
    side: "enemy",
    lane,
    name: enemy.name,
    callsign: enemy.tone,
    role: "Enemy",
    rarity: enemy.rarity,
    element: enemy.tone,
    portrait: enemy.id,
    skills: enemy.skills,
    passive: enemy.tone,
    stats,
    maxHp: stats.hp,
    hp: stats.hp,
    maxMana: stats.mana,
    mana: stats.mana,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    shield: 0,
    statuses: {},
    cooldowns: {},
    focus: 0,
    xp: 0,
    dx: 0,
    dy: 0
  });
}

function createUnit(source) {
  const x = source.side === "player" ? 18 + source.lane * 5 : 82 - source.lane * 5;
  const y = 24 + source.lane * 22;
  return {
    ...source,
    x,
    y,
    scale: 1,
    rot: 0,
    alive: true
  };
}

function buildTurnOrder() {
  return battle.units
    .filter((unit) => unit.alive && unit.hp > 0)
    .sort((a, b) => b.spd - a.spd || Math.random() - 0.5);
}

function computeSynergies(teamIds) {
  return DATA.synergies.filter((syn) => syn.members.every((member) => teamIds.includes(member)));
}

function renderBattleShell() {
  ui.battleTitle.textContent = battle.label;
  ui.battleSub.textContent = battle.subtitle;
  ui.battleSelect.textContent = `${battle.mode.toUpperCase()} · Round ${battle.round}`;
  ui.arena.style.backgroundImage = `linear-gradient(180deg, color-mix(in oklch, var(--bg-0) 48%, transparent), color-mix(in oklch, var(--bg-1) 28%, transparent)), url("${battle.background}")`;
  ui.arenaGlows.innerHTML = `<div class="arena__glow"></div>`;
}

function renderBattleUnits() {
  ui.battleUnits.innerHTML = "";
  battle.unitRefs = new Map();
  for (const unit of battle.units) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `unit ${unit.side === "player" ? "is-player" : "is-enemy"}`;
    el.dataset.unitId = unit.id;
    el.dataset.side = unit.side;
    el.dataset.lane = unit.lane;
    el.style.setProperty("--x", "0px");
    el.style.setProperty("--y", "0px");
    el.style.setProperty("--scale", "1");
    el.style.left = `${unit.x}%`;
    el.style.top = `${unit.y}%`;
    el.innerHTML = `
      <div class="unit__head">
        <h4 class="unit__name">${unit.name}</h4>
        <span class="unit__role">${unit.callsign}</span>
      </div>
      <div class="unit__portrait"></div>
      <div class="unit__bars">
        <div class="bar bar--hp"><span></span></div>
        <div class="bar bar--mana"><span></span></div>
        <div class="bar bar--shield"><span></span></div>
      </div>
      <div class="status-row"></div>
    `;
    const portrait = $(".unit__portrait", el);
    portrait.style.backgroundImage = `url("${DATA.portraitSheet}")`;
    applySprite(portrait, unit.portrait, unit.side === "enemy");
    ui.battleUnits.appendChild(el);
    battle.unitRefs.set(unit.id, el);
  }
  syncUnitSprites();
  syncBattleView();
}

function syncUnitSprites() {
  for (const unit of battle.units) {
    const el = battle.unitRefs.get(unit.id);
    if (!el) continue;
    el.style.left = `${unit.x}%`;
    el.style.top = `${unit.y}%`;
    el.style.setProperty("--x", `${unit.dx}px`);
    el.style.setProperty("--y", `${unit.dy}px`);
    el.style.setProperty("--scale", unit.scale);
    el.style.setProperty("--rot", `${unit.rot || 0}deg`);
    el.classList.toggle("is-active", battle.activeUnitId === unit.id);
    el.classList.toggle("is-targeted", selectedTargetId === unit.id);
    el.classList.toggle("is-targetable", isTargetable(unit));
    const portrait = $(".unit__portrait", el);
    portrait.style.backgroundImage = `url("${DATA.portraitSheet}")`;
    portrait.style.backgroundPosition = portraitPosition(unit.portrait);
    portrait.style.filter = unit.side === "enemy" ? "saturate(0.92) hue-rotate(16deg) brightness(0.92)" : "";
    renderUnitBars(unit, el);
    renderUnitStatuses(unit, el);
  }
}

function renderUnitBars(unit, el) {
  const hp = $(".bar--hp > span", el);
  const mana = $(".bar--mana > span", el);
  const shield = $(".bar--shield > span", el);
  hp.style.width = `${clamp((unit.hp / unit.maxHp) * 100, 0, 100)}%`;
  mana.style.width = `${clamp((unit.mana / unit.maxMana) * 100, 0, 100)}%`;
  shield.style.width = `${clamp((unit.shield / Math.max(1, unit.maxHp)) * 140, 0, 100)}%`;
}

function renderUnitStatuses(unit, el) {
  const row = $(".status-row", el);
  const statuses = [];
  for (const [key, value] of Object.entries(unit.statuses)) {
    if (!value) continue;
    statuses.push(`<span class="status status--${key}">${key.toUpperCase()} ${value}</span>`);
  }
  if (unit.focus > 0) statuses.push(`<span class="status status--focus">FOCUS ${unit.focus}</span>`);
  if (unit.shield > 0) statuses.push(`<span class="status status--guard">SHIELD ${fmt(unit.shield)}</span>`);
  row.innerHTML = statuses.join("");
}

function renderBattleTimeline() {
  if (!battle) return;
  ui.battleTimeline.innerHTML = battle.order.map((unit) => `
    <span class="timeline__chip ${unit.side === "player" ? "is-player" : "is-enemy"} ${battle.activeUnitId === unit.id ? "is-active" : ""}">
      ${unit.name}
    </span>
  `).join("");
}

function renderBattleLog() {
  ui.combatLog.innerHTML = battle.log.map((entry) => `<div class="log-item">${entry}</div>`).join("");
}

function renderBattleControls() {
  ui.skillBar.innerHTML = "";
  if (!battle) return;
  const active = getUnit(battle.activeUnitId);
  if (!active || active.side !== "player") {
    ui.skillBar.innerHTML = `<div class="battle-select">Enemy turn in progress.</div>`;
    return;
  }
  const hero = heroDef(active.heroId);
  const skills = hero.skills.map((skillId) => skillDef(skillId));
  ui.skillBar.innerHTML = skills.map((skill) => {
    const disabled = active.mana < skill.cost || (active.cooldowns[skill.id] || 0) > 0 || battle.locked;
    return `
      <button class="skill-card ${disabled ? "is-disabled" : ""}" data-action="skill" data-skill="${skill.id}" ${disabled ? "disabled" : ""}>
        <div class="skill-card__top">
          <h4 class="skill-card__name">${skill.name}</h4>
          <span class="skill-card__cost">${skill.cost} MP</span>
        </div>
        <p class="skill-card__desc">${skill.desc}</p>
        <div class="skill-tags">
          <span class="tag tag--${hero.color}">${skill.slot}</span>
          <span class="tag">${skill.mode}</span>
        </div>
      </button>
    `;
  }).join("");
}

function syncBattleView() {
  renderBattleTimeline();
  renderBattleControls();
  syncUnitSprites();
}

function getUnit(id) {
  return battle?.units.find((unit) => unit.id === id) || null;
}

function isTargetable(unit) {
  if (!battle || !battle.targetedSkill) return false;
  const skill = skillDef(battle.targetedSkill);
  if (!skill) return false;
  if (battle.activeUnitId === unit.id && skill.target === "self") return true;
  if (skill.target === "enemy") return unit.side === "enemy" && unit.hp > 0;
  if (skill.target === "ally") return unit.side === "player" && unit.hp > 0;
  return false;
}

function pushLog(html) {
  battle.log.unshift(html);
  battle.log = battle.log.slice(0, 30);
  renderBattleLog();
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("is-open"), 1800);
}

function openModal(title, body) {
  ui.modalTitle.textContent = title;
  ui.modalBody.innerHTML = body;
  ui.modal.classList.add("is-open");
  clearTimeout(modalCloseTimer);
}

function closeModal() {
  ui.modal.classList.remove("is-open");
}

function portraitFace(unit) {
  return portraitPosition(unit.portrait);
}

function selectHero(heroId) {
  state.selectedHeroId = heroId;
  saveState();
  renderDetailPane(heroId);
}

function toggleSquad(heroId) {
  const record = heroRecord(heroId);
  if (!record.unlocked) {
    toast("Hero chưa mở khóa.");
    return;
  }
  if (state.selectedTeam.includes(heroId)) {
    if (state.selectedTeam.length <= 1) return toast("Cần ít nhất 1 hero ra trận.");
    state.selectedTeam = state.selectedTeam.filter((id) => id !== heroId);
    if (state.selectedHeroId === heroId) state.selectedHeroId = state.selectedTeam[0];
  } else {
    if (state.selectedTeam.length >= DATA.maxSquadSize) return toast("Squad đã đủ 3.");
    state.selectedTeam.push(heroId);
  }
  saveState();
  renderRoster();
  renderDetailPane(state.selectedHeroId);
}

function upgradeHero(heroId) {
  const hero = heroDef(heroId);
  const record = heroRecord(heroId);
  const cost = record.level * 220;
  const shardCost = record.level * 8;
  if (!record.unlocked) return toast("Hero chưa mở khóa.");
  if (state.currencies.credits < cost || record.shards < shardCost) {
    return toast(`Cần ${fmt(cost)} Credits và ${fmt(shardCost)} shards.`);
  }
  state.currencies.credits -= cost;
  record.shards -= shardCost;
  record.level += 1;
  if (record.level % 5 === 0) record.stars += 1;
  saveState();
  renderAll();
  toast(`${hero.name} lên cấp ${record.level}.`);
}

function setBanner(bannerId) {
  state.activeBannerId = bannerId;
  saveState();
  renderBanners();
}

async function pullBanner(bannerId, count) {
  const banner = DATA.banners.find((item) => item.id === bannerId);
  const flow = state.banners[bannerId];
  const isTen = count === 10;
  const gemCost = isTen ? banner.costTen.gems : banner.costOne.gems;
  const ticketCost = isTen ? banner.costTen.tickets : banner.costOne.tickets;
  const useTicket = !isTen && state.currencies.tickets >= 1;
  if (!useTicket && state.currencies.gems < gemCost) return toast("Không đủ Gems.");
  if (useTicket) state.currencies.tickets -= 1;
  else state.currencies.gems -= gemCost;
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push(singlePull(banner));
  }
  saveState();
  renderTopbar();
  renderBanners();
  renderInventory();
  renderDetailPane(state.selectedHeroId);
  showPullResults(banner, result);
}

function singlePull(banner) {
  const pity = state.banners[banner.id];
  pity.pity += 1;
  let rarity = rollRarity(banner);
  if (pity.pity >= banner.pityAt) {
    rarity = "SSR";
    pity.pity = 0;
  }
  if (rarity === "SSR") pity.pity = 0;
  const pool = DATA.heroes.filter((hero) => hero.rarity === rarity);
  const hit = pick(pool);
  const record = heroRecord(hit.id);
  const shardAmount = rarity === "SSR" ? 18 : rarity === "SR" ? 12 : rarity === "R" ? 8 : 5;
  if (record.unlocked) record.shards += shardAmount;
  else {
    record.shards += shardAmount;
    if (record.shards >= 40) record.unlocked = true;
  }
  if (Math.random() < 0.3) state.materials.prism += 1;
  return { kind: "hero", id: hit.id, rarity, shards: shardAmount };
}

function rollRarity(banner) {
  const roll = Math.random() * 100;
  if (roll < banner.rates.SSR) return "SSR";
  if (roll < banner.rates.SSR + banner.rates.SR) return "SR";
  if (roll < banner.rates.SSR + banner.rates.SR + banner.rates.R) return "R";
  return "N";
}

function showPullResults(banner, results) {
  openModal(`${banner.name} Pull Results`, `
    <div class="modal-grid pull-grid">
      ${results.map((item) => {
        const hero = heroDef(item.id);
        return `
          <article class="pull-card">
            <div class="pull-card__face" style="background-position:${portraitPosition(hero.id)}; background-image:url('${DATA.portraitSheet}')"></div>
            <h3 class="pull-card__name">${hero.name}</h3>
            <p class="pull-card__meta">${item.rarity} · +${fmt(item.shards)} shards</p>
          </article>
        `;
      }).join("")}
    </div>
    <div class="modal-actions">
      <button class="btn btn--soft" data-action="closeModal">Close</button>
    </div>
  `);
}

function syncStateAfterReward(reward) {
  if (!reward) return;
  state.currencies.credits += reward.credits || 0;
  state.currencies.gems += reward.gems || 0;
  if (reward.tickets) state.currencies.tickets += reward.tickets;
  for (const [heroId, shards] of Object.entries(reward.shards || {})) {
    const record = heroRecord(heroId);
    if (!record) continue;
    record.shards += shards;
    if (!record.unlocked && record.shards >= 40) record.unlocked = true;
  }
}

function createBattleUnitsFromCurrentTeam() {
  const team = squadHeroes();
  const heroUnits = team.map((hero, lane) => buildHeroUnit(hero, lane));
  const enemyLineup = battle.enemyLineup.map((enemyId, lane) => buildEnemyUnit(enemyId, lane, battle.stageId || state.activeStage));
  return [...heroUnits, ...enemyLineup];
}

function buildBattleOrder() {
  battle.order = battle.units.filter((unit) => unit.alive && unit.hp > 0).sort((a, b) => b.spd - a.spd || Math.random() - 0.5);
  battle.turnIndex = 0;
  battle.activeUnitId = battle.order[0]?.id || null;
}

async function beginTurn() {
  if (!battle || battle.finished) return;
  if (battle.locked) return;
  if (battle.turnIndex >= battle.order.length) {
    await startNewRound();
    return;
  }
  const unit = battle.order[battle.turnIndex];
  if (!unit || !unit.alive || unit.hp <= 0) {
    battle.turnIndex += 1;
    await beginTurn();
    return;
  }
  battle.activeUnitId = unit.id;
  battle.targetedSkill = null;
  battle.waitForTarget = false;
  syncBattleView();
  renderDetailPane(unit.heroId || state.selectedHeroId);
  pushLog(`<strong>${unit.name}</strong> acts.`);
  if (unit.side === "player") {
    if (state.autoBattle) {
      const action = choosePlayerAutoAction(unit);
      if (action) {
        await executeSkill(unit, action.skill.id, action.targetId);
        endTurnCleanup();
      }
      return;
    }
    renderBattleControls();
    return;
  }
  battle.locked = true;
  await wait(400 / state.speed);
  const plan = chooseEnemyAction(unit);
  if (plan) await executeSkill(unit, plan.skill.id, plan.targetId);
  battle.locked = false;
  endTurnCleanup();
}

function choosePlayerAutoAction(unit) {
  const skills = availableSkills(unit);
  const list = skills.filter((skill) => !isSkillOnCooldown(unit, skill));
  const skill = list[0];
  if (!skill) return null;
  const target = skill.target === "self" || skill.target === "allyAll" || skill.target === "enemyAll"
    ? null
    : pickTargetForSkill(unit, skill);
  return { skill, targetId: target?.id || null };
}

function chooseEnemyAction(unit) {
  const skills = availableSkills(unit).filter((skill) => !isSkillOnCooldown(unit, skill));
  const skill = skills.sort((a, b) => b.power - a.power)[0] || skillDef(unit.skills[0]);
  const target = skill.target === "self" || skill.target === "allyAll" || skill.target === "enemyAll"
    ? null
    : pickTargetForSkill(unit, skill);
  return { skill, targetId: target?.id || null };
}

function availableSkills(unit) {
  return unit.skills.map((id) => skillDef(id));
}

function isSkillOnCooldown(unit, skill) {
  return (unit.cooldowns[skill.id] || 0) > 0 || unit.mana < skill.cost || battle.locked;
}

function pickTargetForSkill(unit, skill) {
  if (skill.target === "self") return unit;
  const enemies = battle.units.filter((u) => u.side !== unit.side && u.alive && u.hp > 0);
  const allies = battle.units.filter((u) => u.side === unit.side && u.alive && u.hp > 0);
  if (skill.target === "ally") return allies.sort((a, b) => a.hp - b.hp)[0];
  if (skill.target === "allyAll") return allies[0];
  if (skill.target === "enemyAll") return enemies[0];
  if (skill.target === "enemy") return enemies.sort((a, b) => a.hp - b.hp)[0];
  return enemies[0];
}

function getTargetList(unit, skill) {
  const enemies = battle.units.filter((u) => u.side !== unit.side && u.alive && u.hp > 0);
  const allies = battle.units.filter((u) => u.side === unit.side && u.alive && u.hp > 0);
  switch (skill.target) {
    case "self": return [unit];
    case "ally": return [allies.sort((a, b) => a.hp - b.hp)[0]];
    case "allyAll": return allies;
    case "enemy": return [pickTargetForSkill(unit, skill)];
    case "enemyAll": return enemies;
    default: return [pickTargetForSkill(unit, skill)];
  }
}

function onGlobalClick(event) {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;
  if (action === "toggleSquad") return toggleSquad(id);
  if (action === "upgradeHero") return upgradeHero(id);
  if (action === "startStage") return startCampaign(Number(id));
  if (action === "previewStage") return selectPreviewStage(Number(id));
  if (action === "setBanner") return setBanner(id);
  if (action === "pull") return pullBanner(id, Number(actionEl.dataset.count || 1));
  if (action === "startPvP") return startPvP(id);
  if (action === "playHero") return selectHero(id);
  if (action === "skill") return queueSkill(actionEl.dataset.skill);
  if (action === "closeModal") return closeModal();
}

function selectPreviewStage(stageId) {
  state.activeStage = stageId;
  saveState();
  renderStages();
  toast(`Preview ${DATA.stages.find((stage) => stage.id === stageId).name}`);
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    selectedSkillId = null;
    selectedTargetId = null;
    closeModal();
    renderBattleControls();
  }
}

async function queueSkill(skillId) {
  if (!battle) return;
  const active = getUnit(battle.activeUnitId);
  if (!active || active.side !== "player") return;
  const skill = skillDef(skillId);
  if (isSkillOnCooldown(active, skill)) return;
  battle.targetedSkill = skillId;
  battle.waitForTarget = true;
  selectedSkillId = skillId;
  selectedTargetId = null;
  syncBattleView();
  renderBattleControls();
  if (skill.target === "self" || skill.target === "allyAll" || skill.target === "enemyAll") {
    await executeSkill(active, skillId, null);
    endTurnCleanup();
  } else {
    toast(`Choose a ${skill.target === "enemy" ? "target" : "ally"}.`);
  }
}

function onBattleUnitClick(unitId) {
  if (!battle || !battle.waitForTarget || !battle.targetedSkill) return;
  const unit = getUnit(unitId);
  const skill = skillDef(battle.targetedSkill);
  const actor = getUnit(battle.activeUnitId);
  if (!unit || !actor) return;
  const valid =
    (skill.target === "enemy" && unit.side === "enemy") ||
    (skill.target === "ally" && unit.side === "player");
  if (!valid) return;
  selectedTargetId = unitId;
  executeSkill(actor, skill.id, unitId).then(() => {
    endTurnCleanup();
  });
}

function endTurnCleanup() {
  tickStatusAfterAction();
  battle.turnIndex += 1;
  battle.targetedSkill = null;
  battle.waitForTarget = false;
  battle.locked = false;
  syncBattleView();
  checkBattleEnd();
  if (!battle.finished) {
    setTimeout(() => {
      beginTurn();
    }, 100 / state.speed);
  }
}

function tickStatusAfterAction() {
  for (const unit of battle.units) {
    if (!unit.alive) continue;
    for (const key of Object.keys(unit.statuses)) {
      unit.statuses[key] -= 1;
      if (unit.statuses[key] <= 0) delete unit.statuses[key];
    }
    for (const key of Object.keys(unit.cooldowns)) {
      unit.cooldowns[key] -= 1;
      if (unit.cooldowns[key] <= 0) delete unit.cooldowns[key];
    }
  }
}

async function startNewRound() {
  battle.round += 1;
  battle.order = buildTurnOrder();
  battle.turnIndex = 0;
  pushLog(`<strong>Round ${battle.round}</strong> begins.`);
  syncBattleView();
  await wait(120 / state.speed);
  if (!battle.finished) beginTurn();
}

function checkBattleEnd() {
  const players = battle.units.filter((unit) => unit.side === "player" && unit.alive && unit.hp > 0);
  const enemies = battle.units.filter((unit) => unit.side === "enemy" && unit.alive && unit.hp > 0);
  if (!players.length) {
    battle.finished = true;
    finishBattle(false);
    return true;
  }
  if (!enemies.length) {
    battle.finished = true;
    finishBattle(true);
    return true;
  }
  return false;
}

function finishBattle(win) {
  const title = win ? "Victory" : "Defeat";
  const reward = battle.reward || { credits: 0, gems: 0, shards: {} };
  if (win) {
    syncStateAfterReward(reward);
    if (battle.mode === "campaign") {
      state.unlockedStage = Math.max(state.unlockedStage, clamp((battle.stageId || state.activeStage) + 1, 1, DATA.stages.length));
    }
    state.trainingWins += battle.mode === "training" ? 1 : 0;
    if (battle.mode === "pvp") state.pvpRank += 24;
    saveState();
    renderAll();
  } else if (battle.mode === "pvp") {
    state.pvpRank = Math.max(800, state.pvpRank - 18);
    saveState();
    renderTopbar();
  }
  openModal(title, `
    <div class="modal-grid">
      <article class="modal-card">
        <h3 class="modal-card__title">${title}</h3>
        <p class="modal-card__sub">${win ? "The squad wins the arena." : "The squad has been defeated."}</p>
      </article>
      <article class="modal-card">
        <h3 class="modal-card__title">Rewards</h3>
        <p class="modal-card__sub">Credits ${formatSigned(win ? (reward.credits || 0) : 0)}<br>Gems ${formatSigned(win ? (reward.gems || 0) : 0)}</p>
      </article>
      <article class="modal-card">
        <h3 class="modal-card__title">Next</h3>
        <p class="modal-card__sub">${win ? "Continue the campaign or queue PvP." : "Upgrade the squad and retry."}</p>
      </article>
    </div>
    <div class="modal-actions">
      <button class="btn btn--cyan" data-action="closeModal">Close</button>
      <button class="btn btn--soft" data-action="restartBattle">Retry</button>
      <button class="btn btn--soft" data-action="nextBattle">Next stage</button>
    </div>
  `);
}

function resolveBattleActionButtons(action) {
  if (action === "restartBattle") {
    closeModal();
    restartBattle();
  }
  if (action === "nextBattle") {
    closeModal();
    advanceStage();
  }
}

document.addEventListener("click", (event) => {
  const modalAction = event.target.closest("[data-action='restartBattle'], [data-action='nextBattle']");
  if (modalAction) resolveBattleActionButtons(modalAction.dataset.action);
});

async function executeSkill(actor, skillId, targetId) {
  const skill = skillDef(skillId);
  const targets = targetId ? [getUnit(targetId)] : getTargetList(actor, skill);
  const filteredTargets = targets.filter(Boolean).filter((unit) => unit.alive && unit.hp > 0);
  if (!filteredTargets.length) return;
  battle.locked = true;
  actor.mana = Math.max(0, actor.mana - skill.cost);
  actor.cooldowns[skill.id] = skill.cooldown;
  actor.focus = Math.max(0, actor.focus - 1);
  syncBattleView();
  pushLog(`<strong>${actor.name}</strong> uses <strong>${skill.name}</strong>.`);
  const target = filteredTargets[0];
  const sourceRect = getUnitRect(actor);
  const targetRect = getUnitRect(target);
  switch (skill.mode) {
    case "slash":
      await animateDash(actor, target, skill);
      for (const hitTarget of filteredTargets) {
        dealDamage(actor, hitTarget, skill, { ignoreShield: false, bleed: 2 });
      }
      break;
    case "projectile":
      spawnProjectile(sourceRect, targetRect, skill, "impact");
      await wait(220 / state.speed);
      dealDamage(actor, target, skill, {});
      break;
    case "pierce":
      spawnProjectile(sourceRect, targetRect, skill, "impact");
      await wait(220 / state.speed);
      dealDamage(actor, target, skill, { ignoreShield: true, bonus: 0.1 });
      break;
    case "strike":
      await animateDash(actor, target, skill);
      dealDamage(actor, target, skill, { bonus: 0.08 });
      break;
    case "push":
      await animateDash(actor, target, skill);
      dealDamage(actor, target, skill, { bonus: 0.04 });
      applyShield(actor, Math.round(actor.def * 0.8 + 18));
      spawnFx("shield", sourceRect.centerX, sourceRect.centerY);
      break;
    case "shield":
      for (const ally of filteredTargets) {
        applyShield(ally, Math.round(actor.def * 0.75 + actor.atk * skill.power * 0.55));
      }
      spawnFx("shield", targetRect.centerX, targetRect.centerY);
      break;
    case "heal":
      for (const ally of filteredTargets) {
        healUnit(ally, Math.round(actor.atk * skill.power * 0.95 + ally.maxHp * 0.12));
      }
      spawnFx("heal", targetRect.centerX, targetRect.centerY);
      break;
    case "cleanse":
      for (const ally of filteredTargets) {
        healUnit(ally, Math.round(actor.atk * skill.power * 0.8 + ally.maxHp * 0.08));
        delete ally.statuses.bleed;
        delete ally.statuses.hack;
        delete ally.statuses.burn;
      }
      spawnFx("heal", targetRect.centerX, targetRect.centerY);
      break;
    case "buff":
      applyStatus(actor, "focus", 2);
      actor.focus = 2;
      actor.mana = Math.min(actor.maxMana, actor.mana + 1);
      spawnFx("shield", sourceRect.centerX, sourceRect.centerY);
      break;
    case "debuff":
      dealDamage(actor, target, skill, { bonus: 0.02 });
      applyStatus(target, "hack", 2);
      applyStatus(target, "burn", 1);
      spawnFx("bolt", targetRect.centerX, targetRect.centerY);
      break;
    case "chain":
      await animateChain(actor, filteredTargets, skill);
      for (const hitTarget of filteredTargets) {
        dealDamage(actor, hitTarget, skill, { bonus: 0.06 });
        applyStatus(hitTarget, "hack", 1);
      }
      break;
    case "ultimate":
      await animateUltimate(actor, filteredTargets, skill);
      for (const hitTarget of filteredTargets) {
        dealDamage(actor, hitTarget, skill, { bonus: 0.18, ignoreShield: false, splash: true });
      }
      if (skill.id === "eclipse_rush") {
        actor.focus = 2;
        applyStatus(actor, "focus", 2);
      }
      if (skill.id === "zero_hour") {
        const weakest = battle.units.filter((u) => u.side === "enemy" && u.alive && u.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        if (weakest) applyStatus(weakest, "mark", 2);
      }
      break;
    case "ultimateShield":
      for (const ally of filteredTargets) {
        applyShield(ally, Math.round(actor.atk * skill.power * 1.25 + ally.maxHp * 0.24));
        healUnit(ally, Math.round(ally.maxHp * 0.1));
      }
      spawnFx("shield", targetRect.centerX, targetRect.centerY);
      break;
    default:
      dealDamage(actor, target, skill, {});
      break;
  }
  renderBattleControls();
  syncBattleView();
  checkBattleEnd();
  battle.locked = false;
}

async function animateDash(actor, target, skill) {
  const unitEl = battle.unitRefs.get(actor.id);
  const actorRect = getUnitRect(actor);
  const targetRect = getUnitRect(target);
  const dir = actor.side === "player" ? 1 : -1;
  await moveUnit(actor, 28 * dir, -6, 1.08, 150 / state.speed);
  spawnFx(skill.vfx, targetRect.centerX, targetRect.centerY);
  await wait(90 / state.speed);
  bounceUnit(target, skill.mode === "slash" ? "hurt" : "shake");
  await moveUnit(actor, 0, 0, 1, 180 / state.speed);
}

async function animateChain(actor, targets, skill) {
  const source = getUnitRect(actor);
  for (const target of targets) {
    const targetRect = getUnitRect(target);
    spawnBeam(source, targetRect, "bolt");
    spawnFx(skill.vfx, targetRect.centerX, targetRect.centerY);
    await wait(120 / state.speed);
    bounceUnit(target, "hurt");
  }
}

async function animateUltimate(actor, targets, skill) {
  const source = getUnitRect(actor);
  screenFlash(skill.id === "monarch_judgment" ? "var(--violet)" : "var(--magenta)");
  await moveUnit(actor, actor.side === "player" ? 24 : -24, 0, 1.12, 170 / state.speed);
  spawnFx(skill.vfx, source.centerX, source.centerY);
  for (const target of targets) {
    const rect = getUnitRect(target);
    spawnFx(skill.vfx, rect.centerX, rect.centerY);
    bounceUnit(target, "hurt");
    await wait(70 / state.speed);
  }
  await moveUnit(actor, 0, 0, 1, 180 / state.speed);
}

function dealDamage(actor, target, skill, options = {}) {
  const hitCount = options.multiplier || 1;
  let damage = Math.round(actor.atk * skill.power * hitCount);
  if (actor.focus > 0) damage = Math.round(damage * 1.16);
  if (actor.statuses.hack) damage = Math.round(damage * 1.1);
  if (options.bonus) damage = Math.round(damage * (1 + options.bonus));
  if (battle.synergies.some((syn) => syn.id === "vanguard_chain") && actor.heroId === "rin") damage = Math.round(damage * 1.15);
  if (battle.synergies.some((syn) => syn.id === "aura_bloom") && actor.heroId === "mina" && options.isShield) damage = Math.round(damage * 1.2);
  if (target.statuses.mark) damage = Math.round(damage * 1.12);
  if (target.statuses.hack) damage = Math.round(damage * 1.08);
  if (!options.ignoreShield && target.shield > 0) {
    const blocked = Math.min(target.shield, damage);
    target.shield -= blocked;
    damage -= blocked;
  }
  if (!options.ignoreDefense) {
    damage -= Math.round(target.def * 0.38);
  }
  damage = Math.max(1, damage);
  target.hp = Math.max(0, target.hp - damage);
  applyStatus(target, "bleed", options.bleed || 0);
  markHit(target, "hit");
  spawnPopup(`-${fmt(damage)}`, target, "hit");
  spawnFx(skill.vfx, getUnitRect(target).centerX, getUnitRect(target).centerY);
  if (target.hp <= 0) {
    target.alive = false;
    spawnPopup("KO", target, "hit");
    pushLog(`<strong>${target.name}</strong> was defeated.`);
  } else {
    pushLog(`<strong>${actor.name}</strong> dealt ${fmt(damage)} to <strong>${target.name}</strong>.`);
  }
  updateUnitRow(target);
  return damage;
}

function applyShield(unit, amount) {
  unit.shield = Math.max(0, unit.shield + amount);
  spawnPopup(`+${fmt(amount)} SHIELD`, unit, "shield");
  pushLog(`<strong>${unit.name}</strong> gains shield.`);
  updateUnitRow(unit);
}

function healUnit(unit, amount) {
  const healed = Math.min(amount, unit.maxHp - unit.hp);
  unit.hp = clamp(unit.hp + amount, 0, unit.maxHp);
  spawnPopup(`+${fmt(healed)}`, unit, "heal");
  pushLog(`<strong>${unit.name}</strong> recovered ${fmt(healed)} HP.`);
  updateUnitRow(unit);
}

function applyStatus(unit, status, turns) {
  if (!turns) return;
  unit.statuses[status] = Math.max(unit.statuses[status] || 0, turns);
  updateUnitRow(unit);
}

function updateUnitRow(unit) {
  const el = battle.unitRefs.get(unit.id);
  if (!el) return;
  renderUnitBars(unit, el);
  renderUnitStatuses(unit, el);
  el.classList.toggle("is-active", battle.activeUnitId === unit.id);
  el.classList.toggle("is-targeted", selectedTargetId === unit.id);
}

function moveUnit(unit, dx, dy, scale, duration) {
  return new Promise((resolve) => {
    const el = battle.unitRefs.get(unit.id);
    if (!el) return resolve();
    unit.dx = dx;
    unit.dy = dy;
    unit.scale = scale;
    el.style.transitionDuration = `${duration}ms`;
    syncUnitSprites();
    setTimeout(resolve, duration);
  });
}

function bounceUnit(unit, type) {
  const el = battle.unitRefs.get(unit.id);
  if (!el) return;
  el.classList.remove("is-hurt");
  void el.offsetWidth;
  el.classList.add("is-hurt");
}

function markHit(unit, type) {
  const el = battle.unitRefs.get(unit.id);
  if (!el) return;
  el.classList.toggle("is-targeted", true);
  setTimeout(() => el.classList.toggle("is-targeted", false), 180);
}

function getUnitRect(unit) {
  const el = battle.unitRefs.get(unit.id);
  if (!el) return { centerX: 0, centerY: 0, left: 0, top: 0, width: 0, height: 0 };
  const rect = el.getBoundingClientRect();
  const arenaRect = ui.arena.getBoundingClientRect();
  return {
    left: rect.left - arenaRect.left,
    top: rect.top - arenaRect.top,
    width: rect.width,
    height: rect.height,
    centerX: rect.left - arenaRect.left + rect.width / 2,
    centerY: rect.top - arenaRect.top + rect.height / 2
  };
}

function spawnFx(effect, x, y) {
  const el = document.createElement("div");
  el.className = `fx fx--${effect} is-open`;
  el.style.backgroundPosition = effectPosition(effect);
  el.style.left = `${x - 48}px`;
  el.style.top = `${y - 48}px`;
  ui.battleFx.appendChild(el);
  setTimeout(() => el.remove(), 750 / state.speed);
}

function spawnProjectile(sourceRect, targetRect, skill, variant) {
  const el = document.createElement("div");
  el.className = `projectile ${variant === "slash" ? "projectile--slash" : ""}`;
  const dx = targetRect.centerX - sourceRect.centerX;
  const dy = targetRect.centerY - sourceRect.centerY;
  const angle = Math.atan2(dy, dx);
  const dist = Math.hypot(dx, dy);
  el.style.left = `${sourceRect.centerX}px`;
  el.style.top = `${sourceRect.centerY}px`;
  el.style.transform = `rotate(${angle}rad) scaleX(0.2)`;
  el.style.width = `${dist}px`;
  ui.battleFx.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transition = `transform ${220 / state.speed}ms var(--ease-out), opacity ${220 / state.speed}ms var(--ease-out)`;
    el.style.transform = `rotate(${angle}rad) scaleX(1)`;
    el.style.opacity = "0";
  });
  setTimeout(() => el.remove(), 260 / state.speed);
}

function spawnBeam(sourceRect, targetRect, effect) {
  const beam = document.createElement("div");
  beam.className = "projectile";
  beam.style.background = "var(--cyan)";
  beam.style.boxShadow = "0 0 1rem color-mix(in oklch, var(--cyan) 55%, transparent)";
  const dx = targetRect.centerX - sourceRect.centerX;
  const dy = targetRect.centerY - sourceRect.centerY;
  const angle = Math.atan2(dy, dx);
  const dist = Math.hypot(dx, dy);
  beam.style.left = `${sourceRect.centerX}px`;
  beam.style.top = `${sourceRect.centerY}px`;
  beam.style.width = `${dist}px`;
  beam.style.transform = `rotate(${angle}rad) scaleX(0.3)`;
  ui.battleFx.appendChild(beam);
  requestAnimationFrame(() => {
    beam.style.transition = `transform ${180 / state.speed}ms var(--ease-out), opacity ${180 / state.speed}ms var(--ease-out)`;
    beam.style.transform = `rotate(${angle}rad) scaleX(1)`;
    beam.style.opacity = "0";
  });
  setTimeout(() => beam.remove(), 240 / state.speed);
}

function spawnPopup(text, unit, tone) {
  const popup = document.createElement("div");
  popup.className = `popup is-open is-${tone}`;
  popup.textContent = text;
  const rect = getUnitRect(unit);
  popup.style.left = `${rect.centerX}px`;
  popup.style.top = `${rect.top + rect.height * 0.2}px`;
  ui.battlePopups.appendChild(popup);
  setTimeout(() => popup.remove(), 900 / state.speed);
}

function screenFlash(color) {
  const flash = document.createElement("div");
  flash.style.position = "absolute";
  flash.style.inset = "0";
  flash.style.background = `radial-gradient(circle at center, ${color}, transparent 70%)`;
  flash.style.opacity = "0";
  flash.style.pointerEvents = "none";
  flash.style.zIndex = "8";
  ui.arena.appendChild(flash);
  requestAnimationFrame(() => {
    flash.style.transition = `opacity ${260 / state.speed}ms var(--ease-out)`;
    flash.style.opacity = "0.75";
  });
  setTimeout(() => {
    flash.style.opacity = "0";
    setTimeout(() => flash.remove(), 180);
  }, 320 / state.speed);
}

function onBattleUnitClickHandler(event) {
  const unitEl = event.target.closest(".unit");
  if (!unitEl) return;
  const unit = getUnit(unitEl.dataset.unitId);
  if (!unit) return;
  if (battle?.activeUnitId === unit.id) {
    selectHero(unit.heroId);
    return;
  }
  if (battle?.waitForTarget) onBattleUnitClick(unit.id);
}

ui.arena.addEventListener("click", onBattleUnitClickHandler);
ui.modal.addEventListener("click", (event) => {
  if (event.target === ui.modal) closeModal();
});

function renderBattleFieldEmpty() {
  ui.battleUnits.innerHTML = "";
  ui.battleFx.innerHTML = "";
  ui.battlePopups.innerHTML = "";
  ui.battleTimeline.innerHTML = "";
  ui.skillBar.innerHTML = `<div class="battle-select">Choose a mode to start the fight.</div>`;
  ui.battleSelect.textContent = "No battle";
}

function renderBattleViewForExistingBattle() {
  if (!battle) return renderBattleFieldEmpty();
  ui.battleSelect.textContent = `${battle.mode.toUpperCase()} · Round ${battle.round}`;
  renderBattleUnits();
  renderBattleTimeline();
  renderBattleControls();
}

function renderBattleLogShell() {
  if (!battle) {
    ui.combatLog.innerHTML = `<div class="log-item">No active battle. The next fight will render a real arena, turn order, and animated skills.</div>`;
  }
}

function renderBattleHub() {
  if (!battle) {
    renderBattleFieldEmpty();
    renderBattleLogShell();
    return;
  }
  renderBattleViewForExistingBattle();
  renderBattleLog();
  syncBattleView();
}

function refreshCurrentFocus() {
  if (battle) {
    renderBattleControls();
    renderBattleTimeline();
    renderBattleLog();
    renderBattleUnits();
  } else {
    renderDetailPane();
  }
}

function selectHeroFromCard(heroId) {
  selectHero(heroId);
}

function handleClickThroughPanels(event) {
  const heroCard = event.target.closest("[data-hero-card]");
  if (heroCard && !event.target.closest("[data-action]")) {
    selectHeroFromCard(heroCard.dataset.heroCard);
  }
}

document.addEventListener("click", handleClickThroughPanels);

function renderStageAndFocus() {
  renderStages();
  renderDetailPane();
}

function beginRoundBattleIfNeeded() {
  if (!battle) return;
  syncBattleView();
}

function updateBattleButtons() {
  ui.btnAuto.textContent = state.autoBattle ? "Auto On" : "Auto Off";
  ui.btnSpeed.textContent = `x${state.speed.toFixed(1)}`;
}

function renderGameState() {
  renderTopbar();
  renderRoster();
  renderStages();
  renderBanners();
  renderPvp();
  renderInventory();
  renderDetailPane();
  updateBattleButtons();
  if (!battle) {
    renderBattleHub();
  } else {
    renderBattleViewForExistingBattle();
  }
}

function updateAllPanels() {
  renderGameState();
}

window.ANIME_RIFT = {
  state,
  startCampaign,
  startPvP,
  startTraining,
  renderGameState
};

saveState();
