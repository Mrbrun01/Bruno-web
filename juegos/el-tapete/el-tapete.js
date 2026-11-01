'use strict';
/* =========================================================
   EL TAPETE · integración
   Monta el juego dentro de un shadow root (sus clases no chocan con las
   compartidas; sus colores y tipografías salen del tema compartido),
   pone las pestañas con el estilo común y deja elegir juego con #blackjack,
   #tute, #poker o #solitario en la dirección.
   ========================================================= */
const TAPETE_CSS = new URL('tapete.css', document.currentScript.src).href;
const TAPETE_TABS = [['inicio', 'Inicio'], ['blackjack', 'Blackjack'], ['tute', 'Tute'], ['poker', 'Póker'], ['solitario', 'Solitario']];
const TAPETE_HTML = `
<section id="v-inicio">
  <p class="intro">Cuatro juegos en una sola página. En blackjack, tute y póker cada asiento es humano o IA, así que puedes jugar contra la máquina, con amigos en el mismo dispositivo o mezclando ambas cosas. El solitario es para ti solo.</p>
  <div class="tiles" id="tiles"></div>
  <footer>Las fichas son de mentira y no se guardan: cada partida empieza con el bote lleno.</footer>
</section>

<section id="v-blackjack" hidden>
  <div class="game-head">
    <div><h2>Blackjack</h2><p>Acércate a 21 sin pasarte. La banca pide hasta 17. El blackjack paga 3 a 2.</p></div>
    <div class="actions"><button class="btn" id="bj-setup" type="button">Cambiar jugadores</button></div>
  </div>
  <div class="felt"><div class="felt-inner" id="bj"></div></div>
  <details class="rules"><summary>Reglas de esta mesa</summary><ul>
    <li>Seis barajas francesas. Las figuras valen 10 y el as vale 1 u 11.</li>
    <li>Puedes pedir carta, plantarte o doblar con tus dos primeras cartas (doblas la apuesta y recibes una sola carta).</li>
    <li>De 1 a 5 asientos, humanos o IA. Los humanos se turnan en la misma pantalla y las cartas están a la vista de todos. Quien no apuesta, no juega la ronda.</li>
    <li>Cada jugador empieza con 500 fichas. No hay seguro ni separar parejas. Las IA doblan con 10 u 11 y, por lo demás, siguen una estrategia básica.</li>
  </ul></details>
</section>

<section id="v-tute" hidden>
  <div class="game-head">
    <div><h2>Tute</h2><p>Baraja española de 40 cartas para dos asientos: contra la IA o con un amigo en el mismo dispositivo. Gana quien sume más puntos al acabar la mano.</p></div>
    <div class="actions"><button class="btn" id="tu-new" type="button">Nueva mano</button><button class="btn" id="tu-setup" type="button">Cambiar jugadores</button></div>
  </div>
  <div class="felt"><div class="felt-inner" id="tu"></div></div>
  <details class="rules"><summary>Reglas de esta mesa</summary><ul>
    <li>Cada uno recibe 6 cartas y se descubre el triunfo. Valen: as 11, tres 10, rey 4, caballo 3, sota 2. Las demás no puntúan.</li>
    <li>Orden de fuerza: as, tres, rey, caballo, sota, 7, 6, 5, 4, 2. El triunfo gana a los demás palos.</li>
    <li>Mientras queden cartas en el mazo no hay obligación de seguir el palo. Cuando el mazo se acaba (arrastre) debes servir el palo, superar si puedes y, si no tienes el palo, fallar con triunfo si lo tienes.</li>
    <li>Quien gana una baza roba primero. Si has ganado alguna baza, al abrir la siguiente puedes cantar las cuarenta (rey y caballo del triunfo, 40 puntos) o las veinte (rey y caballo de otro palo, 20 puntos), y cambiar el 7 de triunfo por la carta que está descubierta.</li>
    <li>Las diez de últimas dan 10 puntos a quien gana la última baza. Hay 120 puntos de cartas más los cantes.</li>
  </ul></details>
</section>

<section id="v-poker" hidden>
  <div class="game-head">
    <div><h2>Póker Texas Hold'em</h2><p>De 2 a 6 asientos, cada uno humano o IA. Ciegas de 10 y 20. Gana quien se quede con todas las fichas.</p></div>
    <div class="actions"><button class="btn" id="pk-new" type="button">Reiniciar fichas</button><button class="btn" id="pk-setup" type="button">Cambiar jugadores</button></div>
  </div>
  <div class="felt"><div class="felt-inner" id="pk"></div></div>
  <details class="rules"><summary>Reglas de esta mesa</summary><ul>
    <li>Recibes dos cartas privadas y se reparten cinco comunes (flop, turn y river). Tu mejor mano de cinco cartas decide el bote.</li>
    <li>De mayor a menor: escalera de color, póker, full, color, escalera, trío, doble pareja, pareja y carta alta.</li>
    <li>En cada ronda puedes retirarte, pasar o igualar, o subir. Con all-in se forman botes laterales cuando hace falta.</li>
    <li>Las IA estiman sus posibilidades antes de cada decisión. Lola juega con cautela y Paco es el más agresivo.</li>
    <li>Con varios humanos, cada uno ve sus cartas solo cuando le toca: aparece una pantalla de cambio de turno y las cartas se tapan al terminar.</li>
  </ul></details>
</section>

<section id="v-solitario" hidden>
  <div class="game-head">
    <div><h2>Solitario</h2><p>Klondike clásico con baraja francesa. Ordena las cartas en cuatro montones, del as al rey y por palo.</p></div>
  </div>
  <div class="felt"><div class="felt-inner" id="sol"></div></div>
  <details class="rules"><summary>Cómo se juega</summary><ul>
    <li>Toca una carta para elegirla y toca el destino. También puedes tocar el mazo para robar.</li>
    <li>En las columnas se apila en orden descendente alternando color (rojo sobre negro). Solo un rey puede ocupar una columna vacía.</li>
    <li>Los montones de arriba se construyen por palo, del as al rey. Doble clic en una carta la sube sola si puede.</li>
    <li>Puedes robar de 1 en 1 o de 3 en 3 (solo se juega la carta de arriba). Cambiar el modo empieza una partida nueva. Hay deshacer sin límite.</li>
  </ul></details>
</section>
`;

