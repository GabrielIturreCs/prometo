import { useEffect, useState } from "react";
import {
  Target, Swords, Camera, Share2, ChevronRight, Plus, Dumbbell, Footprints, Bike, BookOpen, Book, PhoneOff, Moon,
  Apple, WineOff, Leaf, Check, Gamepad2, Trophy, Spade, Mail,
} from "lucide-react";
import type { Address } from "viem";
import type { Session } from "../lib/mera";
import { fmtUsd, toUnits, txUrl, IS_MAINNET } from "../lib/chain";
import * as P from "../lib/pool";
import { Header, Money, Avatar, AmountPicker, ShareSheet, Sheet, Wordmark, go, back } from "../ui";

type Say = (m: string) => void;

const GOALS = [
  { icon: Dumbbell, title: "Gimnasio", rule: "Ir al gimnasio", required: 3, days: 7 },
  { icon: Footprints, title: "Caminar", rule: "10.000 pasos por día", required: 7, days: 7 },
  { icon: Bike, title: "Correr o pedalear", rule: "30 minutos de cardio", required: 4, days: 7 },
  { icon: BookOpen, title: "Estudiar", rule: "1 hora de estudio", required: 5, days: 7 },
  { icon: Book, title: "Leer", rule: "20 páginas por día", required: 7, days: 7 },
  { icon: PhoneOff, title: "Menos redes", rule: "Menos de 2 h de pantalla", required: 7, days: 7 },
  { icon: Moon, title: "Dormir temprano", rule: "En la cama antes de las 00", required: 5, days: 7 },
  { icon: Apple, title: "Comer sano", rule: "Sin comida rápida", required: 7, days: 7 },
  { icon: WineOff, title: "Sin alcohol", rule: "Cero alcohol", required: 7, days: 7 },
  { icon: Leaf, title: "Meditar", rule: "10 minutos por día", required: 7, days: 7 },
];

/* ---------------------------------------------------------------- new promise */
export function NewPromise({ s, say }: { s: Session; say: Say }) {
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [title, setTitle] = useState("");
  const [rule, setRule] = useState("");
  const [required, setRequired] = useState(3);
  const [days, setDays] = useState(7);
  const [stake, setStake] = useState(10);
  const [busy, setBusy] = useState(false);
  const pick = (g?: (typeof GOALS)[number]) => {
    setTitle(g?.title || ""); setRule(g?.rule || ""); setRequired(g?.required || 3); setDays(g?.days || 7); setStep("form");
  };

  if (step === "pick") return <>
    <Header onBack={back} />
    <h1 className="title">Nueva promesa</h1>
    <p className="question">¿Qué vas a cumplir?</p>
    <div style={{ marginTop: 16 }}>
      {GOALS.map((g) => <button key={g.title} className="row" onClick={() => pick(g)}>
        <span className="ic"><g.icon size={22} strokeWidth={2} /></span>
        <span className="txt"><div className="t">{g.title}</div><div className="s">{g.rule}</div></span>
        <ChevronRight className="chev" size={20} />
      </button>)}
      <button className="row" onClick={() => pick()}>
        <span className="ic"><Plus size={22} strokeWidth={2} /></span>
        <span className="txt"><div className="t">Otra cosa</div><div className="s">Escribí tu propia meta</div></span>
        <ChevronRight className="chev" size={20} />
      </button>
    </div>
  </>;

  const create = async () => {
    setBusy(true);
    try {
      if (await P.balanceOf(s.account.address) < toUnits(stake)) { say(`Te falta saldo: necesitás US$ ${stake}`); go("/load"); return; }
      const meta: P.Meta = { title: title.trim(), rule: rule.trim() };
      const { id } = await P.createPool(s, { stakeUnits: toUnits(stake), durationSec: days === 0 ? 300 : days * 86400, mode: 0, required: days === 0 ? 1 : Math.min(required, days), meta });
      try { await P.joinGasless(s, await P.readPool(id), 0); say("Listo. Invitá a tus amigos y tocá Empezar"); }
      catch { say("Promesa creada. Tocá Entrar para poner tu parte"); }
      go(`/p/${id}`);
    } catch (e) { say((e as Error).message.slice(0, 140)); } finally { setBusy(false); }
  };

  return <>
    <Header onBack={() => setStep("pick")} />
    <h1 className="title">Tu promesa</h1>
    <p className="question">¿Cuánto pone cada uno?</p>
    <div className="field"><label className="label" htmlFor="t">Nombre</label><input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Gimnasio de octubre" maxLength={40} /></div>
    <div className="field"><label className="label" htmlFor="r">Regla</label><input id="r" className="input" value={rule} onChange={(e) => setRule(e.target.value)} placeholder="Ir 3 veces por semana" maxLength={60} /></div>
    <div className="field"><span className="label">Cada uno pone</span><AmountPicker value={stake} onChange={setStake} presets={[5, 10, 20, 50]} /></div>
    <div className="field"><span className="label">Duración</span>
      <div className="segment">{[...(IS_MAINNET ? [] : [0]), 1, 7, 14, 30].map((d) => <button key={d} className={days === d ? "on" : ""} onClick={() => { setDays(d); if (required > Math.max(d, 1)) setRequired(Math.max(d, 1)); }}>{d === 0 ? "5 min" : d === 1 ? "1 día" : `${d} días`}</button>)}</div>
      {days === 0 && <p className="note">Solo en la red de prueba: para ver el reparto en minutos.</p>}</div>
    <div className="field"><span className="label">Días que hay que cumplir</span>
      <div className="chips">{[1, 3, 5, 7, 12, 20].filter((v) => v <= Math.max(days, 1)).map((v) => <button key={v} className={`chip${required === v ? " on" : ""}`} onClick={() => setRequired(v)}>{v}</button>)}</div></div>
    <div className="spacer" />
    <button className="cta" disabled={busy || !title.trim() || stake <= 0} onClick={create}>{busy ? "Creando…" : `Prometer con US$ ${stake}`}</button>
    <p className="note" style={{ textAlign: "center" }}>Empieza cuando entren tus amigos. Si todos cumplen, todos recuperan su plata.</p>
  </>;
}

