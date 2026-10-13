import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, X, Plus, Trophy, Target, Check, Camera, Share2, Users, Home as HomeIcon, User, ChevronRight, Swords, Dumbbell, BookOpen, Footprints, Coins } from "lucide-react";
import type { Address } from "viem";
import { signIn, signUp, savedCredential, forgetCredential, explainMeraError, signInTestMode, testModeAvailable, type Session } from "./lib/mera";
import { fmtUsd, toUnits, txUrl, IS_MAINNET } from "./lib/chain";
import * as P from "./lib/pool";

/* ---------------------------------------------------------------- tiny router */
function useRoute() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => { const f = () => setHash(location.hash || "#/"); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return hash.slice(1);
}
const go = (path: string) => { location.hash = path; };

/* ---------------------------------------------------------------- helpers */
function Money({ units, center }: { units: bigint; center?: boolean }) {
  const [int, dec] = fmtUsd(units).split(",");
  return <div className={`amount${center ? " center" : ""}`}>US$ {int}{dec && dec !== "00" ? <sup>{dec.padEnd(2, "0")}</sup> : null}</div>;
}
function Header({ back, close, right }: { back?: () => void; close?: () => void; right?: ReactNode }) {
  return <div className="header">
    {back ? <button className="icon-btn" onClick={back} aria-label="Atrás"><ArrowLeft size={24} strokeWidth={2} /></button>
      : close ? <button className="icon-btn" onClick={close} aria-label="Cerrar"><X size={24} strokeWidth={2} /></button> : <span />}
    <span>{right}</span>
  </div>;
}
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const daysLeft = (ts: number) => Math.max(0, Math.ceil((ts * 1000 - Date.now()) / 86_400_000));
function Toast({ msg }: { msg: string | null }) { return msg ? <div className="toast" role="status">{msg}</div> : null; }

const GOALS = [
  { icon: Dumbbell, title: "Gimnasio", rule: "Ir al gimnasio 3 veces por semana", required: 12, days: 28 },
  { icon: Footprints, title: "Caminar", rule: "10.000 pasos por día", required: 7, days: 7 },
  { icon: BookOpen, title: "Estudiar", rule: "1 hora de estudio por día", required: 10, days: 14 },
];

/* ---------------------------------------------------------------- app */
export default function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200); };
  useEffect(() => { P.metaFromUrl(); }, []);

  if (!session) return <><Welcome onSession={setSession} say={say} />{<Toast msg={toast} />}</>;

  let screen: ReactNode;
  if (route.startsWith("/p/")) screen = <PoolScreen id={BigInt(route.split("/")[2])} s={session} say={say} />;
  else if (route === "/new") screen = <NewPromise s={session} say={say} />;
  else if (route === "/new-match") screen = <NewMatch s={session} say={say} />;
  else if (route === "/me") screen = <Me s={session} onLogout={() => { session.end(); setSession(null); }} say={say} />;
  else screen = <HomeScreen s={session} say={say} />;

  const tab = route === "/me" ? "me" : "home";
  const showNav = route === "/" || route === "/me" || route === "";
  return <>
    <div className={`screen${showNav ? " with-nav" : ""}`}>
      {screen}
      {showNav && <nav className="nav">
        <button className={tab === "home" ? "on" : ""} onClick={() => go("/")}><HomeIcon size={22} strokeWidth={2} />Inicio</button>
        <button onClick={() => go("/new")}><Plus size={22} strokeWidth={2} />Nueva</button>
        <button className={tab === "me" ? "on" : ""} onClick={() => go("/me")}><User size={22} strokeWidth={2} />Yo</button>
      </nav>}
    </div>
    <Toast msg={toast} />
  </>;
}

