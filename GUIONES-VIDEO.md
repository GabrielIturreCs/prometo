# Guiones de video: Prometo (Monad Metropolis)

Requisitos de la plataforma:
- **Video demo técnico: máximo 3 minutos.** Producto funcionando de verdad, no slides ni código. Tiene que verse la interacción con Monad.
- **Video pitch: máximo 2 minutos.** Equipo, problema y por qué lo construís.
- Los dos públicos o "no listados" en YouTube (o Loom). Pegás el link en el formulario.

Idioma: los jueces son inversores internacionales. Hablá en **español, con subtítulos en inglés** (más natural y creíble) o en inglés si te sentís cómodo. Abajo están los dos textos.

---

## 1. PITCH (≤ 2 min): con tu cara

Formato: vos a cámara, con el celular en horizontal a la altura de los ojos, luz de frente (ventana delante tuyo, no detrás) y fondo simple. Podés grabar en 3 o 4 tomas cortas y unirlas. No hace falta que sea perfecto: tiene que ser auténtico. El 25 % del puntaje es "fundador": quieren ver quién sos.

| Tiempo | Qué se ve | Qué decís (ES) | Subtítulo (EN) |
|---|---|---|---|
| 0:00–0:12 | Vos a cámara | "Hola, soy Gabriel Iturre, desarrollador de software de Jujuy, Argentina. Construí Prometo solo, durante Metropolis." | "Hi, I'm Gabriel Iturre, a software developer from Jujuy, Argentina. I built Prometo solo during Metropolis." |
| 0:12–0:35 | Vos a cámara (o mostrando un chat de WhatsApp con "arranco el lunes") | "Todos tenemos un grupo de WhatsApp lleno de 'arranco el lunes': el gym, estudiar, dejar el celular. Nadie lleva la cuenta y nadie pierde nada si no cumple. Con mis amigos y mi novia siempre terminábamos apostando por fuera, sin forma de cobrar ni de probar quién cumplió." | "We all have a group chat full of 'starting Monday': gym, studying, less screen time. Nobody tracks it, nobody loses anything. My friends, my partner and I kept making side bets with no way to collect or prove who followed through." |
| 0:35–1:05 | Celular mostrando la app (crear promesa, sumarse, foto) | "Prometo convierte esa promesa en un pozo real. Creás la promesa, la compartís en el grupo y cada uno pone, por ejemplo, 10 dólares. Entrás con tu huella, sin billetera ni contraseñas. Subís una foto cuando cumplís, una IA la revisa y tus amigos pueden objetar. Al final, los que fallan financian a los que cumplen. Si todos cumplen, todos recuperan su plata." | "Prometo turns that promise into a real pool. Create it, share it in the group chat, everyone puts in, say, ten dollars. Sign in with your fingerprint, no wallet, no passwords. Post a photo when you do it, AI checks it, friends can object. In the end, those who fail fund those who follow through. If everyone succeeds, everyone gets their money back." |
| 1:05–1:25 | Vos a cámara | "Funciona igual en cualquier país porque son dólares digitales sobre Monad: no custodiamos la plata, no hay token y no hay apuestas de terceros. Monad nos da confirmación en menos de un segundo y comisiones casi cero, así que se siente como un chat, no como un banco." | "It works the same in every country: digital dollars on Monad. We never hold the money, there's no token and no third-party betting. Monad gives us sub-second finality and near-zero fees, so it feels like a chat app, not a bank." |
| 1:25–1:45 | Vos a cámara | "Ganamos un pequeño porcentaje solo de la plata que se redistribuye. Empezamos con grupos de amigos y parejas en Argentina, después gimnasios, academias y comunidades que ya hacen desafíos, y torneos entre amigos donde solo ponen los que juegan." | "We take a small fee only on the money that gets redistributed. We start with friend groups and couples in Argentina, then gyms, academies and communities that already run challenges, plus friendly tournaments where only players put in." |
| 1:45–2:00 | Vos a cámara, sonriendo | "Prometo: ponele plata a tu palabra. Gracias." | "Prometo: put money behind your word. Thanks." |

Tip: si tu novia y 2 o 3 amigos ya la probaron, agregá una línea en 1:25: "Esta semana la probaron mis amigos y mi pareja: ya tenemos X promesas activas." Esa tracción real suma puntos (20 %).