/* ---------------------------------------------------------------- new challenge (match) */
const FORMATS = ["1 vs 1", "2 vs 2", "3 vs 3", "5 vs 5", "Equipos"];
const KINDS = [
  { icon: Gamepad2, label: "Videojuego", ph: "La partida del viernes" },
  { icon: Trophy, label: "Fútbol", ph: "El picado del jueves" },
  { icon: Spade, label: "Cartas", ph: "El truco del domingo" },
  { icon: Swords, label: "Otro", ph: "El desafío" },
];
export function NewMatch({ s, say }: { s: Session; say: Say }) {
  const [kind, setKind] = useState(0);
  const [format, setFormat] = useState("1 vs 1");
  const [title, setTitle] = useState("");
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [stake, setStake] = useState(2);
  const [hours, setHours] = useState(3);
  const [mySide, setMySide] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const one = format === "1 vs 1";
  const create = async () => {
    setBusy(true);
    try {
      if (await P.balanceOf(s.account.address) < toUnits(stake)) { say(`Te falta saldo: necesitás US$ ${stake}`); go("/load"); return; }
      const meta: P.Meta = { title: title.trim() || KINDS[kind].ph, sideA: sideA.trim() || (one ? "Jugador 1" : "Equipo A"), sideB: sideB.trim() || (one ? "Jugador 2" : "Equipo B"), format, goal: KINDS[kind].label };
      const perSide = format === "Equipos" ? 0 : Number(format[0]);
      const { id } = await P.createPool(s, { stakeUnits: toUnits(stake), durationSec: hours * 3600, mode: 1, required: 0, maxPerSide: perSide, meta, feeBps: 300 });
      try { await P.joinGasless(s, await P.readPool(id), mySide); } catch { say("Desafío creado. Elegí tu lado para poner tu parte"); }
      go(`/p/${id}`);
    } catch (e) { say((e as Error).message.slice(0, 140)); } finally { setBusy(false); }
  };
  return <>
    <Header onBack={back} />
    <h1 className="title">Desafío entre amigos</h1>
    <p className="question">Solo ponen los que juegan.</p>
    <div className="field"><span className="label">¿Qué juegan?</span>
      <div className="chips">{KINDS.map((k, i) => <button key={k.label} className={`chip${kind === i ? " on" : ""}`} onClick={() => setKind(i)}><k.icon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />{k.label}</button>)}</div></div>
    <div className="field"><label className="label" htmlFor="mt">Nombre</label><input id="mt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={KINDS[kind].ph} maxLength={40} /></div>
    <div className="field"><span className="label">Formato</span>
      <div className="chips">{FORMATS.map((f) => <button key={f} className={`chip${format === f ? " on" : ""}`} onClick={() => setFormat(f)}>{f}</button>)}</div></div>
    <div className="field" style={{ display: "flex", gap: 10 }}>
      <div style={{ flex: 1 }}><label className="label" htmlFor="a">{one ? "Jugador 1" : "Equipo A"}</label><input id="a" className="input" value={sideA} onChange={(e) => setSideA(e.target.value)} placeholder={one ? "Vos" : "Los de rojo"} maxLength={20} /></div>
      <div style={{ flex: 1 }}><label className="label" htmlFor="b">{one ? "Jugador 2" : "Equipo B"}</label><input id="b" className="input" value={sideB} onChange={(e) => setSideB(e.target.value)} placeholder={one ? "Tu rival" : "Los de azul"} maxLength={20} /></div>
    </div>
    <div className="field"><span className="label">Vos jugás en</span>
      <div className="segment"><button className={mySide === 1 ? "on" : ""} onClick={() => setMySide(1)}>{sideA || (one ? "Jugador 1" : "Equipo A")}</button><button className={mySide === 2 ? "on" : ""} onClick={() => setMySide(2)}>{sideB || (one ? "Jugador 2" : "Equipo B")}</button></div></div>
    <div className="field"><span className="label">Cada jugador pone</span><AmountPicker value={stake} onChange={setStake} presets={[1, 2, 5, 10]} /></div>
    <div className="field"><span className="label">Duración del partido</span>
      <div className="segment">{[1, 3, 24].map((h) => <button key={h} className={hours === h ? "on" : ""} onClick={() => setHours(h)}>{h === 24 ? "1 día" : `${h} h`}</button>)}</div></div>
    <div className="spacer" />
    <button className="cta" disabled={busy || stake <= 0} onClick={create}>{busy ? "Creando…" : `Crear con US$ ${stake}`}</button>
    <p className="note" style={{ textAlign: "center" }}>Gana el resultado que confirman los dos lados. Si no coinciden, se devuelve todo.</p>
  </>;
}