/* ---------------------------------------------------------------- welcome / passkey */
function Welcome({ onSession, say }: { onSession: (s: Session) => void; say: (m: string) => void }) {
  const known = !!savedCredential();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<Session>) => {
    setBusy(true);
    try { onSession(await fn()); } catch (e) { say(explainMeraError(e)); } finally { setBusy(false); }
  };
  return <div className="screen">
    <Header />
    <div className="hero-ic"><Target size={40} strokeWidth={2} /></div>
    <h1 className="title center">Prometo</h1>
    <p className="question" style={{ textAlign: "center" }}>Ponele plata a tu palabra.</p>
    <div style={{ marginTop: 32 }}>
      <div className="row" style={{ cursor: "default", minHeight: 56 }}><span className="ic"><Users size={20} strokeWidth={2} /></span><span className="t">Con tus amigos o tu equipo</span></div>
      <div className="row" style={{ cursor: "default", minHeight: 56 }}><span className="ic"><Trophy size={20} strokeWidth={2} /></span><span className="t">El que cumple, cobra</span></div>
    </div>
    <div className="spacer" />
    {!known && <div className="field"><label className="label" htmlFor="n">¿Cómo te llamás?</label><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoComplete="nickname" /></div>}
    {known
      ? <button className="cta" disabled={busy} onClick={() => run(signIn)}>{busy ? "Abriendo…" : "Entrar con tu huella"}</button>
      : <button className="cta" disabled={busy || !name.trim()} onClick={() => run(async () => { const s = await signUp(name.trim()); P.setMyName(s, name).catch(() => {}); return s; })}>{busy ? "Creando…" : "Crear cuenta con tu huella"}</button>}
    {known
      ? <button className="textbtn" onClick={() => { forgetCredential(); location.reload(); }}>Usar otra cuenta</button>
      : <button className="textbtn" onClick={() => run(signIn)}>Ya tengo cuenta</button>}
    {testModeAvailable && <button className="textbtn" onClick={() => { const s = signInTestMode(); if (name.trim()) P.setMyName(s, name).catch(() => {}); onSession(s); }}>Probar sin huella</button>}
    <p className="note" style={{ textAlign: "center" }}>Sin contraseñas. Tu cuenta vive en tu huella o Face ID.</p>
  </div>;
}

/* ---------------------------------------------------------------- home */
function HomeScreen({ s, say }: { s: Session; say: (m: string) => void }) {
  const me = s.account.address;
  const [bal, setBal] = useState<bigint>(0n);
  const [pools, setPools] = useState<P.Pool[] | null>(null);
  const load = async () => {
    try {
      setBal(await P.balanceOf(me));
      const ps = await P.myPools(me);
      await Promise.all(ps.map((p) => P.fetchMeta(p.metaHash)));
      setPools(ps);
    } catch (e) { say((e as Error).message); setPools([]); }
  };
  useEffect(() => { load(); }, []);
  const active = (pools || []).filter((p) => p.status === 0);
  const done = (pools || []).filter((p) => p.status !== 0);
  return <>
    <Header right={<button className="icon-btn" onClick={() => go("/me")} aria-label="Perfil"><User size={22} strokeWidth={2} /></button>} />
    <p className="question" style={{ marginTop: 0 }}>Tu saldo</p>
    <Money units={bal} />
    {!IS_MAINNET && bal === 0n && <button className="tonal" onClick={async () => { try { await P.faucet(s, toUnits(50)); say("Te cargamos US$ 50 de prueba"); load(); } catch (e) { say((e as Error).message); } }}>Cargar US$ 50 de prueba</button>}

    <div className="tiles">
      <button className="tile" onClick={() => go("/new")}><span className="ic"><Target size={22} strokeWidth={2} /></span>Nueva promesa</button>
      <button className="tile" onClick={() => go("/new-match")}><span className="ic"><Swords size={22} strokeWidth={2} /></span>Partida con pozo</button>
    </div>

    <h2 className="section-h">En curso</h2>
    {pools === null && <p className="question">Cargando…</p>}
    {pools && active.length === 0 && <p className="question">Todavía no prometiste nada.</p>}
    {active.map((p) => <PoolRow key={p.id.toString()} p={p} />)}
    {done.length > 0 && <><h2 className="section-h">Terminadas</h2>{done.map((p) => <PoolRow key={p.id.toString()} p={p} />)}</>}
    <div style={{ height: 24 }} />
  </>;
}
function PoolRow({ p }: { p: P.Pool }) {
  const meta = P.metaFor(p.metaHash);
  const Icon = p.mode === 1 ? Swords : Target;
  const sub = p.status === 0 ? `${p.participants} personas · ${daysLeft(p.endsAt)} días` : p.status === 1 ? "Cerrada" : "Devuelta";
  return <button className="row" onClick={() => go(`/p/${p.id}`)}>
    <span className="ic"><Icon size={22} strokeWidth={2} /></span>
    <span className="txt"><div className="t">{meta?.title || `Promesa #${p.id}`}</div><div className="s">{sub}</div></span>
    <span className="val">US$ {fmtUsd(p.stake * BigInt(p.participants))}</span>
    <ChevronRight className="chev" size={20} />
  </button>;
}