---

## 2. DEMO TÉCNICO (≤ 3 min): pantalla con tu voz

Formato: grabación de pantalla del celular (el grabador nativo de Android o iPhone) o de la PC con OBS o Loom. **La cara no hace falta**; si querés, una burbuja chica de cámara en una esquina (Loom lo hace solo). Voz en off. Ideal: dos celulares (el tuyo y el de tu novia) para mostrar dos personas reales.

Preparación antes de grabar:
- Abrí https://web.gabriel13iturre.workers.dev en tu celular y en el de tu novia. Creen cuenta con huella.
- En los dos: "Cargar US$ 50 de prueba".
- Tené abierta en la PC la pestaña del explorador: https://testnet.monadvision.com/address/0x556ffafbd19676c5f283e64b11dce19a1ad522ce

| Tiempo | Qué se ve | Qué decís |
|---|---|---|
| 0:00–0:15 | Pantalla de inicio de Prometo | "Esto es Prometo, corriendo en vivo en Monad testnet. Te muestro el flujo completo con dos personas reales." |
| 0:15–0:35 | Crear cuenta con huella (sale el diálogo de Face ID o huella) | "Entro con mi huella. Por detrás, Mera deriva una cuenta de Monad desde la passkey: no hay frase semilla, ni extensión, ni servidor que guarde claves." |
| 0:35–1:00 | Nueva promesa → Gimnasio → US$ 10 → 1 día → "Prometer con US$ 10" | "Creo una promesa: gimnasio, 10 dólares cada uno. Con un toque se crea el contrato del pozo y pongo mi parte. No pagué gas: firmé una autorización EIP-3009 de dólares digitales y nuestro relayer la ejecuta." |
| 1:00–1:25 | Compartir link → se abre en el celular de tu novia → "Sumarme con US$ 10" | "Comparto el link por WhatsApp. Mi novia entra con su huella y se suma. En menos de un segundo el pozo ya tiene 20 dólares: es la finalidad de Monad." |
| 1:25–1:55 | "Cumplí hoy" → sacar foto → "Subir prueba" → "Se ve bien" → Guardar | "Cuando cumplo, subo una foto. Se guarda en Cloudflare, una IA de visión la revisa y la huella de la foto queda registrada en Monad con el check-in, así nadie puede cambiarla después. Mis amigos ven todas las pruebas y pueden objetar." |
| 1:55–2:20 | Explorador de Monad con las transacciones (crear, unirse, check-in) | "Todo esto son transacciones reales en Monad: crear el pozo, sumarse y cada check-in. El contrato no tiene forma de que nadie retire la plata: solo se mueve entre los participantes." |
| 2:20–2:45 | Pantalla del pozo terminado → "Repartir el pozo" → saldo actualizado (si llegaste a una promesa de 1 día ya vencida) | "Cuando termina el plazo, cualquiera puede cerrar el pozo: los que cumplieron recuperan su plata más la parte de los que fallaron, en una sola transacción. Si todos cumplen, todos la recuperan y no cobramos nada." |
| 2:45–3:00 | Pantalla "Torneo con amigos" | "Y el mismo contrato sirve para torneos entre amigos: solo ponen los que juegan y gana el equipo que confirman los dos capitanes. Prometo: ponele plata a tu palabra." |

Si no llegás a mostrar el reparto con una promesa vencida, decí la frase de 2:20 mostrando el código del contrato en GitHub (la función `settle`) o los tests pasando (`npx hardhat test`). Te puedo dejar una promesa de prueba que venza antes de que grabes.

---

## 3. Anuncio de 30 s (opcional, no puntúa)
Se arma con cortes del demo: "¿Arrancás el lunes? Ponele plata. Prometo." Lo hacemos después si sobra tiempo.

## Checklist para subir
- [ ] Pitch en YouTube como "no listado" (o Loom), ≤ 2:00
- [ ] Demo en YouTube como "no listado" (o Loom), ≤ 3:00
- [ ] Pegar los dos links en el formulario (Technical demo video / Pitch video)
- [ ] Opcional: activar "Show this video publicly"
- [ ] Save progress → revisar todo → **Submit** (antes de las 00:59)