/** "5 min", "3 h", "1 día", "7 días" */
function fmtSpan(sec: number) {
  if (sec < 3600) return `${Math.max(1, Math.ceil(sec / 60))} min`;
  if (sec < 86400) return `${Math.ceil(sec / 3600)} h`;
  const d = Math.ceil(sec / 86400);
  return `${d} ${d === 1 ? "día" : "días"}`;
}

/* ---------------------------------------------------------------- pool detail */
export function PoolScreen({ id, s, say }: { id: bigint; s: Session; say: Say }) {
  const me = s.account.address;
  const [pool, setPool] = useState<P.Pool | null>(null);
  const [people, setPeople] = useState<{ a: Address; m: P.Member }[]>([]);
  const [mine, setMine] = useState<P.Member | null>(null);
  const [meta, setMeta] = useState<P.Meta | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [proofOpen, setProofOpen] = useState<null | "checkin" | "extra">(null);
  const [proofsRev, setProofsRev] = useState(0);
  const [share, setShare] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmWinner, setConfirmWinner] = useState<0 | 1 | 2>(0);

  const load = async () => {
    try {
      const p = await P.readPool(id); setPool(p);
      const list = await P.participantsOf(id);
      const ms = await Promise.all(list.map(async (a) => ({ a, m: await P.readMember(id, a) })));
      await P.fetchNames([...list, p.host]);
      setPeople(ms); setMine(await P.readMember(id, me));
    } catch (e) { say((e as Error).message.slice(0, 120)); }
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [id]);
  useEffect(() => { if (pool && !meta) P.fetchMeta(pool.metaHash).then(setMeta); }, [pool?.metaHash]);

  const act = async (label: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(label);
    try { const r: any = await fn(); if (r?.hash || r?.transactionHash) setLastTx(r.hash || r.transactionHash); say(ok); await load(); }
    catch (e) {
      const m = (e as Error).message;
      say(/AlreadyCheckedInToday/.test(m) ? "Ya cumpliste hoy. ¡Volvé mañana!"
        : /PromiseEnded/.test(m) ? "La promesa ya terminó"
        : /NotEnoughPlayers/.test(m) ? "Falta gente para empezar"
        : /Full/.test(m) ? "Ese equipo ya está completo"
        : /TooEarly/.test(m) ? "Todavía no se puede cerrar"
        : m.slice(0, 140));
    } finally { setBusy(null); }
  };

  if (!pool) return <><Header onBack={back} /><p className="question">Cargando…</p></>;
  const isMatch = pool.mode === 1;
  const isHost = pool.host.toLowerCase() === me.toLowerCase();
  const lobby = pool.status === P.LOBBY, active = pool.status === P.ACTIVE, closed = !lobby && !active;
  const now = Date.now() / 1000;
  const ended = active && now >= pool.endsAt;
  const canJoin = lobby && !mine?.joined;
  const doneToday = active && P.checkedInToday(pool, mine);
  const sideName = (n: number) => n === 1 ? (meta?.sideA || "Lado 1") : (meta?.sideB || "Lado 2");
  const palette = ["var(--data-1)", "var(--data-2)", "var(--data-3)", "var(--data-4)"];
  const pot = pool.stake * BigInt(pool.participants);
  const shareUrl = P.shareLink(id, meta);
  const shareText = `${meta?.title || "Prometo"}: sumate con US$ ${fmtUsd(pool.stake)}.`;
  const hostName = P.displayName(pool.host, me);
  const canStart = isMatch ? pool.countA > 0 && pool.countB > 0 : pool.participants >= 2;
  const durationLabel = fmtSpan(pool.duration);
  // match result state
  const mySide = mine?.side || 0;
  const myReport = mySide === 1 ? pool.reportA : mySide === 2 ? pool.reportB : 0;
  const agreed = pool.reportA !== 0 && pool.reportA === pool.reportB;
  const winnersOf = (side: number) => side === 1 ? pool.countA : pool.countB;

  const statusText = lobby ? "Sala de espera"
    : active ? (isMatch ? (agreed ? "Resultado confirmado" : pool.reportA || pool.reportB ? "Esperando confirmación" : "En juego")
      : ended ? "Lista para repartir" : `En curso · quedan ${fmtSpan(pool.endsAt - now)}`)
    : pool.status === P.SETTLED ? "Repartida" : "Devuelta a todos";

  return <>
    <Header onBack={() => go("/")} right={<>
      {!closed && mine?.joined && <button className="icon-btn" onClick={() => setInviteOpen(true)} aria-label="Invitar amigos"><Mail size={22} strokeWidth={2} /></button>}
      <button className="icon-btn" onClick={() => setShare(true)} aria-label="Compartir"><Share2 size={22} strokeWidth={2} /></button>
    </>} />
    <div style={{ textAlign: "center" }}>
      <div className="hero-ic" style={{ marginTop: 8 }}>{isMatch ? <Swords size={40} strokeWidth={2} /> : <Target size={40} strokeWidth={2} />}</div>
      <p className="question" style={{ marginTop: 0 }}>{meta?.title || `Promesa #${id}`}{isMatch && meta?.format ? ` · ${meta.format}` : ""}</p>
      <Money units={pot} center />
      <span className={`status${pool.status === P.SETTLED ? " ok" : ""}`}>{statusText}</span>
    </div>

    {lobby && <div style={{ marginTop: 24 }}>
      <div className="kv"><span className="k">Cada uno pone</span><span className="v">US$ {fmtUsd(pool.stake)}</span></div>
      <div className="kv"><span className="k">Dura</span><span className="v">{durationLabel} desde que empieza</span></div>
      {!isMatch && <div className="kv"><span className="k">Hay que cumplir</span><span className="v">{pool.duration < 86400 ? "1 vez" : `${pool.required} ${pool.required === 1 ? "día" : "días"}`}</span></div>}
      <div className="kv"><span className="k">Organiza</span><span className="v">{hostName}</span></div>
    </div>}

    {!isMatch && meta?.rule && !lobby && <><h2 className="section-h">Regla</h2><p className="question" style={{ marginTop: 0 }}>{meta.rule} · {pool.required} {pool.required === 1 ? "día" : "días"}</p></>}

    {!isMatch && <>
      <h2 className="section-h">{lobby ? `Adentro · ${people.length}` : "Personas"}</h2>
      {!lobby && people.length > 1 && <div className="bar">{people.map((x, i) => <i key={x.a} style={{ width: `${100 / people.length}%`, background: palette[Math.min(i, 3)], opacity: Math.min(1, 0.35 + x.m.checkins / Math.max(1, pool.required)) }} />)}</div>}
      {people.length === 0 && <p className="question">Todavía no entró nadie.</p>}
      {people.map((x, i) => <div key={x.a} className="row" style={{ cursor: "default" }}>
        <Avatar name={P.displayName(x.a)} />
        <span className="txt"><div className="t">{P.displayName(x.a, me)}{x.a.toLowerCase() === pool.host.toLowerCase() ? " · organiza" : ""}</div>
          <div className="s">{lobby ? "Puso su plata" : `${x.m.checkins} de ${pool.required}${x.m.checkins >= pool.required ? " · cumplió" : P.checkedInToday(pool, x.m) ? " · cumplió hoy" : ""}`}</div></span>
        {!lobby && <span className="swatch" style={{ background: palette[Math.min(i, 3)] }} />}
        <span className="val">US$ {fmtUsd(pool.stake)}</span>
      </div>)}
    </>}

    {isMatch && [1, 2].map((side) => {
      const list = people.filter((x) => x.m.side === side);
      const report = side === 1 ? pool.reportA : pool.reportB;
      return <div key={side}>
        <h2 className="section-h">{sideName(side)}{pool.maxPerSide ? ` · ${list.length}/${pool.maxPerSide}` : ""}</h2>
        {active && <p className="question" style={{ marginTop: -4, fontSize: 15 }}>{report ? `Dice que ganó ${sideName(report)}` : "Todavía no respondió"}</p>}
        {list.length === 0 && <p className="question" style={{ marginTop: 0 }}>Nadie todavía</p>}
        {list.map((x) => <div key={x.a} className="row" style={{ cursor: "default" }}>
          <Avatar name={P.displayName(x.a)} /><span className="txt"><div className="t">{P.displayName(x.a, me)}</div><div className="s">Puso US$ {fmtUsd(pool.stake)}</div></span>
        </div>)}
        {active && !agreed && <p className="note">Si gana {sideName(side)}, cada jugador cobra US$ {fmtUsd(P.payoutPerWinner(pool, winnersOf(side)))}</p>}
      </div>;
    })}

    {!isMatch && !lobby && <Proofs poolId={id} me={me} refresh={proofsRev} canAdd={active && !!mine?.joined && !ended} onAdd={() => setProofOpen(doneToday ? "extra" : "checkin")} />}

    {lastTx && <p className="note"><a href={txUrl(lastTx)} target="_blank" rel="noreferrer">Ver comprobante</a></p>}
    <div className="spacer" />

    {/* ---------- waiting room ---------- */}
    {canJoin && !isMatch &&
      <button className="cta" disabled={!!busy} onClick={() => act("join", () => P.joinGasless(s, pool, 0), "¡Adentro! Esperá a que empiece")}>{busy === "join" ? "Entrando…" : `Entrar con US$ ${fmtUsd(pool.stake)}`}</button>}
    {canJoin && isMatch && <>
      <button className="cta" disabled={!!busy || (!!pool.maxPerSide && pool.countA >= pool.maxPerSide)} onClick={() => act("join", () => P.joinGasless(s, pool, 1), `Estás en ${sideName(1)}`)}>{`Jugar en ${sideName(1)}`}</button>
      <button className="tonal" disabled={!!busy || (!!pool.maxPerSide && pool.countB >= pool.maxPerSide)} onClick={() => act("join", () => P.joinGasless(s, pool, 2), `Estás en ${sideName(2)}`)}>{`Jugar en ${sideName(2)}`}</button>
    </>}
    {lobby && mine?.joined && isHost && <>
      <button className="cta" disabled={!!busy || !canStart} onClick={() => act("start", () => P.startPool(s, id), isMatch ? "¡A jugar!" : "¡Arrancó! Desde hoy cuenta")}>
        {busy === "start" ? "Empezando…" : canStart ? "Empezar" : isMatch ? "Falta un rival" : "Esperando a tus amigos"}</button>
      <button className="tonal" onClick={() => setInviteOpen(true)}>Invitar amigos</button>
      <button className="textbtn danger" disabled={!!busy} onClick={() => act("cancel", () => P.cancelPool(s, id), "Cancelada: se devolvió la plata")}>Cancelar y devolver la plata</button>
    </>}
    {lobby && mine?.joined && !isHost && <>
      <div style={{ textAlign: "center", padding: "12px 0" }}><span className="status">Esperando que {hostName} empiece</span></div>
      <button className="tonal" onClick={() => setInviteOpen(true)}>Invitar amigos</button>
      <button className="textbtn" disabled={!!busy} onClick={() => act("leave", () => P.leavePool(s, id), "Saliste y recuperaste tu plata")}>Salir y recuperar mi plata</button>
    </>}

    {/* ---------- running promise ---------- */}
    {active && !isMatch && mine?.joined && !ended && (doneToday
      ? <div style={{ textAlign: "center", padding: "16px 0" }}><span className="status ok">Cumpliste hoy · volvé mañana</span></div>
      : <button className="cta" disabled={!!busy} onClick={() => setProofOpen("checkin")}>{busy === "check" ? "Guardando…" : "Cumplí hoy"}</button>)}

    {/* ---------- running match: report / accept the result ---------- */}
    {active && isMatch && mine?.joined && !agreed && <>
      <p className="question" style={{ textAlign: "center" }}>{myReport ? `Tu equipo dijo: ganó ${sideName(myReport)}` : "¿Quién ganó?"}</p>
      {[mySide, mySide === 1 ? 2 : 1].map((side, i) => side !== myReport &&
        <button key={side} className={i === 0 && !myReport ? "cta" : "tonal"} disabled={!!busy} onClick={() => setConfirmWinner(side as 1 | 2)}>
          {myReport ? `Cambiar: ganó ${sideName(side)}` : side === mySide ? `Ganamos (${sideName(side)})` : `Perdimos: ganó ${sideName(side)}`}
        </button>)}
    </>}

    {active && ((!isMatch && ended) || (isMatch && agreed)) &&
      <button className="cta" disabled={!!busy} onClick={() => act("settle", () => P.settle(id), "¡Listo! La plata ya se repartió")}>{busy === "settle" ? "Repartiendo…" : "Repartir el pozo"}</button>}
    {active && isMatch && !agreed && (pool.reportA || pool.reportB) && now >= (pool.reportA && pool.reportB ? pool.lastReportAt : pool.firstReportAt) + 86400 &&
      <button className="tonal" disabled={!!busy} onClick={() => act("settle", () => P.settle(id), "Listo: se resolvió el desafío")}>Cerrar el desafío</button>}
    {closed && <div className="signature"><Wordmark size={26} muted /></div>}

    {confirmWinner !== 0 && <Sheet onClose={() => setConfirmWinner(0)}>
      <div style={{ textAlign: "center" }}>
        <div className="hero-ic"><Trophy size={40} strokeWidth={2} /></div>
        <h1 className="title center">¿Ganó {sideName(confirmWinner)}?</h1>
        <p className="question" style={{ textAlign: "center" }}>Si el otro lado confirma lo mismo, cada jugador de {sideName(confirmWinner)} cobra US$ {fmtUsd(P.payoutPerWinner(pool, winnersOf(confirmWinner)))}.</p>
      </div>
      <p className="note" style={{ textAlign: "center" }}>Podés corregirlo mientras el otro lado no confirme. Si no se ponen de acuerdo en 24 h, se devuelve todo.</p>
      <div className="spacer" />
      <button className="cta" disabled={!!busy} onClick={() => { const w = confirmWinner; setConfirmWinner(0); act("rep", () => P.reportResult(s, id, w), "Resultado enviado"); }}>Sí, ganó {sideName(confirmWinner)}</button>
      <button className="textbtn" onClick={() => setConfirmWinner(0)}>Volver</button>
    </Sheet>}

    {proofOpen && <ProofSheet poolId={id} me={me} extra={proofOpen === "extra"} goal={meta ? `${meta.title}: ${meta.rule || ""}` : `Promesa #${id}`}
      onClose={() => setProofOpen(null)}
      onDone={(proofHash) => {
        const extra = proofOpen === "extra";
        setProofOpen(null);
        if (extra) { say("Foto agregada"); setProofsRev((n) => n + 1); return; }
        act("check", () => P.checkIn(s, id, proofHash), "¡Sumaste un día más!").then(() => setProofsRev((n) => n + 1));
      }} />}
    {share && <ShareSheet url={shareUrl} text={shareText} onClose={() => setShare(false)} say={say} />}
    {inviteOpen && <InviteSheet s={s} poolId={id} already={people.map((x) => x.a.toLowerCase())} onClose={() => setInviteOpen(false)} onShare={() => { setInviteOpen(false); setShare(true); }} say={say} />}
  </>;
}