/* ---------------------------------------------------------------- new promise */
function NewPromise({ s, say }: { s: Session; say: (m: string) => void }) {
  const [goalIdx, setGoalIdx] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [rule, setRule] = useState("");
  const [required, setRequired] = useState(3);
  const [days, setDays] = useState(7);
  const [stake, setStake] = useState(10);
  const [busy, setBusy] = useState(false);
  const pick = (i: number) => { const g = GOALS[i]; setGoalIdx(i); setTitle(g.title); setRule(g.rule); setRequired(g.required); setDays(g.days); };

  if (goalIdx === null) return <>
    <Header back={() => go("/")} />
    <h1 className="title">Nueva promesa</h1>
    <p className="question">¿Qué vas a cumplir?</p>
    <div style={{ marginTop: 16 }}>
      {GOALS.map((g, i) => <button key={g.title} className="row" onClick={() => pick(i)}>
        <span className="ic"><g.icon size={22} strokeWidth={2} /></span>
        <span className="txt"><div className="t">{g.title}</div><div className="s">{g.rule}</div></span>
        <ChevronRight className="chev" size={20} />
      </button>)}
      <button className="row" onClick={() => { setGoalIdx(-1); setTitle(""); setRule(""); }}>
        <span className="ic"><Plus size={22} strokeWidth={2} /></span>
        <span className="txt"><div className="t">Otra cosa</div><div className="s">Escribí tu propia meta</div></span>
        <ChevronRight className="chev" size={20} />
      </button>
    </div>
  </>;

  const create = async () => {
    setBusy(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const meta: P.Meta = { title, rule };
      const { id } = await P.createPool(s, { stakeUnits: toUnits(stake), joinUntil: now + Math.min(days * 86400, 2 * 86400), endsAt: now + days * 86400, mode: 0, required, meta });
      // the creator puts in their own stake right away: one tap, not two
      try { await P.joinGasless(s, await P.readPool(id), 0); } catch (e) { say(`Promesa creada. ${(e as Error).message}`); }
      go(`/p/${id}`);
    } catch (e) { say((e as Error).message); } finally { setBusy(false); }
  };

  return <>
    <Header back={() => setGoalIdx(null)} />
    <h1 className="title">Tu promesa</h1>
    <p className="question">¿Cuánto pone cada uno?</p>
    <div className="field"><label className="label" htmlFor="t">Nombre</label><input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Gimnasio de octubre" /></div>
    <div className="field"><label className="label" htmlFor="r">Regla</label><input id="r" className="input" value={rule} onChange={(e) => setRule(e.target.value)} placeholder="Ir 3 veces por semana" /></div>
    <div className="field"><span className="label">Cada uno pone</span>
      <div className="chips">{[5, 10, 20, 50].map((v) => <button key={v} className={`chip${stake === v ? " on" : ""}`} onClick={() => setStake(v)}>US$ {v}</button>)}</div></div>
    <div className="field"><span className="label">Duración</span>
      <div className="segment">{[1, 7, 14, 28].map((d) => <button key={d} className={days === d ? "on" : ""} onClick={() => setDays(d)}>{d === 1 ? "1 día" : `${d} días`}</button>)}</div></div>
    <div className="field"><span className="label">Veces que hay que cumplir</span>
      <div className="chips">{[1, 3, 7, 12].map((v) => <button key={v} className={`chip${required === v ? " on" : ""}`} onClick={() => setRequired(v)}>{v}</button>)}</div></div>
    <div className="spacer" />
    <button className="cta" disabled={busy || !title.trim()} onClick={create}>{busy ? "Creando…" : `Prometer con US$ ${stake}`}</button>
    <p className="note" style={{ textAlign: "center" }}>Si todos cumplen, todos recuperan su plata.</p>
  </>;
}

