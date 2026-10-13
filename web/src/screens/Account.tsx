import { useEffect, useState } from "react";
import { Users, Trophy, Fingerprint, KeyRound, QrCode, ChevronRight, ShieldCheck, LogOut, Copy, Wallet, Store, Gift } from "lucide-react";
import QRCode from "qrcode";
import type { Address } from "viem";
import { isAddress } from "viem";
import {
  signIn, signUp, savedCredential, forgetCredential, explainMeraError, signInTestMode, testModeAvailable,
  hasVault, signInWithVault, isTestModeSession, protectTestAccountWithPasskey, type Session,
} from "../lib/mera";
import { IS_MAINNET, toUnits, fmtUsd, txUrl } from "../lib/chain";
import * as P from "../lib/pool";
import { Header, Sheet, Avatar, AmountPicker, Glyph, Wordmark, go, back } from "../ui";

type Say = (m: string) => void;

/* ---------------------------------------------------------------- welcome */
export function Welcome({ onSession, say }: { onSession: (s: Session) => void; say: Say }) {
  const known = !!savedCredential() || hasVault();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<Session>) => {
    setBusy(true);
    try { onSession(await fn()); } catch (e) { say(explainMeraError(e)); } finally { setBusy(false); }
  };
  const enter = () => run(hasVault() ? signInWithVault : signIn);
  return <div className="screen">
    <Header />
    <div style={{ display: "flex", justifyContent: "center", margin: "40px 0 20px" }}><Glyph size={92} /></div>
    <h1 className="title center" style={{ fontSize: 44, letterSpacing: -2 }}>prometo</h1>
    <p className="question" style={{ textAlign: "center", fontSize: 19, color: "var(--ink-700)" }}>Ponele plata a tu palabra.</p>
    <div style={{ marginTop: 32 }}>
      <div className="row" style={{ cursor: "default", minHeight: 56 }}><span className="ic"><Users size={20} strokeWidth={2} /></span><span className="t">Prometé algo con tus amigos</span></div>
      <div className="row" style={{ cursor: "default", minHeight: 56 }}><span className="ic"><Trophy size={20} strokeWidth={2} /></span><span className="t">El que cumple, cobra</span></div>
      <div className="row" style={{ cursor: "default", minHeight: 56 }}><span className="ic"><Fingerprint size={20} strokeWidth={2} /></span><span className="t">Entrás con tu huella</span></div>
    </div>
    <div className="spacer" />
    {!known && <div className="field"><label className="label" htmlFor="n">¿Cómo te llamás?</label><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoComplete="nickname" /></div>}
    {known
      ? <button className="cta" disabled={busy} onClick={enter}>{busy ? "Abriendo…" : "Entrar con tu huella"}</button>
      : <button className="cta" disabled={busy || !name.trim()} onClick={() => run(async () => { const s = await signUp(name.trim()); P.setMyName(s, name).catch(() => {}); return s; })}>{busy ? "Creando…" : "Crear cuenta con tu huella"}</button>}
    {known
      ? <button className="textbtn" onClick={() => { forgetCredential(); try { localStorage.removeItem("prometo.vault"); } catch { /* noop */ } location.reload(); }}>Usar otra cuenta</button>
      : <button className="textbtn" onClick={() => run(signIn)}>Ya tengo cuenta</button>}
    {testModeAvailable && !known && <button className="textbtn" onClick={() => { const s = signInTestMode(); if (name.trim()) P.setMyName(s, name).catch(() => {}); onSession(s); }}>Probar sin huella</button>}
    <p className="note" style={{ textAlign: "center" }}>Sin contraseñas. Tu cuenta vive en tu huella o Face ID.</p>
  </div>;
}

/* ---------------------------------------------------------------- receive (QR) */
export function Receive({ s, say }: { s: Session; say: Say }) {
  const me = s.account.address;
  const [qr, setQr] = useState("");
  useEffect(() => { QRCode.toDataURL(me, { margin: 1, width: 560, color: { dark: "#0B0E12", light: "#FFFFFF" } }).then(setQr); }, [me]);
  const name = P.cachedName(me) || "Tu cuenta";
  return <>
    <Header onBack={back} />
    <div style={{ textAlign: "center" }}>
      <h1 className="title center">Recibir</h1>
      <p className="question" style={{ textAlign: "center" }}>Dólares digitales en Monad</p>
      {qr && <img src={qr} alt="Código QR de tu cuenta" style={{ width: 240, height: 240, margin: "28px auto 12px", display: "block" }} />}
      <div className="t" style={{ fontWeight: 700, fontSize: 18 }}>{name}</div>
      <p className="note" style={{ wordBreak: "break-all", fontVariantNumeric: "tabular-nums" }}>{me}</p>
    </div>
    <div className="spacer" />
    <button className="cta" onClick={async () => { try { await navigator.clipboard.writeText(me); say("Número de cuenta copiado"); } catch { say(me); } }}>Copiar número de cuenta</button>
    <p className="note" style={{ textAlign: "center" }}>Mandá solo dólares digitales (AUSD) en la red Monad.</p>
  </>;
}