registerView({
  id: 'el-tapete',
  mount(root) {
    const host = h('div', { class: 'tp-host', 'data-loading': '' });
    const sr = host.attachShadow({ mode: 'open' });
    /* Los selectores html[data-style] no llegan al shadow root: se copia el estilo activo al anfitrión */
    const syncStyle = () => { host.dataset.style = document.documentElement.dataset.style || 'index'; };
    syncStyle();
    document.addEventListener('estilo-cambiado', syncStyle);
    const ready = () => host.removeAttribute('data-loading');
    const link = h('link', { rel: 'stylesheet', href: TAPETE_CSS });
    link.addEventListener('load', ready);
    link.addEventListener('error', ready);
    setTimeout(ready, 1500);
    sr.append(link, h('div', { class: 'tp', html: TAPETE_HTML }));

    const engine = createTapete(sr);
    const ids = TAPETE_TABS.map((t) => t[0]);
    const tabs = h('div', { class: 'seg tp-tabs', role: 'tablist', 'aria-label': 'Juegos de El Tapete' });
    TAPETE_TABS.forEach(([id, label]) => tabs.append(h('button', { type: 'button', role: 'tab', 'data-id': id, 'aria-selected': 'false', text: label, onclick: () => select(id, true) })));

    function select(id, push) {
      if (!ids.includes(id)) id = 'inicio';
      engine.go(id);
      $$('button', tabs).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id)));
      if (push) { try { history.replaceState(null, '', id === 'inicio' ? location.href.split('#')[0] : '#' + id); } catch (e) { /* sin historial: no pasa nada */ } }
    }

    sr.getElementById('tiles').addEventListener('click', (e) => {
      const a = e.target.closest('a.tile');
      if (!a) return;
      e.preventDefault();
      select(a.getAttribute('href').slice(1), true);
    });
    window.addEventListener('hashchange', () => select(location.hash.slice(1)));

    root.append(tabs, host);
    select(location.hash.slice(1));
    return {};
  }
});
