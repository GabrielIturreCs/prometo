import type { ReactNode } from "react";
import { Header, back } from "../ui";

const UPDATED = "13 de octubre de 2026";

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return <>
    <Header onBack={back} />
    <h1 className="title">{title}</h1>
    <p className="question">Actualizado el {UPDATED}</p>
    <div className="legal">{children}</div>
    <p className="note" style={{ margin: "32px 0 24px" }}>Versión preliminar, pendiente de revisión legal.</p>
  </>;
}

export function Terms() {
  return <Doc title="Términos">
    <h2>Qué es Prometo</h2>
    <p>Prometo es un software que permite a grupos de personas crear promesas y desafíos con dinero propio. Cada pozo vive en un contrato inteligente público en la red Monad. Prometo no recibe, guarda ni administra el dinero de nadie: los fondos se mueven solo entre las personas que participan, según reglas escritas en el contrato.</p>

    <h2>Quién puede usarlo</h2>
    <p>Tenés que ser mayor de 18 años y estar en un país donde usar este servicio sea legal. No podés usarlo si residís en un país sancionado por Estados Unidos, la Unión Europea o las Naciones Unidas.</p>

    <h2>Cómo funcionan los pozos</h2>
    <p><b>Promesas.</b> Cada participante pone el mismo monto. Gana quien cumple la cantidad de días acordada, con un registro por día. Los que no cumplen financian a los que cumplen. Si todos cumplen, o si nadie cumple, todos recuperan su dinero.</p>
    <p><b>Desafíos.</b> Solo ponen dinero las personas que juegan. El resultado vale cuando los dos lados confirman al mismo ganador. Si no se ponen de acuerdo, se devuelve todo. Si un lado no responde en 24 horas, vale lo que informó el otro.</p>
    <p>Antes de empezar, cualquiera puede salir y recuperar su dinero. Una vez que el organizador toca Empezar, las reglas no se pueden cambiar.</p>

    <h2>Lo que no es Prometo</h2>
    <p>No es un banco, una billetera custodial, un casino ni una casa de apuestas. No se puede apostar sobre lo que hacen otras personas: solo ponen dinero quienes participan. Prometo no ofrece rendimientos ni intereses, y no emite tokens.</p>

    <h2>Comisión</h2>
    <p>Prometo cobra una comisión solo sobre el dinero que se redistribuye: 4 % en promesas y 3 % en desafíos. Si nadie pierde, no hay comisión. El contrato descuenta la comisión de forma automática al repartir.</p>

    <h2>Pruebas y resultados</h2>
    <p>Las fotos que subís como prueba las ven las personas del mismo pozo. Una inteligencia artificial puede dar una primera opinión, pero no decide sola: el organizador puede rechazar un registro y el grupo puede objetarlo. Sos responsable de que tus pruebas sean reales.</p>

    <h2>Tu cuenta</h2>
    <p>Tu cuenta se crea a partir de la huella o el Face ID de tu dispositivo (passkey). Prometo nunca conoce tu clave. Si perdés el acceso a tu passkey y no exportaste tu respaldo de 24 palabras, nadie puede recuperar tu cuenta.</p>

    <h2>Riesgos</h2>
    <p>Las transacciones en blockchain son irreversibles. Los contratos inteligentes pueden tener errores. La versión actual funciona en la red de prueba de Monad, con dinero de prueba sin valor. Usás Prometo bajo tu propio riesgo.</p>

    <h2>Usos prohibidos</h2>
    <p>No podés usar Prometo para apuestas de terceros, lavado de dinero, fraude, para engañar a otros participantes ni para subir contenido ilegal, violento, sexual o que no te pertenezca.</p>

    <h2>Impuestos</h2>
    <p>Cada persona es responsable de declarar y pagar los impuestos que correspondan por lo que gana.</p>

    <h2>Código abierto</h2>
    <p>El código de Prometo es público y tiene licencia MIT: github.com/GabrielIturreCs/prometo</p>
  </Doc>;
}

export function Privacy() {
  return <Doc title="Privacidad">
    <h2>Qué datos usamos</h2>
    <p><b>Nombre visible</b>, el que elegís para que te reconozcan tus amigos. <b>Número de cuenta</b> de Monad, que es público por cómo funciona la blockchain. <b>Promesas y desafíos</b>: nombre, regla, montos, participantes y resultados. <b>Pruebas</b>: las fotos y notas que subís. <b>Amigos e invitaciones</b>: con quién prometiste y a quién invitaste.</p>
    <p>No pedimos email, teléfono, documento ni ubicación. No usamos cookies de publicidad ni rastreadores de terceros.</p>

    <h2>Qué queda en tu dispositivo</h2>
    <p>La passkey (huella o Face ID) nunca sale de tu dispositivo. La clave de tu cuenta se calcula en tu teléfono y no se envía a ningún servidor.</p>

    <h2>Qué es público</h2>
    <p>Todo lo que pasa en la blockchain es público y permanente: tu número de cuenta, en qué pozos entraste, tus registros diarios (solo una huella digital de la foto, no la foto) y los pagos.</p>

    <h2>Dónde se guardan las fotos</h2>
    <p>Las fotos se guardan en Cloudflare (servicio R2) y las pueden ver las personas que tengan el link del pozo. Para darte una primera opinión, la foto se analiza con un modelo de inteligencia artificial de Cloudflare (Workers AI). No vendemos ni compartimos tus datos con anunciantes.</p>

    <h2>Proveedores</h2>
    <p>Cloudflare (alojamiento, base de datos, fotos e IA) y la red Monad (blockchain). Cada uno tiene su propia política de privacidad.</p>

    <h2>Tus derechos</h2>
    <p>Podés pedir que borremos tu nombre, tus fotos y tu lista de amigos. Lo que ya está en la blockchain no se puede borrar. Si tu país te da más derechos (por ejemplo, el RGPD en Europa o la Ley 25.326 en Argentina), los respetamos.</p>

    <h2>Menores</h2>
    <p>Prometo es solo para mayores de 18 años.</p>

    <h2>Contacto</h2>
    <p>Por ahora, a través del repositorio público: github.com/GabrielIturreCs/prometo</p>
  </Doc>;
}
