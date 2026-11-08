/* =====================================================
   DADOS INICIAIS (valem para todo mundo que abrir o site)
   Para deixar suas músicas fixas: use "Exportar" no modo
   Coordenação e cole o conteúdo do arquivo no lugar abaixo.
   Cifra: acordes em cima da letra. Seções entre colchetes,
   ex.: [Refrão].
   ===================================================== */
const DEFAULT_DATA = {
  songs: [
    { id: "exemplo1", title: "Música de exemplo 1", artist: "Troque por sua música", key: "G",
      text: "[Introdução]\nG   D   Em   C\n\n[Estrofe]\nG           D\nAqui entra a primeira linha da letra\nEm          C\nAqui entra a segunda linha da letra\n\n[Refrão]\nC       G\nAqui vai o refrão que todos cantam\nD            G\nTerminando no tom de sol" },
    { id: "exemplo2", title: "Música de exemplo 2", artist: "Outro exemplo", key: "C",
      text: "[Estrofe]\nC        Am\nTexto de teste para a segunda música\nF        G\nTroque pelo conteúdo do repertório\n\n[Refrão]\nF    C/E   Dm   G\nBasta colar a cifra aqui\nC\nE pronto" }
  ],
  lists: [
    { id: "exemplo", name: "Repertório de exemplo", ids: ["exemplo1", "exemplo2"] }
  ]
};

