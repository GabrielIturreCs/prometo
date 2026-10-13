import { useEffect, useState } from "react";
import { Target, Swords, ChevronRight, Plus, ArrowDownToLine, QrCode, Send as SendIcon, Mail, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import type { Session } from "../lib/mera";
import { IS_MAINNET } from "../lib/chain";
import * as P from "../lib/pool";
import { Header, Money, Avatar, Action, ShareSheet, Wordmark, daysLeft, go, back } from "../ui";

type Say = (m: string) => void;

/* ---------------------------------------------------------------- home */
export function Home({ s, say }: { s: Session; say: Say }) {
  const me = s.account.address;
  const [bal, setBal] = useState<bigint>(0n);
  const [pools, setPools] = useState<P.Pool[] | null>(null);
  const [invites, setInvites] = useState<(P.Invite & { pool?: P.Pool })[]>([]);
  const load = async () => {
    try {
      setBal(await P.balanceOf(me));
      const ps = await P.myPools(me);
      await Promise.all(ps.map((p) => P.fetchMeta(p.metaHash)));
      setPools(ps);
      const inv = await P.inbox(me);
      const open: (P.Invite & { pool?: P.Pool })[] = [];
      for (const i of inv.slice(0, 10)) {
        if (ps.some((p) => p.id.toString() === i.poolId)) continue; // already in
        try {
          const pool = await P.readPool(BigInt(i.poolId));
          if (pool.status === P.LOBBY) { await P.fetchMeta(pool.metaHash); open.push({ ...i, pool }); }
        } catch { /* pool from an old deployment */ }
      }
      await P.fetchNames(open.map((i) => i.from));
      setInvites(open);
    } catch (e) { say((e as Error).message.slice(0, 120)); setPools([]); }
  };
  useEffect(() => { load(); }, []);
  const waiting = (pools || []).filter((p) => p.status === P.LOBBY);
  const active = (pools || []).filter((p) => p.status === P.ACTIVE);
  const done = (pools || []).filter((p) => !P.isOpenStatus(p.status));
  return <>
    <div className="header" style={{ margin: 0 }}>
      <Wordmark size={21} />
      <button className="icon-btn" style={{ marginRight: -8 }} onClick={() => go("/friends")} aria-label="Amigos"><UserPlus size={22} strokeWidth={2} /></button>
    </div>
    <p className="question" style={{ marginTop: 8 }}>Tu saldo</p>
    <Money units={bal} />
    {!IS_MAINNET && <p className="note" style={{ marginTop: 0 }}>Dólares de prueba en Monad testnet</p>}

    <div style={{ display: "flex", marginTop: 20 }}>
      <Action icon={<ArrowDownToLine size={22} strokeWidth={2} />} label="Cargar" onClick={() => go("/load")} />
      <Action icon={<QrCode size={22} strokeWidth={2} />} label="Recibir" onClick={() => go("/receive")} />
      <Action icon={<SendIcon size={22} strokeWidth={2} />} label="Enviar" onClick={() => go("/send")} />
    </div>

    <div className="tiles">
      <button className="tile" onClick={() => go("/new")}><span className="ic"><Target size={22} strokeWidth={2} /></span>Nueva promesa</button>
      <button className="tile" onClick={() => go("/new-match")}><span className="ic"><Swords size={22} strokeWidth={2} /></span>Desafío entre amigos</button>
    </div>

    {invites.length > 0 && <>
      <h2 className="section-h">Invitaciones</h2>
      {invites.map((i) => {
        const meta = i.pool ? P.metaFor(i.pool.metaHash) : undefined;
        return <button key={i.poolId} className="row" onClick={() => go(`/p/${i.poolId}`)}>
          <span className="ic"><Mail size={22} strokeWidth={2} /></span>
          <span className="txt"><div className="t">{meta?.title || `Promesa #${i.poolId}`}</div><div className="s">{P.displayName(i.from)} te invitó</div></span>
          <ChevronRight className="chev" size={20} />
        </button>;
      })}
    </>}

    {waiting.length > 0 && <><h2 className="section-h">En espera</h2>{waiting.map((p) => <PoolRow key={p.id.toString()} p={p} />)}</>}
    <h2 className="section-h">En curso</h2>
    {pools === null && <p className="question">Cargando…</p>}
    {pools && active.length === 0 && <p className="question">{waiting.length ? "Empezá una de las que están en espera." : "Todavía no prometiste nada."}</p>}
    {active.map((p) => <PoolRow key={p.id.toString()} p={p} />)}
    {done.length > 0 && <><h2 className="section-h">Terminadas</h2>{done.map((p) => <PoolRow key={p.id.toString()} p={p} />)}</>}
    <div style={{ height: 24 }} />
  </>;
}

function PoolRow({ p }: { p: P.Pool }) {
  const meta = P.metaFor(p.metaHash);
  const Icon = p.mode === 1 ? Swords : Target;
  const n = `${p.participants} ${p.participants === 1 ? "persona" : "personas"}`;
  const sub = p.status === P.LOBBY ? `${n} · sala de espera` : p.status === P.ACTIVE ? (p.mode === 1 ? `${n} · en juego` : (p.endsAt - Date.now() / 1000 < 3600 ? `${n} · quedan ${Math.max(1, Math.ceil((p.endsAt - Date.now() / 1000) / 60))} min` : `${n} · ${daysLeft(p.endsAt)} ${daysLeft(p.endsAt) === 1 ? "día" : "días"}`)) : p.status === P.SETTLED ? "Repartida" : "Devuelta";
  return <button className="row" onClick={() => go(`/p/${p.id}`)}>
    <span className="ic"><Icon size={22} strokeWidth={2} /></span>
    <span className="txt"><div className="t">{meta?.title || `Promesa #${p.id}`}</div><div className="s">{sub}</div></span>
    <span className="val">US$ {(Number(p.stake * BigInt(p.participants)) / 1e6).toLocaleString("es-AR")}</span>
    <ChevronRight className="chev" size={20} />
  </button>;
}

/* ---------------------------------------------------------------- friends */
export function Friends({ s, say }: { s: Session; say: Say }) {
  const me = s.account.address;
  const [friends, setFriends] = useState<string[] | null>(null);
  const [share, setShare] = useState(false);
  const [qr, setQr] = useState("");
  const link = P.profileLink(me);
  useEffect(() => { P.listFriends(me).then(async (f) => { await P.fetchNames(f); setFriends(f); }); }, [me]);
  useEffect(() => { QRCode.toDataURL(link, { margin: 1, width: 400, color: { dark: "#0B0E12", light: "#FFFFFF" } }).then(setQr); }, [link]);
  return <>
    <Header onBack={back} />
    <h1 className="title">Amigos</h1>
    <p className="question">Con quién prometés</p>
    {friends === null && <p className="question">Cargando…</p>}
    {friends && friends.length === 0 && <p className="question" style={{ marginTop: 24 }}>Cuando prometas con alguien, aparece acá.</p>}
    <div style={{ marginTop: 16 }}>
      {friends?.map((f) => <div key={f} className="row" style={{ cursor: "default" }}>
        <Avatar name={P.displayName(f)} />
        <span className="txt"><div className="t">{P.displayName(f)}</div><div className="s">Amigo</div></span>
        <button className="chip" onClick={() => go(`/send/${f}`)}>Enviar</button>
      </div>)}
    </div>
    <h2 className="section-h">Tu código</h2>
    <p className="question" style={{ marginTop: 0 }}>Que lo escaneen para agregarte</p>
    {qr && <img src={qr} alt="Tu código de amigo" style={{ width: 200, height: 200, margin: "16px auto 0", display: "block" }} />}
    <div className="spacer" />
    <button className="cta" onClick={() => setShare(true)}>Invitar amigos</button>
    {share && <ShareSheet url={link} text="Sumate a Prometo conmigo:" onClose={() => setShare(false)} say={say} />}
  </>;
}

/** Opened from a friend's link or QR: /add/0x… */
export function AddFriend({ s, addr, say }: { s: Session; addr: string; say: Say }) {
  const [name, setName] = useState(P.displayName(addr));
  const [busy, setBusy] = useState(false);
  useEffect(() => { P.fetchNames([addr]).then(() => setName(P.displayName(addr))); }, [addr]);
  const self = addr.toLowerCase() === s.account.address.toLowerCase();
  return <>
    <Header onClose={() => go("/")} />
    <div style={{ textAlign: "center", marginTop: 32 }}>
      <span style={{ display: "inline-flex" }}><Avatar name={name} size={88} /></span>
      <h1 className="title center" style={{ marginTop: 16 }}>{self ? "Sos vos" : name}</h1>
      <p className="question" style={{ textAlign: "center" }}>{self ? "Compartí este link con tus amigos" : "¿Lo agregás a tus amigos?"}</p>
    </div>
    <div className="spacer" />
    {!self && <button className="cta" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await P.addFriend(s, addr); say(`${name} ya es tu amigo`); go("/friends"); }
      catch (e) { say((e as Error).message); } finally { setBusy(false); }
    }}>{busy ? "Agregando…" : "Agregar amigo"}</button>}
    <button className="textbtn" onClick={() => go("/")}>Ahora no</button>
  </>;
}

export const NewIcon = Plus;