/* ---------------------------------------------------------------- send */
export function Send({ s, say, to: preset }: { s: Session; say: Say; to?: string }) {
  const me = s.account.address;
  const [friends, setFriends] = useState<string[]>([]);
  const [to, setTo] = useState<string>(preset || "");
  const [manual, setManual] = useState("");
  const [amount, setAmount] = useState(5);
  const [bal, setBal] = useState(0n);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => { P.listFriends(me).then(async (f) => { await P.fetchNames(f); setFriends(f); }); P.balanceOf(me).then(setBal); }, [me]);

  if (done) return <>
    <Header onClose={() => go("/")} />
    <div style={{ textAlign: "center" }}>
      <div className="hero-ic ok"><ShieldCheck size={40} strokeWidth={2} /></div>
      <h1 className="title center">Enviaste</h1>
      <Money0 units={toUnits(amount)} />
      <p className="question" style={{ textAlign: "center" }}>a {P.displayName(to)}</p>
    </div>
    <div className="signature"><Wordmark size={26} muted /></div>
    <div className="spacer" />
    <a className="textbtn" style={{ display: "block", textAlign: "center" }} href={txUrl(done)} target="_blank" rel="noreferrer">Ver comprobante</a>
    <button className="cta" onClick={() => go("/")}>Listo</button>
  </>;

  if (!to) return <>
    <Header onBack={back} />
    <h1 className="title">Enviar</h1>
    <p className="question">¿A quién le mandás?</p>
    {friends.length > 0 && <h2 className="section-h">Amigos</h2>}
    {friends.map((f) => <button key={f} className="row" onClick={() => setTo(f)}>
      <Avatar name={P.displayName(f)} /><span className="txt"><div className="t">{P.displayName(f)}</div><div className="s">Prometieron juntos</div></span><ChevronRight className="chev" size={20} />
    </button>)}
    <h2 className="section-h">Otra cuenta</h2>
    <input className="input" placeholder="Número de cuenta (0x…)" value={manual} onChange={(e) => setManual(e.target.value.trim())} />
    <div className="spacer" />
    <button className="cta" disabled={!isAddress(manual)} onClick={() => setTo(manual)}>Continuar</button>
  </>;

  const units = toUnits(amount);
  return <>
    <Header onBack={() => setTo("")} />
    <h1 className="title">¿Cuánto?</h1>
    <p className="question">Para {P.displayName(to)}</p>
    <Money0 units={units} />
    <p className="note">Tenés US$ {fmtUsd(bal)}</p>
    <div className="field"><AmountPicker value={amount} onChange={setAmount} presets={[1, 5, 10, 20]} /></div>
    <div className="spacer" />
    <button className="cta" disabled={busy || units === 0n || units > bal} onClick={async () => {
      setBusy(true);
      try { const r = await P.sendDollars(s, to as Address, units); setDone(r.transactionHash); }
      catch (e) { say((e as Error).message.slice(0, 120)); } finally { setBusy(false); }
    }}>{busy ? "Enviando…" : units > bal ? "Saldo insuficiente" : `Enviar US$ ${fmtUsd(units)}`}</button>
  </>;
}
const Money0 = ({ units }: { units: bigint }) => <div className="amount center">US$ {fmtUsd(units)}</div>;

/* ---------------------------------------------------------------- load balance */
export function Load({ s, say }: { s: Session; say: Say }) {
  const [busy, setBusy] = useState(false);
  return <>
    <Header onBack={back} />
    <h1 className="title">Cargar saldo</h1>
    <p className="question">¿Cómo querés cargar?</p>
    <div style={{ marginTop: 16 }}>
      {!IS_MAINNET && <button className="row" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await P.faucet(s, toUnits(50)); say("Te cargamos US$ 50 de prueba"); go("/"); }
        catch (e) { say((e as Error).message.slice(0, 120)); } finally { setBusy(false); }
      }}>
        <span className="ic"><Gift size={22} strokeWidth={2} /></span>
        <span className="txt"><div className="t">{busy ? "Cargando…" : "US$ 50 de prueba"}</div><div className="s">Gratis, para probar la app</div></span><ChevronRight className="chev" size={20} />
      </button>}
      <button className="row" onClick={() => go("/receive")}>
        <span className="ic"><QrCode size={22} strokeWidth={2} /></span>
        <span className="txt"><div className="t">Desde otra billetera</div><div className="s">Mandá AUSD a tu cuenta</div></span><ChevronRight className="chev" size={20} />
      </button>
      <a className="row" href="https://www.lemon.me" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
        <span className="ic"><Store size={22} strokeWidth={2} /></span>
        <span className="txt"><div className="t">Con pesos</div><div className="s">Comprá en Lemon y enviá</div></span><ChevronRight className="chev" size={20} />
      </a>
    </div>
    <p className="note">Prometo nunca guarda tu plata: queda en tu cuenta o en el pozo de cada promesa.</p>
  </>;
}