/* ===================== código ===================== */
const STORE = "cantus-v1";
const $ = id => document.getElementById(id);
const SH = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FL = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const CH = /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?[0-9]*(?:\([^)]*\))?(?:\/[A-G][#b]?)?$/;

let D = load();
let canEdit = false, ctx = null, cur = null;
let semi = 0, showC = true, fs = 16, timer = null, speed = 1;

function load() {
  try { const s = localStorage.getItem(STORE); if (s) return JSON.parse(s); } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(D)); toast("Salvo neste aparelho"); }
  catch (e) { toast("Não foi possível salvar"); }
}
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const song = id => D.songs.find(s => s.id === id);
const uid = () => "m" + Date.now().toString(36) + Math.floor(Math.random() * 99);
function toast(t) {
  const e = $("toast"); e.textContent = t; e.style.display = "block";
  clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = "none", 2200);
}
const isDark = () => {
  const t = document.documentElement.getAttribute("data-theme");
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

/* --- transposição --- */
function note(n, s, flat) {
  const i = SH.indexOf(n) >= 0 ? SH.indexOf(n) : FL.indexOf(n);
  return (flat ? FL : SH)[((i + s) % 12 + 12) % 12];
}
function tr(t, s) {
  if (!s) return t;
  const flat = /[A-G]b/.test(t);
  return t.replace(/([A-G][#b]?)/g, m => note(m, s, flat));
}
function shiftLine(l, s) {
  return l.replace(/(\S+)(\s*)/g, (m, t, sp) => {
    const n = tr(t, s), d = n.length - t.length;
    return n + (sp.length ? " ".repeat(Math.max(1, sp.length - d)) : "");
  });
}
const isChord = l => l.trim() && l.trim().split(/\s+/).every(x => CH.test(x));

function renderText() {
  const out = [];
  cur.text.split("\n").forEach(l => {
    if (/^\s*\[.+\]\s*$/.test(l)) { out.push('<span class="sec">' + esc(l.trim().slice(1, -1)) + "</span>"); return; }
    if (isChord(l)) { if (showC) out.push('<span class="c">' + esc(shiftLine(l, semi)) + "</span>"); return; }
    out.push(esc(l));
  });
  $("txt").innerHTML = out.join("\n");
  $("txt").style.setProperty("--fs", fs + "px");
  $("tl").textContent = cur.key ? "Tom " + tr(cur.key, semi) : (semi ? "Transp. " + semi : "");
  $("ch").textContent = showC ? "Só letra" : "Com cifra";
  $("body").className = showC ? "" : "proj";
}

/* --- partes comuns --- */
function setNav(tab) {
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.t === tab));
  $("ed").classList.toggle("on", canEdit);
  $("ed").textContent = canEdit ? "Sair da coordenação" : "Coordenação";
}
const logo = '<img data-logo="full" alt="Cantus · Cifras &amp; Músicas" width="220" height="227">';

/* escolhe a versão da logo (azul ou creme) conforme o tema */
function applyLogos() {
  const dark = isDark();
  document.querySelectorAll("[data-logo]").forEach(img => {
    const k = img.dataset.logo === "emblem" ? (dark ? "emblemCream" : "emblemNavy") : (dark ? "logoCream" : "logoNavy");
    img.src = IMG[k];
  });
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyLogos);

/* --- telas --- */
function home() {
  ctx = null; setNav("songs");
  let h = '<section class="hero">' + logo + "<p>Letras e cifras para cantar juntos.</p></section>" +
    '<input type="search" id="q" placeholder="Buscar música ou artista" aria-label="Buscar música ou artista">';
  if (canEdit) h += '<div class="actions"><button data-a="new">Nova música</button>' +
    '<button class="o" data-a="export">Exportar</button><button class="o" data-a="import">Importar</button>' +
    '<button class="o" data-a="reset">Restaurar original</button></div>';
  h += '<div class="index" id="sl"></div>';
  $("app").innerHTML = h;
  const draw = () => {
    const q = $("q").value.toLowerCase().trim();
    const r = D.songs.filter(s => (s.title + " " + s.artist).toLowerCase().includes(q));
    $("sl").innerHTML = r.length ? r.map(s =>
      '<a class="entry" href="#song-' + s.id + '"><span><b>' + esc(s.title) + "</b><small>" + esc(s.artist) + "</small></span>" +
      '<span class="key">' + esc(s.key) + "</span></a>").join("") :
      '<div class="empty">Nenhuma música encontrada.' + (canEdit ? " Use “Nova música” para cadastrar." : "") + "</div>";
  };
  $("q").oninput = draw; draw();
}

function lists() {
  ctx = null; setNav("lists");
  let h = "<h1>Repertórios</h1><p class=\"lead\">Monte listas de músicas para cada celebração, ensaio ou encontro.</p>";
  if (canEdit) h += '<div class="actions"><button data-a="newList">Novo repertório</button></div>';
  h += '<div class="index">' + (D.lists.length ? D.lists.map(l =>
    '<a class="entry" href="#list-' + l.id + '"><span><b>' + esc(l.name) + "</b><small>" + l.ids.length + " música(s)</small></span></a>").join("")
    : '<div class="empty">Nenhum repertório criado ainda.</div>') + "</div>";
  $("app").innerHTML = h;
}

function listView(l) {
  ctx = l.id; setNav("lists");
  let h = '<div class="nav"><a href="#lists">‹ Repertórios</a></div><h2>' + esc(l.name) + '</h2><p class="meta">' + l.ids.length + " música(s), na ordem de execução</p>";
  h += '<div class="index">' + (l.ids.length ? l.ids.map((id, i) => {
    const s = song(id); if (!s) return "";
    return '<div class="row"><a class="entry" href="#song-' + id + '"><span class="l"><span class="num">' + (i + 1) + '</span><span><b>' + esc(s.title) + "</b><small>" + esc(s.artist) + '</small></span></span><span class="key">' + esc(s.key) + "</span></a>" +
      (canEdit ? '<button class="o" data-a="up" data-i="' + i + '" aria-label="Subir">↑</button><button class="o" data-a="down" data-i="' + i + '" aria-label="Descer">↓</button><button class="o" data-a="rm" data-i="' + i + '" aria-label="Remover">✕</button>' : "") + "</div>";
  }).join("") : '<div class="empty">Repertório vazio.</div>') + "</div>";
  if (canEdit) {
    const opts = D.songs.filter(s => !l.ids.includes(s.id)).map(s => '<option value="' + s.id + '">' + esc(s.title) + "</option>").join("");
    h += '<div style="margin-top:18px"><label for="add">Adicionar música</label><select id="add"><option value="">Escolha uma música</option>' + opts + "</select>" +
      '<div class="actions"><button data-a="ladd">Adicionar ao repertório</button><button class="o" data-a="renList">Renomear</button><button class="d" data-a="delList">Excluir repertório</button></div></div>';
  }
  $("app").innerHTML = h;
}

function songView(s) {
  cur = s; semi = 0; showC = true; setNav(ctx ? "lists" : "songs");
  const L = ctx && D.lists.find(l => l.id === ctx), i = L ? L.ids.indexOf(s.id) : -1;
  const nav = i >= 0 ? '<div class="nav">' + (i > 0 ? '<a href="#song-' + L.ids[i - 1] + '">‹ Anterior</a>' : "<span></span>") +
    "<span>" + esc(L.name) + " · " + (i + 1) + "/" + L.ids.length + "</span>" +
    (i < L.ids.length - 1 ? '<a href="#song-' + L.ids[i + 1] + '">Próxima ›</a>' : "<span></span>") + "</div>" : "";
  $("app").innerHTML = '<div class="bar"><a class="btn o" href="' + (L ? "#list-" + L.id : "#") + '">‹ Voltar</a>' +
    '<button class="o" data-a="fm">A−</button><button class="o" data-a="fp">A+</button>' +
    '<button class="o" data-a="tm">Tom −</button><button class="o" data-a="tp">Tom +</button><span id="tl"></span>' +
    '<span class="sp"></span><button class="o" id="ch" data-a="ch">Só letra</button>' +
    '<button class="o" id="as" data-a="as">Rolar</button><button class="o" data-a="sm">−</button><button class="o" data-a="sp">+</button>' +
    (canEdit ? '<button data-a="edit">Editar</button>' : "") + "</div>" + nav +
    "<h2>" + esc(s.title) + '</h2><div class="meta">' + esc(s.artist) + '</div><div id="body"><pre id="txt"></pre></div>';
  renderText(); window.scrollTo(0, 0);
}

function editView(id) {
  setNav("songs");
  const n = id === "new";
  const s = n ? { title: "", artist: "", key: "", text: "[Estrofe]\nC        G\nEscreva a letra embaixo da cifra\n" } : song(id);
  if (!s) return home();
  $("app").innerHTML = '<div class="nav"><a href="#' + (n ? "" : "song-" + id) + '">‹ Cancelar</a></div><h2>' + (n ? "Nova música" : "Editar música") + "</h2>" +
    '<p class="meta">Cifra em cima da letra. Seções entre colchetes, ex.: [Refrão].</p>' +
    '<label for="f-t">Título</label><input id="f-t" value="' + esc(s.title) + '">' +
    '<label for="f-a">Artista ou origem</label><input id="f-a" value="' + esc(s.artist) + '">' +
    '<label for="f-k">Tom original (ex.: G)</label><input id="f-k" value="' + esc(s.key) + '">' +
    '<label for="f-x">Letra e cifra</label><textarea id="f-x" rows="18" spellcheck="false">' + esc(s.text) + "</textarea>" +
    '<div class="actions"><button data-a="saveSong" data-i="' + id + '">Salvar música</button>' +
    (n ? "" : '<button class="d" data-a="delSong" data-i="' + id + '">Excluir</button>') + "</div>";
}

/* --- rotas (usa o # da URL) --- */
function route() {
  stop();
  const h = location.hash.slice(1); let m;
  if (h === "lists") lists();
  else if ((m = h.match(/^song-(.+)$/)) && song(m[1])) songView(song(m[1]));
  else if ((m = h.match(/^list-(.+)$/)) && D.lists.find(l => l.id === m[1])) listView(D.lists.find(l => l.id === m[1]));
  else if ((m = h.match(/^edit-(.+)$/)) && canEdit) editView(m[1]);
  else home();
  applyLogos();
}

/* --- rolagem automática --- */
function stop() { if (timer) { clearInterval(timer); timer = null; } const b = $("as"); if (b) b.textContent = "Rolar"; }
function play() { timer = setInterval(() => window.scrollBy(0, 1), Math.max(15, 70 / speed)); $("as").textContent = "Parar"; }

/* --- exportar / importar --- */
function exportData() {
  const blob = new Blob([JSON.stringify(D, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "cantus-dados.json";
  document.body.appendChild(a); a.click(); a.remove();
}
$("file").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.songs) || !Array.isArray(d.lists)) throw 0;
      D = d; save(); route();
    } catch (x) { toast("Arquivo inválido"); }
  };
  r.readAsText(f); e.target.value = "";
};

