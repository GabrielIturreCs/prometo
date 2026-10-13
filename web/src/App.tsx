import { useEffect, useState, type ReactNode } from "react";
import { Home as HomeIcon, Plus, Users, User } from "lucide-react";
import { signInTestMode, isTestModeSession, hasVault, type Session } from "./lib/mera";
import * as P from "./lib/pool";
import { useRoute, go, Toast } from "./ui";
import { Welcome, Receive, Send, Load, Me } from "./screens/Account";
import { Home, Friends, AddFriend } from "./screens/Social";
import { NewPromise, NewMatch, PoolScreen } from "./screens/Promise";
import { Terms, Privacy } from "./screens/Legal";

export default function App() {
  const route = useRoute();
  // test-mode accounts (testnet only) reopen without a prompt; passkey accounts ask for the fingerprint
  const [session, setSession] = useState<Session | null>(() => (isTestModeSession() && !hasVault() ? signInTestMode() : null));
  const [toast, setToast] = useState<string | null>(null);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200); };
  useEffect(() => { P.metaFromUrl(); }, []);
  useEffect(() => { if (session) P.fetchNames([session.account.address]); }, [session]);

  if (route === "/terminos") return <div className="screen"><Terms /></div>;
  if (route === "/privacidad") return <div className="screen"><Privacy /></div>;
  if (!session) return <><Welcome onSession={setSession} say={say} /><Toast msg={toast} /></>;

  const parts = route.split("/");
  let screen: ReactNode;
  if (route.startsWith("/p/")) screen = <PoolScreen key={route} id={BigInt(parts[2])} s={session} say={say} />;
  else if (route === "/new") screen = <NewPromise s={session} say={say} />;
  else if (route === "/new-match") screen = <NewMatch s={session} say={say} />;
  else if (route === "/receive") screen = <Receive s={session} say={say} />;
  else if (route.startsWith("/send")) screen = <Send key={route} s={session} say={say} to={parts[2]} />;
  else if (route === "/load") screen = <Load s={session} say={say} />;
  else if (route === "/friends") screen = <Friends s={session} say={say} />;
  else if (route.startsWith("/add/")) screen = <AddFriend s={session} addr={parts[2]} say={say} />;
  else if (route === "/me") screen = <Me s={session} onLogout={() => { session.end(); setSession(null); }} say={say} />;
  else screen = <Home s={session} say={say} />;

  const tabs = ["/", "/friends", "/me"];
  const showNav = tabs.includes(route);
  return <>
    <div className={`screen${showNav ? " with-nav" : ""}`}>
      {screen}
      {showNav && <nav className="nav">
        <button className={route === "/" ? "on" : ""} onClick={() => go("/")}><HomeIcon size={22} strokeWidth={2} />Inicio</button>
        <button onClick={() => go("/new")}><Plus size={22} strokeWidth={2} />Prometer</button>
        <button className={route === "/friends" ? "on" : ""} onClick={() => go("/friends")}><Users size={22} strokeWidth={2} />Amigos</button>
        <button className={route === "/me" ? "on" : ""} onClick={() => go("/me")}><User size={22} strokeWidth={2} />Yo</button>
      </nav>}
    </div>
    <Toast msg={toast} />
  </>;
}