/* ---------------------------------------------------------------- new match */
function NewMatch({ s, say }: { s: Session; say: (m: string) => void }) {
  const [title, setTitle] = useState("");
  const [sideA, setSideA] = useState("Equipo A");
  const [sideB, setSideB] = useState("Equipo B");
  const [stake, setStake] = useState(1);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const meta: P.Meta = { title, sideA, sideB };
      const { id } = await P.createPool(s, { stakeUnits: toUnits(stake), joinUntil: now + 6 * 3600, endsAt: now + 6 * 3600 + 60, mode: 1, required: 0, meta, feeBps: 300 });
      go(`/p/${id}`);
    } catch (e) { say((e as Error).message); } finally { setBusy(false); }
  };
  return <>
    <Header back={() => go("/")} />
    <h1 className="title">Partida con pozo</h1>
    <p className="question">Solo ponen los que juegan.</p>
    <div className="field"><label className="label" htmlFor="mt">Partida</label><input id="mt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dota 2 · viernes 22 h" /></div>
    <div className="field"><label className="label" htmlFor="a">Equipo 1</label><input id="a" className="input" value={sideA} onChange={(e) => setSideA(e.target.value)} /></div>
    <div className="field"><label className="label" htmlFor="b">Equipo 2</label><input id="b" className="input" value={sideB} onChange={(e) => setSideB(e.target.value)} /></div>
    <div className="field"><span className="label">Cada jugador pone</span>
      <div className="chips">{[1, 2, 5, 10].map((v) => <button key={v} className={`chip${stake === v ? " on" : ""}`} onClick={() => setStake(v)}>US$ {v}</button>)}</div></div>
    <div className="spacer" />
    <button className="cta" disabled={busy || !title.trim()} onClick={create}>{busy ? "Creando…" : "Crear partida"}</button>
    <p className="note" style={{ textAlign: "center" }}>Gana el equipo que ambos capitanes confirman.</p>
  </>;
}

