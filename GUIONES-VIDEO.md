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
- Abrí https://web.gabriel13iturre.workers.dev en tu celular y en el de tu novia. Creen cuenta con huella (con su nombre).
- En los dos: Cargar → "US$ 50 de prueba".
- Tené abierta en la PC la pestaña del explorador: https://testnet.monadvision.com/address/0x27750eed6fe4fd05d89e53e569d6e4ae20c3e2fe
- Truco para mostrar el reparto en vivo: creá la promesa con duración **"5 min"** (solo existe en la red de prueba). Grabá en dos tomas: la primera hasta "Cumplí hoy", esperás 5 minutos, y la segunda desde "Repartir el pozo".

| Tiempo | Qué se ve | Qué decís |
|---|---|---|
| 0:00–0:12 | Splash (la bandera) → inicio | "Esto es Prometo, en vivo en Monad. Te muestro el ciclo completo con dos personas reales: mi novia y yo." |
| 0:12–0:30 | Crear cuenta con huella (sale Face ID o huella) | "Entro con mi huella. Mera deriva una cuenta de Monad desde la passkey: sin frase semilla, sin extensión, sin servidor que guarde claves." |
| 0:30–0:55 | Nueva promesa → Gimnasio → US$ 10 → 5 min → "Prometer con US$ 10" → Sala de espera | "Creo una promesa: gimnasio, 10 dólares cada uno. Con un toque se crea el pozo y pongo mi parte, sin pagar gas: firmo una autorización de dólares digitales y nuestro relayer la ejecuta. Queda en sala de espera." |
| 0:55–1:20 | Sobre (invitar) → elegís a tu novia → en su celular aparece la invitación → "Entrar con US$ 10" | "La invito desde la app; le llega adentro, sin WhatsApp. Entra con su huella y pone su parte. Mientras no empiece, cualquiera puede salir y recuperar su plata." |
| 1:20–1:35 | Vos tocás "Empezar" | "Cuando estamos todos, toco Empezar. Desde acá corre el plazo y las reglas quedan fijas en el contrato." |
| 1:35–2:00 | "Cumplí hoy" → foto → "Se ve bien" → Guardar → "Cumpliste hoy · volvé mañana" | "Cumplo y subo una foto. Una IA de Cloudflare la revisa y la huella de la foto queda en Monad. Un registro por día: lo controla el contrato." |
| 2:00–2:25 | (pasaron los 5 min) "Repartir el pozo" → saldo actualizado | "Terminó el plazo. Yo cumplí y ella no: en una sola transacción recupero mis 10 y me llevo los suyos, menos una comisión chica. Si los dos cumplimos, nadie pierde y no cobramos nada." |
| 2:25–2:45 | Explorador de Monad con las transacciones | "Todo son transacciones reales en Monad, confirmadas en menos de un segundo. El contrato no tiene forma de que nadie, ni nosotros, se lleve la plata." |
| 2:45–3:00 | "Desafío entre amigos" (1 vs 1 a 5 vs 5) | "El mismo contrato sirve para desafíos entre amigos: solo ponen los que juegan y gana el resultado que confirman los dos lados. Prometo: ponele plata a tu palabra." |

---

## 3. Anuncio de 30 s (opcional, no puntúa)
Se arma con cortes del demo: "¿Arrancás el lunes? Ponele plata. Prometo." Lo hacemos después si sobra tiempo.

## Checklist para subir
- [ ] Pitch en YouTube como "no listado" (o Loom), ≤ 2:00
- [ ] Demo en YouTube como "no listado" (o Loom), ≤ 3:00
- [ ] Pegar los dos links en el formulario (Technical demo video / Pitch video)
- [ ] Opcional: activar "Show this video publicly"
- [ ] Save progress → revisar todo → **Submit** (antes de las 00:59)