/* ---------------------------------------------------------------- invite friends (in-app) */
function InviteSheet({ s, poolId, already, onClose, onShare, say }: { s: Session; poolId: bigint; already: string[]; onClose: () => void; onShare: () => void; say: Say }) {
  const [friends, setFriends] = useState<string[] | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { P.listFriends(s.account.address).then(async (f) => { await P.fetchNames(f); setFriends(f.filter((x) => !already.includes(x.toLowerCase()))); }); }, []);
  const toggle = (a: string) => setSel((v) => v.includes(a) ? v.filter((x) => x !== a) : [...v, a]);
  return <Sheet onClose={onClose}>
    <h1 className="title">Invitar amigos</h1>
    <p className="question">Les llega en la app</p>
    {friends === null && <p className="question">Cargando…</p>}
    {friends && friends.length === 0 && <p className="question" style={{ marginTop: 24 }}>Todavía no tenés amigos en Prometo. Mandales el link.</p>}
    <div style={{ marginTop: 16 }}>
      {friends?.map((f) => <button key={f} className="row" onClick={() => toggle(f)}>
        <Avatar name={P.displayName(f)} />
        <span className="txt"><div className="t">{P.displayName(f)}</div></span>
        <span className="ic" style={{ width: 28, height: 28, background: sel.includes(f) ? "var(--accent-500)" : "var(--surface-subtle)", color: "#fff" }}>{sel.includes(f) && <Check size={16} strokeWidth={3} />}</span>
      </button>)}
    </div>
    <div className="spacer" />
    {friends && friends.length > 0 && <button className="cta" disabled={busy || sel.length === 0} onClick={async () => {
      setBusy(true);
      try { await P.inviteFriends(s, poolId, sel); say(sel.length === 1 ? "Invitación enviada" : `${sel.length} invitaciones enviadas`); onClose(); }
      catch (e) { say((e as Error).message); } finally { setBusy(false); }
    }}>{busy ? "Enviando…" : sel.length ? `Invitar a ${sel.length}` : "Elegí amigos"}</button>}
    <button className="textbtn" onClick={onShare}>Mandar link por WhatsApp</button>
  </Sheet>;
}