/* --- ações dos botões --- */
function act(a, i) {
  const L = D.lists.find(l => l.id === ctx);
  if (a === "fm") { fs = Math.max(12, fs - 2); renderText(); }
  else if (a === "fp") { fs = Math.min(48, fs + 2); renderText(); }
  else if (a === "tm") { semi--; renderText(); }
  else if (a === "tp") { semi++; renderText(); }
  else if (a === "ch") { showC = !showC; renderText(); }
  else if (a === "as") { timer ? stop() : play(); }
  else if (a === "sm" || a === "sp") { speed = Math.min(4, Math.max(.3, speed + (a === "sp" ? .3 : -.3))); if (timer) { stop(); play(); } }
  else if (a === "th") { document.documentElement.setAttribute("data-theme", isDark() ? "light" : "dark"); applyLogos(); }
  else if (a === "toggleEdit") { canEdit = !canEdit; route(); }
  else if (!canEdit) return;
  else if (a === "new") location.hash = "edit-new";
  else if (a === "edit") location.hash = "edit-" + cur.id;
  else if (a === "saveSong") {
    const t = $("f-t").value.trim(); if (!t) { toast("Dê um título à música"); return; }
    let s = i === "new" ? null : song(i);
    if (!s) { s = { id: uid() }; D.songs.push(s); }
    s.title = t; s.artist = $("f-a").value.trim(); s.key = $("f-k").value.trim();
    s.text = $("f-x").value.replace(/\s+$/, "");
    save(); location.hash = "song-" + s.id;
  }
  else if (a === "delSong") {
    if (!confirm("Excluir esta música?")) return;
    D.songs = D.songs.filter(s => s.id !== i);
    D.lists.forEach(l => l.ids = l.ids.filter(x => x !== i));
    save(); location.hash = ""; route();
  }
  else if (a === "newList") {
    const n = prompt("Nome do repertório (ex.: Missa de domingo, Ensaio, Encontro):"); if (!n) return;
    const l = { id: uid(), name: n.trim(), ids: [] }; D.lists.push(l); save(); location.hash = "list-" + l.id;
  }
  else if (a === "renList") { const n = prompt("Novo nome:", L.name); if (!n) return; L.name = n.trim(); save(); listView(L); }
  else if (a === "delList") { if (!confirm("Excluir este repertório?")) return; D.lists = D.lists.filter(l => l !== L); save(); location.hash = "lists"; }
  else if (a === "ladd") { const v = $("add").value; if (!v) return; L.ids.push(v); save(); listView(L); }
  else if (a === "up" || a === "down") {
    const k = +i, j = a === "up" ? k - 1 : k + 1; if (j < 0 || j >= L.ids.length) return;
    [L.ids[k], L.ids[j]] = [L.ids[j], L.ids[k]]; save(); listView(L);
  }
  else if (a === "rm") { L.ids.splice(+i, 1); save(); listView(L); }
  else if (a === "export") exportData();
  else if (a === "import") $("file").click();
  else if (a === "reset") {
    if (!confirm("Apagar suas alterações e voltar às músicas originais?")) return;
    try { localStorage.removeItem(STORE); } catch (e) {}
    D = JSON.parse(JSON.stringify(DEFAULT_DATA)); route();
  }
}

document.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b) act(b.dataset.a, b.dataset.i); });
window.addEventListener("hashchange", route);
route();