/* ---------------------------------------------------------------- pool detail */
function PoolScreen({ id, s, say }: { id: bigint; s: Session; say: (m: string) => void }) {
  const me = s.account.address;
  const [pool, setPool] = useState<P.Pool | null>(null);
  const [people, setPeople] = useState<{ a: Address; m: P.Member }[]>([]);
  const [mine, setMine] = useState<P.Member | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  const load = async () => {
    try {
      const p = await P.readPool(id); setPool(p);
      const list = await P.participantsOf(id);
      const ms = await Promise.all(list.map(async (a) => ({ a, m: await P.readMember(id, a) })));
      await P.fetchNames(list);
      setPeople(ms); setMine(await P.readMember(id, me));
    } catch (e) { say((e as Error).message); }
  };
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [id]);
  const [meta, setMeta] = useState<P.Meta | undefined>(undefined);
  useEffect(() => { if (pool && !meta) P.fetchMeta(pool.metaHash).then(setMeta); }, [pool?.metaHash]);
  const pot = pool ? pool.stake * BigInt(pool.participants) : 0n;
  const now = Date.now() / 1000;

  const act = async (label: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(label);
    try { const r: any = await fn(); if (r?.hash || r?.transactionHash) setLastTx(r.hash || r.transactionHash); say(ok); await load(); }
    catch (e) { say((e as Error).message.slice(0, 140)); } finally { setBusy(null); }
  };
  const share = async () => {
    const url = P.shareLink(id, meta);
    const text = `${meta?.title || "Prometo"}: poné US$ ${fmtUsd(pool!.stake)} y cumplí. ${url}`;
    if (navigator.share) { try { await navigator.share({ title: "Prometo", text, url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(url); say("Link copiado");
  };

  if (!pool) return <><Header back={() => go("/")} /><p className="question">Cargando…</p></>;
  const isMatch = pool.mode === 1;
  const ended = now >= pool.endsAt;
  const canJoin = pool.status === 0 && !mine?.joined && now <= pool.joinUntil;
  const sideName = (n: number) => n === 1 ? (meta?.sideA || "Equipo 1") : (meta?.sideB || "Equipo 2");
  const palette = ["var(--data-1)", "var(--data-2)", "var(--data-3)", "var(--data-4)"];

  return <>
    <Header back={() => go("/")} right={<button className="icon-btn" onClick={share} aria-label="Compartir"><Share2 size={22} strokeWidth={2} /></button>} />
    <div style={{ textAlign: "center" }}>
      <div className="hero-ic" style={{ marginTop: 8 }}>{isMatch ? <Swords size={40} strokeWidth={2} /> : <Target size={40} strokeWidth={2} />}</div>
      <p className="question" style={{ marginTop: 0 }}>{meta?.title || `Promesa #${id}`}</p>
      <Money units={pot} center />
      <span className={`status${pool.status === 1 ? " ok" : ""}`}>{pool.status === 0 ? (ended ? "Lista para cerrar" : `${daysLeft(pool.endsAt)} días restantes`) : pool.status === 1 ? "Cerrada" : "Devuelta a todos"}</span>
    </div>

    {!isMatch && meta?.rule && <><h2 className="section-h">Regla</h2><p className="question" style={{ marginTop: 0 }}>{meta.rule} · {pool.required} veces</p></>}

    <h2 className="section-h">{isMatch ? "Jugadores" : "Personas"}</h2>
    {people.length > 1 && !isMatch && <div className="bar">{people.map((x, i) => <i key={x.a} style={{ width: `${100 / people.length}%`, background: palette[Math.min(i, 3)], opacity: Math.min(1, 0.35 + x.m.checkins / Math.max(1, pool.required)) }} />)}</div>}
    {people.length === 0 && <p className="question">Todavía no se sumó nadie.</p>}
    {people.map((x, i) => <div key={x.a} className="row" style={{ cursor: "default" }}>
      <span className="ic avatar">{initials(P.displayName(x.a))}</span>
      <span className="txt"><div className="t">{P.displayName(x.a, me)}</div>
        <div className="s">{isMatch ? sideName(x.m.side) : `${x.m.checkins} de ${pool.required} ${x.m.checkins >= pool.required ? "· cumplió" : ""}`}</div></span>
      {!isMatch && <span className="swatch" style={{ background: palette[Math.min(i, 3)] }} />}
      <span className="val">US$ {fmtUsd(pool.stake)}</span>
    </div>)}

    {lastTx && <p className="note"><a href={txUrl(lastTx)} target="_blank" rel="noreferrer">Ver comprobante</a></p>}
    <div className="spacer" />

    {/* Actions: one primary at a time */}
    {pool.status === 0 && canJoin && !isMatch &&
      <button className="cta" disabled={!!busy} onClick={() => act("join", () => P.joinGasless(s, pool, 0), "Te sumaste. ¡A cumplir!")}>{busy === "join" ? "Sumándote…" : `Sumarme con US$ ${fmtUsd(pool.stake)}`}</button>}
    {pool.status === 0 && canJoin && isMatch && <>
      <button className="cta" disabled={!!busy} onClick={() => act("join", () => P.joinGasless(s, pool, 1), `Estás en ${sideName(1)}`)}>{`Jugar en ${sideName(1)}`}</button>
      <button className="tonal" disabled={!!busy} onClick={() => act("join", () => P.joinGasless(s, pool, 2), `Estás en ${sideName(2)}`)}>{`Jugar en ${sideName(2)}`}</button>
    </>}
    {pool.status === 0 && mine?.joined && !isMatch && !ended &&
      <button className="cta" disabled={!!busy} onClick={() => setProofOpen(true)}>{busy === "check" ? "Guardando…" : "Cumplí hoy"}</button>}
    {pool.status === 0 && mine?.joined && isMatch && !(pool.reportsMask & (mine.side === 1 ? 1 : 2)) && <>
      <p className="question" style={{ textAlign: "center" }}>¿Quién ganó?</p>
      <button className="cta" disabled={!!busy} onClick={() => act("rep", () => P.reportResult(s, id, 1), "Resultado enviado")}>{sideName(1)}</button>
      <button className="tonal" disabled={!!busy} onClick={() => act("rep", () => P.reportResult(s, id, 2), "Resultado enviado")}>{sideName(2)}</button>
    </>}
    {pool.status === 0 && ((!isMatch && ended) || (isMatch && pool.reportsMask === 3)) &&
      <button className="cta" disabled={!!busy} onClick={() => act("settle", () => P.settle(id), "¡Listo! La plata ya se repartió")}>{busy === "settle" ? "Repartiendo…" : "Repartir el pozo"}</button>}
    {pool.status === 0 && <button className="textbtn" onClick={share}>Invitar amigos</button>}
    {pool.status !== 0 && <div className="signature">Prometo</div>}

    {proofOpen && <ProofSheet goal={meta ? `${meta.title}: ${meta.rule || ""}` : `Promesa #${id}`} onClose={() => setProofOpen(false)} onDone={(proof) => { setProofOpen(false); act("check", () => P.checkIn(s, id, proof), "¡Sumaste uno más!"); }} />}
  </>;
}

/* ---------------------------------------------------------------- proof (AI pre-check) */
function ProofSheet({ goal, onClose, onDone }: { goal: string; onClose: () => void; onDone: (proof: string) => void }) {
  const [img, setImg] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [verdict, setVerdict] = useState<{ verdict: string; reason?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      // downscale to keep the AI request small
      const im = new Image(); im.onload = () => {
        const c = document.createElement("canvas"); const k = Math.min(1, 768 / Math.max(im.width, im.height));
        c.width = im.width * k; c.height = im.height * k; c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
        setImg(c.toDataURL("image/jpeg", 0.8));
      }; im.src = r.result as string;
    };
    r.readAsDataURL(f);
  };
  const check = async () => {
    setBusy(true);
    try { setVerdict(await P.verifyProof(goal, img, note)); } catch { setVerdict({ verdict: "unverified" }); } finally { setBusy(false); }
  };
  const proof = useMemo(() => `${goal}|${note}|${img?.length || 0}|${Date.now()}`, [goal, note, img, verdict]);
  return <div style={{ position: "fixed", inset: 0, background: "var(--surface)", zIndex: 10 }}>
    <div className="screen">
      <Header close={onClose} />
      <h1 className="title">Mostrá que cumpliste</h1>
      <p className="question">Una foto alcanza.</p>
      <label className="hero-ic" style={{ cursor: "pointer", overflow: "hidden" }}>
        {img ? <img src={img} alt="Prueba" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Camera size={36} strokeWidth={2} />}
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <div className="field"><label className="label" htmlFor="nt">Nota</label><input id="nt" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Piernas y cardio" /></div>
      {verdict && <p className="question" style={{ textAlign: "center" }}>
        {verdict.verdict === "ok" ? <span className="status ok">Se ve bien</span> : verdict.verdict === "doubt" ? <span className="status bad">Tus amigos van a revisar</span> : <span className="status">Sin revisión automática</span>}
        {verdict.reason ? <><br /><span style={{ fontSize: 14 }}>{verdict.reason}</span></> : null}
      </p>}
      <div className="spacer" />
      {!verdict
        ? <button className="cta" disabled={busy || (!img && !note)} onClick={check}>{busy ? "Revisando…" : "Revisar"}</button>
        : <button className="cta" onClick={() => onDone(proof)}>Guardar</button>}
      <p className="note" style={{ textAlign: "center" }}>Tus amigos tienen 24 h para objetar.</p>
    </div>
  </div>;
}

/* ---------------------------------------------------------------- me */
function Me({ s, onLogout, say }: { s: Session; onLogout: () => void; say: (m: string) => void }) {
  const [show, setShow] = useState(false);
  return <>
    <Header />
    <h1 className="title">Tu cuenta</h1>
    <p className="question">Vive en tu huella.</p>
    <h2 className="section-h">Detalles</h2>
    <div className="kv"><span className="k">Red</span><span className="v">{IS_MAINNET ? "Monad" : "Monad (prueba)"}</span></div>
    <div className="kv"><span className="k">Moneda</span><span className="v">Dólares digitales</span></div>
    <div className="divider" />
    <button className="row" onClick={() => { navigator.clipboard.writeText(s.account.address); say("Número de cuenta copiado"); }}>
      <span className="ic"><Coins size={22} strokeWidth={2} /></span><span className="txt"><div className="t">Número de cuenta</div><div className="s">Para recibir dólares</div></span><ChevronRight className="chev" size={20} />
    </button>
    <button className="row" onClick={() => setShow((v) => !v)}>
      <span className="ic"><Check size={22} strokeWidth={2} /></span><span className="txt"><div className="t">Exportar cuenta</div><div className="s">Respaldo de 24 palabras</div></span><ChevronRight className="chev" size={20} />
    </button>
    {show && <p className="note" style={{ wordSpacing: 4, lineHeight: 1.7 }}>{s.mnemonic}</p>}
    <div className="spacer" />
    <button className="textbtn danger" onClick={onLogout}>Cerrar sesión</button>
  </>;
}