/* ---------------------------------------------------------------- proof (photo) */
function ProofSheet({ poolId, me, goal, extra, onClose, onDone }: { poolId: bigint; me: string; goal: string; extra: boolean; onClose: () => void; onDone: (proofHash: `0x${string}`) => void }) {
  const [img, setImg] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ sha: `0x${string}`; verdict: P.Verdict; reason?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onFile = (f?: File) => {
    if (!f) return;
    setResult(null);
    const r = new FileReader();
    r.onload = () => {
      // downscale: smaller upload, faster AI review
      const im = new Image(); im.onload = () => {
        const c = document.createElement("canvas"); const k = Math.min(1, 1024 / Math.max(im.width, im.height));
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
        setImg(c.toDataURL("image/jpeg", 0.82));
      }; im.src = r.result as string;
    };
    r.readAsDataURL(f);
  };
  const upload = async () => {
    setBusy(true); setErr(null);
    try { setResult(await P.uploadProof({ poolId, address: me, goal, note, imageDataUrl: img })); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return <Sheet onClose={onClose}>
    <h1 className="title">{extra ? "Otra foto" : "Mostrá que cumpliste"}</h1>
    <p className="question">{extra ? "Sumala a tus pruebas de hoy." : "Una foto alcanza."}</p>
    <label style={{ display: "block", margin: "24px 0 0", cursor: "pointer" }}>
      {img
        ? <img src={img} alt="Tu prueba" style={{ width: "100%", maxHeight: "42vh", objectFit: "contain", borderRadius: 22, display: "block", background: "var(--surface-subtle)" }} />
        : <span className="hero-ic" style={{ display: "flex", margin: "16px auto" }}><Camera size={36} strokeWidth={2} /></span>}
      <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {!img && <p className="question" style={{ textAlign: "center", marginTop: 0 }}>Sacá o elegí una foto</p>}
    </label>
    <div className="field"><label className="label" htmlFor="nt">Nota</label><input id="nt" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Piernas y cardio" maxLength={120} /></div>
    {result && <p className="question" style={{ textAlign: "center" }}>
      {result.verdict === "ok" ? <span className="status ok">Se ve bien</span> : result.verdict === "doubt" ? <span className="status bad">Tus amigos la van a revisar</span> : <span className="status">Sin revisión automática</span>}
      {result.reason ? <><br /><span style={{ fontSize: 14 }}>{result.reason}</span></> : null}
    </p>}
    {err && <p className="question loss" style={{ textAlign: "center" }}>{err}</p>}
    <div className="spacer" />
    {!result
      ? <button className="cta" disabled={busy || (!img && !note.trim())} onClick={upload}>{busy ? "Revisando…" : "Subir prueba"}</button>
      : <button className="cta" onClick={() => onDone(result.sha)}>Guardar</button>}
    {img && !result && <label className="textbtn" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>Cambiar foto<input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>}
    <p className="note" style={{ textAlign: "center" }}>Tus amigos tienen 24 h para objetar.</p>
  </Sheet>;
}

/* ---------------------------------------------------------------- proofs gallery */
function Proofs({ poolId, me, refresh, canAdd, onAdd }: { poolId: bigint; me: string; refresh: number; canAdd: boolean; onAdd: () => void }) {
  const [items, setItems] = useState<P.Proof[]>([]);
  useEffect(() => { P.listProofs(poolId).then(setItems); }, [poolId, refresh]);
  if (!items.length && !canAdd) return null;
  const tile = { width: "100%", aspectRatio: "1", borderRadius: 16, display: "block", background: "var(--surface-subtle)" } as const;
  return <>
    <h2 className="section-h">Pruebas</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {canAdd && <button onClick={onAdd} aria-label="Agregar foto" style={{ ...tile, border: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--ink-950)", fontWeight: 600, fontSize: 13 }}>
        <Camera size={26} strokeWidth={2} />Agregar
      </button>}
      {items.slice(0, canAdd ? 8 : 9).map((p) => <figure key={p.key} style={{ margin: 0 }}>
        {p.isImage
          ? <img src={P.proofImageUrl(p.key)} alt={p.note || "Prueba"} loading="lazy" style={{ ...tile, objectFit: "cover" }} />
          : <div style={{ ...tile, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, fontSize: 13, color: "var(--ink-700)", textAlign: "center" }}>{p.note}</div>}
        <figcaption style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 4 }}>{P.displayName(p.address, me)}{p.verdict === "doubt" ? " · revisar" : ""}</figcaption>
      </figure>)}
    </div>
  </>;
}