/* ---------------------------------------------------------------- me */
export function Me({ s, onLogout, say }: { s: Session; onLogout: () => void; say: Say }) {
  const me = s.account.address;
  const [confirmExport, setConfirmExport] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testMode, setTestMode] = useState(isTestModeSession());
  const name = P.cachedName(me) || "Vos";
  return <>
    <Header />
    <div style={{ textAlign: "center", marginTop: 8 }}>
      <span style={{ display: "inline-flex" }}><Avatar name={name} size={88} /></span>
      <h1 className="title center" style={{ marginTop: 16 }}>{name}</h1>
      <p className="question" style={{ textAlign: "center" }}>{testMode ? "Cuenta de prueba" : "Protegida con tu huella"}</p>
    </div>

    {testMode && <button className="cta" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await protectTestAccountWithPasskey(name); setTestMode(false); say("Listo: ahora entrás con tu huella"); }
      catch (e) { say(explainMeraError(e)); } finally { setBusy(false); }
    }}>{busy ? "Activando…" : "Activar huella"}</button>}

    <h2 className="section-h">Cuenta</h2>
    <button className="row" onClick={() => go("/receive")}>
      <span className="ic"><Wallet size={22} strokeWidth={2} /></span><span className="txt"><div className="t">Número de cuenta</div><div className="s">Para recibir dólares</div></span><ChevronRight className="chev" size={20} />
    </button>
    <button className="row" onClick={() => go("/friends")}>
      <span className="ic"><Users size={22} strokeWidth={2} /></span><span className="txt"><div className="t">Amigos</div><div className="s">Con quién prometés</div></span><ChevronRight className="chev" size={20} />
    </button>
    {!testMode && <button className="row" onClick={() => setConfirmExport(true)}>
      <span className="ic"><KeyRound size={22} strokeWidth={2} /></span><span className="txt"><div className="t">Exportar cuenta</div><div className="s">Respaldo de 24 palabras</div></span><ChevronRight className="chev" size={20} />
    </button>}
    <div className="divider" />
    <div className="kv"><span className="k">Red</span><span className="v">{IS_MAINNET ? "Monad" : "Monad (prueba)"}</span></div>
    <div className="kv"><span className="k">Moneda</span><span className="v">Dólares digitales</span></div>
    <div className="kv"><span className="k">Acceso</span><span className="v">{testMode ? "Este navegador" : <><Fingerprint size={16} style={{ verticalAlign: -3 }} /> Huella</>}</span></div>
    <div className="spacer" />
    <button className="textbtn danger" onClick={onLogout}><LogOut size={16} style={{ verticalAlign: -3 }} /> Cerrar sesión</button>

    {confirmExport && <Sheet onClose={() => { setConfirmExport(false); setShowWords(false); }}>
      <h1 className="title">Exportar cuenta</h1>
      <p className="question">Solo para vos.</p>
      {!showWords ? <>
        <p className="note" style={{ fontSize: 15 }}>Con estas 24 palabras cualquiera puede usar tu cuenta. No las compartas ni les saques foto.</p>
        <div className="spacer" />
        <button className="cta" onClick={() => setShowWords(true)}>Mostrar palabras</button>
      </> : <>
        <ol style={{ columns: 2, fontSize: 16, lineHeight: 2, paddingLeft: 24, marginTop: 24, fontVariantNumeric: "tabular-nums" }}>
          {s.mnemonic.split(" ").map((w, i) => <li key={i}>{w}</li>)}
        </ol>
        <div className="spacer" />
        <button className="tonal" onClick={async () => { await navigator.clipboard.writeText(s.mnemonic); say("Copiadas"); }}><Copy size={16} style={{ verticalAlign: -3 }} /> Copiar</button>
      </>}
    </Sheet>}
  </>;
}
