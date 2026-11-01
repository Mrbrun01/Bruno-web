/* =========================================================
   EL TAPETE · motor de los cuatro juegos (Blackjack, Tute, Póker y Solitario)
   createTapete(raíz) recibe el shadow root donde está el marcado y devuelve
   { go(id) } para cambiar de juego. Toda la lógica es la del original.
   ========================================================= */
function createTapete(SR){
'use strict';
const $=(s,r=SR)=>r.querySelector(s);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sleep=(fn,ms)=>setTimeout(fn,ms);

/* ---------- Cartas francesas ---------- */
const FS=['♠','♥','♦','♣'];
const FR_LABEL={1:'A',11:'J',12:'Q',13:'K',14:'A'};
const frLabel=r=>FR_LABEL[r]||String(r);
function frCard(c,o={}){
  const red=c.s==='♥'||c.s==='♦';
  const cls=['card','fr',red?'red':'',c._fresh?'fresh':'',o.cls||''].join(' ');
  c._fresh=false;
  return `<div class="${cls}"><span class="corner">${frLabel(c.r)}<br>${c.s}</span><span class="pip">${c.s}</span><span class="corner br">${frLabel(c.r)}<br>${c.s}</span></div>`;
}
const backCard=(fresh)=>`<div class="card back${fresh?' fresh':''}"></div>`;
const slotCard=()=>`<div class="card slot"></div>`;

/* ---------- Cartas españolas ---------- */
const ES_SUITS=['oros','copas','espadas','bastos'];
const ES_RANKS=[1,2,3,4,5,6,7,10,11,12];
const ES_NAME={1:'As',10:'Sota',11:'Caballo',12:'Rey'};
const ES_SVG={
  oros:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#e3b23c" stroke="#7d4f0e" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="none" stroke="#7d4f0e" stroke-width="1.5"/></svg>',
  copas:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 3.5h15c0 7.500-3.800 10.500-7.500 10.500S4.500 11 4.500 3.500z" fill="#c8382b" stroke="#6a150e" stroke-width="1.500" stroke-linejoin="round"/><path d="M12 14v5.500M7.500 21.500h9" stroke="#6a150e" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
  espadas:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.500l2.700 5V15h-5.400V6.500z" fill="#d7dde6" stroke="#25405f" stroke-width="1.300" stroke-linejoin="round"/><path d="M6.500 15.500h11M12 15.500v7" stroke="#25405f" stroke-width="2.200" stroke-linecap="round" fill="none"/></svg>',
  bastos:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.500 2.500c3-1.200 6.300.8 5.800 4.200l-1.400 14.300h-3.600L8.600 7.500C8.300 5 8.400 3.300 9.500 2.500z" fill="#5e9a3c" stroke="#264d12" stroke-width="1.500" stroke-linejoin="round"/><path d="M9 9.500h5.800M9.600 14h4.800" stroke="#264d12" stroke-width="1.300" fill="none"/></svg>'
};
function esCard(c,o={}){
  const cls=['card','es',c._fresh?'fresh':'',o.cls||''].join(' ');
  c._fresh=false;
  const inner=`<span class="corner">${c.r}</span><span class="art">${ES_SVG[c.s]}</span><span class="name">${ES_NAME[c.r]||c.s}</span>`;
  const label=`${ES_NAME[c.r]||c.r} de ${c.s}`;
  if(o.btn) return `<button type="button" class="${cls}${o.dim?' dim':''}" data-card="${o.idx}" aria-label="${label}" ${o.disabled?'disabled':''}>${inner}</button>`;
  return `<div class="${cls}" role="img" aria-label="${label}">${inner}</div>`;
}
const esLabel=c=>`${ES_NAME[c.r]||c.r} de ${c.s}`;

/* ---------- Router ---------- */
const mods={};
const inited={};
const views=['inicio','blackjack','tute','poker','solitario'];
function go(h){
  if(!views.includes(h)) h='inicio';
  views.forEach(v=>{$('#v-'+v).hidden=v!==h});
  if(mods[h]&&!inited[h]){inited[h]=true;mods[h].init()}
  return h;
}

/* ---------- Portada ---------- */
(function home(){
  const mk=(c,r)=>{const el=document.createElement('div');el.innerHTML=frCard(c);el.firstChild.style.setProperty('--r',r+'deg');return el.innerHTML.replace('<div class="card','<div style="--r:'+r+'deg" class="card')};
  const bj=[{r:14,s:'♠'},{r:13,s:'♥'}].map((c,i)=>mk(c,-6+i*10)).join('');
  const tu=[{r:1,s:'oros'},{r:3,s:'copas'},{r:12,s:'espadas'}].map((c,i)=>esCard(c).replace('<div class="card','<div style="--r:'+(-8+i*8)+'deg" class="card')).join('');
  const pk=[{r:14,s:'♥'},{r:14,s:'♣'}].map((c,i)=>mk(c,-6+i*10)).join('');
  const sol=[{r:10,s:'♦'},{r:9,s:'♣'},{r:8,s:'♥'}].map((c,i)=>mk(c,-8+i*8)).join('');
  $('#tiles').innerHTML=[
    ['blackjack','Blackjack','Llega a 21 antes que la banca. De 1 a 5 asientos, humanos o IA, en la misma pantalla.',bj,['1 a 5 asientos','Humanos o IA','Baraja francesa']],
    ['tute','Tute','Bazas, cantes y cambio del siete. Contra la IA o con un amigo, con la mano tapada entre turnos.',tu,['2 asientos','Humanos o IA','Baraja española']],
    ['poker','Póker','Texas Hold\'em con ciegas, all-in y botes laterales. De 2 a 6 asientos, humanos o IA.',pk,['2 a 6 asientos','Humanos o IA','Baraja francesa']],
    ['solitario','Solitario','Klondike con deshacer, doble clic para subir cartas y robo de 1 o de 3.',sol,['1 jugador','Sin rival','Baraja francesa']]
  ].map(([id,t,p,s,tags])=>`<a class="tile" href="#${id}"><div class="sample">${s}</div><h2>${t}</h2><p>${p}</p><div class="tags">${tags.map(x=>`<span class="tag">${x}</span>`).join('')}</div></a>`).join('');
})();

/* ---------- Utilidades de mesa ---------- */
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const AI_NAMES=['Lola','Paco','Marta','Íñigo','Sara','Raúl'];
const AI_STYLE=[{agg:.3,bluff:.05},{agg:.6,bluff:.14},{agg:.45,bluff:.08},{agg:.7,bluff:.18},{agg:.25,bluff:.04},{agg:.5,bluff:.1}];
const styleOf=name=>AI_STYLE[Math.max(0,AI_NAMES.indexOf(name))];
const coverHtml=(name,seat)=>`<div class="cover"><span class="label">Cambio de turno</span><strong>Turno de ${esc(name)}</strong><span class="sub">Pasa el dispositivo a ${esc(name)}. Que nadie más mire la pantalla.</span><button class="btn primary" type="button" data-reveal="${seat}">Soy ${esc(name)}, ver mis cartas</button></div>`;

/* Pantalla de configuración de mesa: cada asiento es humano o IA */
function setupUI(root,o){
  const S=o.seats.map(s=>({ai:s.ai,name:s.name}));
  const OPT={};(o.options||[]).forEach(x=>OPT[x.id]=x.value);
  const freeAi=()=>AI_NAMES.find(n=>!S.some(s=>s.ai&&s.name===n))||'IA';
  const humanName=i=>'Jugador '+(i+1);
  function draw(){
    const hum=S.filter(s=>!s.ai).length;
    const ok=hum>=(o.minHumans||0);
    root.innerHTML=`<div class="setup"><div><h2>${o.title}</h2><p class="sub" style="max-width:62ch;margin:6px 0 0">${o.intro}</p></div>
      <div>${S.map((s,i)=>`<div class="setup-row"><span class="label" style="min-width:5.5em">Asiento ${i+1}</span>
        <div class="seg"><button type="button" class="btn sm${!s.ai?' on':''}" data-t="${i}" data-v="h">Humano</button><button type="button" class="btn sm${s.ai?' on':''}" data-t="${i}" data-v="a">IA</button></div>
        ${s.ai?`<span class="setup-name">${esc(s.name)}</span>`:`<input class="setup-input" id="${o.id}-n${i}" value="${esc(s.name)}" maxlength="14" aria-label="Nombre del asiento ${i+1}">`}
        ${(!o.fixed&&S.length>o.min)?`<button type="button" class="btn sm" data-rm="${i}">Quitar</button>`:''}</div>`).join('')}</div>
      ${!o.fixed&&S.length<o.max?'<div><button type="button" class="btn sm" data-add="1">Añadir asiento</button></div>':''}
      ${(o.options||[]).map(x=>`<div class="setup-row"><span class="label" style="min-width:8em">${x.label}</span><div class="seg">${x.values.map(v=>`<button type="button" class="btn sm${OPT[x.id]===v.v?' on':''}" data-opt="${x.id}" data-ov="${v.v}">${v.l}</button>`).join('')}</div></div>`).join('')}
      <div class="actions"><button type="button" class="btn primary" data-go="1" ${ok?'':'disabled'}>Empezar</button>${ok?'':'<span class="sub">Hace falta al menos un jugador humano.</span>'}</div></div>`;
  }
  if(root._setupClick)root.removeEventListener('click',root._setupClick);
  if(root._setupInput)root.removeEventListener('input',root._setupInput);
  root._setupClick=e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.t!==undefined){const i=+b.dataset.t,ai=b.dataset.v==='a';if(S[i].ai!==ai){S[i].ai=ai;S[i].name=ai?freeAi():humanName(i)}draw()}
    else if(b.dataset.rm!==undefined){S.splice(+b.dataset.rm,1);S.forEach((s,i)=>{if(!s.ai&&/^Jugador \d+$/.test(s.name))s.name=humanName(i)});draw()}
    else if(b.dataset.add){const ai=S.filter(s=>!s.ai).length>0;S.push({ai,name:ai?freeAi():humanName(S.length)});draw()}
    else if(b.dataset.opt){OPT[b.dataset.opt]=isNaN(+b.dataset.ov)?b.dataset.ov:+b.dataset.ov;draw()}
    else if(b.dataset.go){
      const used=new Set();
      const seats=S.map((s,i)=>{let n=(s.name||'').trim()||humanName(i);while(used.has(n))n+=' '+(i+1);used.add(n);return{ai:s.ai,name:n}});
      root.removeEventListener('click',root._setupClick);root.removeEventListener('input',root._setupInput);
      root._setupClick=root._setupInput=null;
      o.start(seats,{...OPT});
    }
  };
  root._setupInput=e=>{const m=/-n(\d+)$/.exec(e.target.id||'');if(m&&S[+m[1]])S[+m[1]].name=e.target.value};
  root.addEventListener('click',root._setupClick);
  root.addEventListener('input',root._setupInput);
  draw();
}

/* =====================================================
   BLACKJACK
   ===================================================== */
const BJ=(()=>{
  const root=$('#bj');
  let st=null,lastSeats=[{ai:false,name:'Jugador 1'}];
  const bjVal=h=>{let t=0,a=0;h.forEach(c=>{if(c.r===14){a++;t+=11}else t+=Math.min(c.r,10)});while(t>21&&a){t-=10;a--}return t};
  const isBJ=h=>h.length===2&&bjVal(h)===21;
  function newShoe(){const s=[];for(let d=0;d<6;d++)for(const su of FS)for(let r=2;r<=14;r++)s.push({r,s:su});return shuffle(s)}
  function draw(){const c=st.shoe.pop();c._fresh=true;return c}
  function showSetup(){
    st=null;
    setupUI(root,{id:'bj',title:'Mesa de blackjack',intro:'Elige quién se sienta, de 1 a 5 asientos. En blackjack todas las cartas están a la vista, así que los jugadores humanos comparten pantalla sin taparse. Las IA siguen una estrategia básica.',seats:lastSeats,min:1,max:5,minHumans:1,
      start(seats){lastSeats=seats.map(s=>({ai:s.ai,name:s.name}));begin(seats)}});
  }
  function aiBet(p){return Math.min(25,p.bank)}
  function begin(seats){
    st={shoe:newShoe(),players:seats.map(s=>({name:s.name,ai:s.ai,bank:500,bet:0,last:25,hand:[],done:false,res:null,net:0,in:false})),dealer:[],phase:'bet',cur:-1,msg:'Haced vuestras apuestas.'};
    st.players.forEach(p=>{p.bet=aiBet(p)});
    render();
  }
  function render(){
    const hide=st.phase==='play'&&st.dealer.length>1;
    const dv=st.dealer.length?(hide?bjVal([st.dealer[0]]):bjVal(st.dealer)):'';
    const dealerHtml=`<div class="seat"><div class="seat-top"><strong>Banca</strong><span class="num">${dv}</span></div><div class="cards">${st.dealer.map((c,i)=>hide&&i===1?backCard():frCard(c)).join('')||slotCard()+slotCard()}</div></div>`;
    const seats=st.players.map((p,i)=>{
      const active=st.phase==='play'&&i===st.cur;
      const broke=p.bank===0&&p.bet===0&&st.phase==='bet';
      let badge='';
      if(p.res){const cls=p.net>0?'good':p.net<0?'bad':'';badge=`<span class="badge ${cls}">${p.res} ${p.net>0?'+'+p.net:p.net<0?p.net:''}</span>`}
      const bet=(st.phase==='bet'&&!p.ai)?`<div class="chips">${[5,25,100].map(v=>`<button type="button" class="chip c${v}" data-bet="${i}" data-v="${v}" aria-label="Apostar ${v}" ${p.bank-p.bet<v?'disabled':''}>${v}</button>`).join('')}<button type="button" class="btn sm" data-clear="${i}">Borrar</button></div>`:'';
      return `<div class="seat${active?' active':''}${broke?' out':''}"><div class="seat-top"><strong>${esc(p.name)}</strong><span>${p.ai?'<span class="badge">IA</span> ':''}${badge}</span></div>
        <div class="rowline"><span><span class="label">Fichas</span> <span class="num">${p.bank}</span></span><span><span class="label">Apuesta</span> <span class="num">${p.bet}</span></span>${p.in&&p.hand.length?`<span><span class="label">Mano</span> <span class="num">${bjVal(p.hand)}</span></span>`:''}</div>
        <div class="cards">${p.in&&p.hand.length?p.hand.map(c=>frCard(c)).join(''):(broke?'<span class="sub">Sin fichas</span>':'')}</div>${bet}</div>`;
    }).join('');
    let ctrl='';
    if(st.phase==='bet'){
      const any=st.players.some(p=>p.bet>0);
      const humBroke=st.players.filter(p=>!p.ai).every(p=>p.bank===0&&p.bet===0);
      ctrl=humBroke?`<button class="btn primary" type="button" data-act="reset">Reiniciar mesa</button>`:`<button class="btn primary" type="button" data-act="deal" ${any?'':'disabled'}>Repartir</button>`;
    }else if(st.phase==='play'){
      const p=st.players[st.cur];
      if(p&&!p.ai){
        const dbl=p.hand.length===2&&p.bank>=p.bet;
        ctrl=`<button class="btn primary" type="button" data-act="hit">Pedir</button><button class="btn" type="button" data-act="stand">Plantarse</button><button class="btn" type="button" data-act="double" ${dbl?'':'disabled'}>Doblar</button>`;
      }
    }else if(st.phase==='end'){
      ctrl=`<button class="btn primary" type="button" data-act="next">Nueva ronda</button>`;
    }
    root.innerHTML=`${dealerHtml}<div class="msg" aria-live="polite">${st.msg}</div><div class="actions">${ctrl}</div><div class="seats">${seats}</div>`;
  }
  function advance(){
    let i=st.cur+1;
    while(i<st.players.length&&(!st.players[i].in||st.players[i].done))i++;
    if(i>=st.players.length){dealerPlay();return}
    st.cur=i;const p=st.players[i];
    st.msg=`Turno de ${esc(p.name)}.`;render();
    if(p.ai)sleep(aiTurn,900);
  }
  function aiTurn(){
    if(!st||st.phase!=='play')return;
    const p=st.players[st.cur];if(!p||!p.ai||p.done)return;
    const v=bjVal(p.hand),up=st.dealer[0].r===14?11:Math.min(st.dealer[0].r,10);
    if(p.hand.length===2&&(v===10||v===11)&&up<10&&p.bank>=p.bet)return doDouble(p);
    const hit=up>=7?v<17:v<12;
    if(hit){doHit(p);if(!p.done&&st.players[st.cur]===p)sleep(aiTurn,900)}else doStand(p);
  }
  function doHit(p){p.hand.push(draw());if(bjVal(p.hand)>=21){p.done=true;advance()}else render()}
  function doStand(p){p.done=true;advance()}
  function doDouble(p){if(p.hand.length===2&&p.bank>=p.bet){p.bank-=p.bet;p.bet*=2;p.hand.push(draw());p.done=true;advance()}}
  function deal(){
    if(st.shoe.length<90)st.shoe=newShoe();
    st.dealer=[];
    st.players.forEach(p=>{p.hand=[];p.done=false;p.res=null;p.net=0;p.in=p.bet>0&&p.bank>=p.bet;if(p.in)p.bank-=p.bet;else p.bet=0});
    for(let k=0;k<2;k++){st.players.forEach(p=>{if(p.in)p.hand.push(draw())});st.dealer.push(draw())}
    st.phase='play';
    st.players.forEach(p=>{if(p.in&&bjVal(p.hand)===21)p.done=true});
    const up=st.dealer[0].r;
    if((up===14||(up>=10&&up<=13))&&isBJ(st.dealer)){st.msg='La banca tiene blackjack.';settle();return}
    st.cur=-1;st.msg='';
    advance();
  }
  function dealerPlay(){
    st.phase='dealer';st.cur=-1;
    const live=st.players.some(p=>p.in&&bjVal(p.hand)<=21&&!isBJ(p.hand));
    st.msg='Juega la banca.';render();
    const step=()=>{
      if(live&&bjVal(st.dealer)<17){st.dealer.push(draw());render();sleep(step,750)}
      else settle();
    };
    sleep(step,700);
  }
  function settle(){
    const dv=bjVal(st.dealer),dbj=isBJ(st.dealer);
    st.players.forEach(p=>{
      if(!p.in)return;
      const v=bjVal(p.hand);let pay=0,res;
      if(v>21){res='Se pasa'}
      else if(isBJ(p.hand)&&!dbj){res='Blackjack';pay=Math.floor(p.bet*2.5)}
      else if(dbj&&isBJ(p.hand)){res='Empate';pay=p.bet}
      else if(dbj){res='Pierde'}
      else if(dv>21||v>dv){res='Gana';pay=p.bet*2}
      else if(v===dv){res='Empate';pay=p.bet}
      else{res='Pierde'}
      p.bank+=pay;p.net=pay-p.bet;p.res=res;p.last=p.bet;
    });
    st.phase='end';
    st.msg=dv>21?`La banca se pasa con ${dv}.`:`La banca se queda en ${dv}.`;
    render();
  }
  root.addEventListener('click',e=>{
    if(!st)return;
    const t=e.target.closest('button');if(!t)return;
    if(t.dataset.bet!==undefined&&st.phase==='bet'){const p=st.players[+t.dataset.bet],v=+t.dataset.v;if(p.bank-p.bet>=v)p.bet+=v;return render()}
    if(t.dataset.clear!==undefined&&st.phase==='bet'){st.players[+t.dataset.clear].bet=0;return render()}
    const a=t.dataset.act;if(!a)return;
    if(a==='deal'&&st.phase==='bet')deal();
    else if(a==='reset')begin(lastSeats);
    else if(a==='next'&&st.phase==='end'){
      st.players.forEach(p=>{p.hand=[];p.res=null;p.in=false;p.bet=p.ai?aiBet(p):Math.min(p.last,p.bank)});
      st.dealer=[];st.phase='bet';st.msg='Haced vuestras apuestas.';render();
    }
    else if(st.phase==='play'){
      const p=st.players[st.cur];if(!p||p.ai)return;
      if(a==='hit')doHit(p);else if(a==='stand')doStand(p);else if(a==='double')doDouble(p);
    }
  });
  $('#bj-setup').addEventListener('click',showSetup);
  return{init(){showSetup()},_val:bjVal};
})();
mods.blackjack=BJ;

/* =====================================================
   TUTE
   ===================================================== */
const TU=(()=>{
  const root=$('#tu');
  const STR={1:10,3:9,12:8,11:7,10:6,7:5,6:4,5:3,4:2,2:1};
  const PT={1:11,3:10,12:4,11:3,10:2};
  const P=c=>PT[c.r]||0;
  let st=null,lastSeats=[{ai:false,name:'Jugador 1'},{ai:true,name:'Lola'}];
  const nm=s=>esc(st.players[s].name);
  const nHum=()=>st.players.filter(p=>!p.ai).length;
  function showSetup(){
    st=null;
    setupUI(root,{id:'tu',title:'Mesa de tute',intro:'Dos asientos. Juega contra la IA o con un amigo en el mismo dispositivo. Con dos humanos, la mano de cada uno se tapa hasta que le toca y aparece una pantalla de cambio de turno.',seats:lastSeats,min:2,max:2,fixed:true,minHumans:1,
      start(seats){lastSeats=seats.map(s=>({ai:s.ai,name:s.name}));begin(seats)}});
  }
  function begin(seats){st={players:seats.map(s=>({name:s.name,ai:s.ai}))};deal(Math.random()<.5?0:1)}
  function deal(leader){
    const players=st.players;
    const deck=shuffle(ES_SUITS.flatMap(s=>ES_RANKS.map(r=>({r,s}))));
    const take=n=>deck.splice(deck.length-n,n).map(c=>(c._fresh=true,c));
    const hands=[take(6),take(6)];
    const trumpCard=deck.pop();trumpCard._fresh=true;
    st={players,hands,stock:[trumpCard,...deck],trumpCard,trump:trumpCard.s,score:[0,0],tricks:[0,0],sung:[[],[]],leader,turn:leader,table:[null,null],phase:'wait',msg:'',log:[],viewer:null};
    sortHand(0);sortHand(1);
    const hs=[0,1].filter(i=>!players[i].ai);
    if(hs.length===1)st.viewer=hs[0];
    startTurn(leader,'lead');
  }
  function sortHand(w){const o={oros:0,copas:1,espadas:2,bastos:3};st.hands[w].sort((a,b)=>o[a.s]-o[b.s]||STR[b.r]-STR[a.r])}
  const log=t=>{st.log.unshift(t);if(st.log.length>8)st.log.pop()};
  function startTurn(seat,phase){
    st.turn=seat;st.phase=phase;
    if(phase==='lead')st.leader=seat;
    const p=st.players[seat];
    st.msg=phase==='lead'?`Sale ${nm(seat)}.`:`Responde ${nm(seat)}.`;
    if(p.ai){render();sleep(()=>aiPlay(seat),phase==='lead'?800:950)}
    else{
      if(nHum()>1){if(st.viewer!==seat)st.viewer=null;st.msg+=` Pasa el dispositivo a ${nm(seat)}.`}
      render();
    }
  }
  function beats(L,R){
    if(R.s===L.s)return STR[R.r]>STR[L.r];
    return R.s===st.trump&&L.s!==st.trump;
  }
  function legal(hand,L){
    if(st.stock.length>0)return hand;
    const same=hand.filter(c=>c.s===L.s);
    if(same.length){const hi=same.filter(c=>STR[c.r]>STR[L.r]);return hi.length?hi:same}
    const tr=hand.filter(c=>c.s===st.trump);
    return tr.length?tr:hand;
  }
  const cost=c=>P(c)*10+STR[c.r]+(c.s===st.trump?100:0);
  function cantesFor(w){
    if(st.tricks[w]===0)return[];
    return ES_SUITS.filter(s=>!st.sung[w].includes(s)&&st.hands[w].some(c=>c.s===s&&c.r===11)&&st.hands[w].some(c=>c.s===s&&c.r===12));
  }
  function canSwap(w){
    if(st.tricks[w]===0||st.stock.length<2||st.trumpCard.r===7)return false;
    return st.hands[w].some(c=>c.s===st.trump&&c.r===7);
  }
  function swap(w){
    const h=st.hands[w],i=h.findIndex(c=>c.s===st.trump&&c.r===7);
    const seven=h.splice(i,1)[0];
    h.push(st.trumpCard);st.stock[0]=seven;st.trumpCard=seven;sortHand(w);
    log(`${nm(w)} cambia el 7 de triunfo.`);
  }
  function sing(w,s){
    const pts=s===st.trump?40:20;
    st.score[w]+=pts;st.sung[w].push(s);
    log(`${nm(w)} canta las ${pts===40?'cuarenta':'veinte'} en ${s} (+${pts}).`);
  }
  function aiPlay(s){if(!st)return;if(st.phase==='lead')aiLead(s);else if(st.phase==='follow')aiRespond(s)}
  function aiLead(s){
    if(canSwap(s))swap(s);
    const cs=cantesFor(s);
    let pick=null;
    const h=st.hands[s];
    if(cs.length){
      cs.sort((a,b)=>(b===st.trump)-(a===st.trump));
      sing(s,cs[0]);
      pick=h.find(c=>c.s===cs[0]&&c.r===11);
    }
    if(!pick){
      if(st.stock.length===0){
        const nt=h.filter(c=>c.s!==st.trump).sort((a,b)=>STR[b.r]-STR[a.r]);
        pick=(nt.length&&STR[nt[0].r]>=9)?nt[0]:h.slice().sort((a,b)=>(b.s===st.trump)-(a.s===st.trump)||STR[b.r]-STR[a.r])[0];
      }else pick=h.slice().sort((a,b)=>cost(a)-cost(b))[0];
    }
    h.splice(h.indexOf(pick),1);
    st.table[s]=pick;pick._fresh=true;
    startTurn(1-s,'follow');
  }
  function aiRespond(s){
    const L=st.table[1-s],h=st.hands[s],opts=legal(h,L);
    const wins=opts.filter(c=>beats(L,c)).sort((a,b)=>cost(a)-cost(b));
    let pick;
    if(wins.length){
      const w=wins[0];
      const worth=P(L)>=3||st.stock.length===0||(w.s!==st.trump&&P(w)<=3);
      pick=(worth||opts.length===wins.length)?w:opts.slice().sort((a,b)=>cost(a)-cost(b))[0];
    }else pick=opts.slice().sort((a,b)=>cost(a)-cost(b))[0];
    h.splice(h.indexOf(pick),1);pick._fresh=true;
    st.table[s]=pick;
    resolve();
  }
  function resolve(){
    const lead=st.leader;
    const L=st.table[lead],R=st.table[1-lead];
    const winner=beats(L,R)?1-lead:lead;
    const pts=P(L)+P(R);
    st.score[winner]+=pts;st.tricks[winner]++;
    st.msg=`${nm(winner)} gana la baza${pts?` y suma ${pts}`:''}.`;
    st.phase='wait';render();
    sleep(()=>{
      st.table=[null,null];
      if(st.stock.length){
        const d=w=>{const c=st.stock.pop();c._fresh=true;st.hands[w].push(c)};
        d(winner);d(1-winner);sortHand(0);sortHand(1);
      }
      if(!st.hands[0].length&&!st.hands[1].length){
        st.score[winner]+=10;log(`${nm(winner)} se lleva las diez de últimas (+10).`);
        finish();return;
      }
      startTurn(winner,'lead');
    },1400);
  }
  function finish(){
    st.phase='over';
    const a=st.score[0],b=st.score[1];
    st.msg=a>b?`${nm(0)} gana la mano por ${a} a ${b}.`:a<b?`${nm(1)} gana la mano por ${b} a ${a}.`:`Empate a ${a} puntos.`;
    render();
  }
  function playCard(s,idx){
    const c=st.hands[s].splice(idx,1)[0];c._fresh=true;st.table[s]=c;
    if(nHum()>1)st.viewer=null;
    if(st.phase==='lead'){st.phase='wait';startTurn(1-s,'follow')}else resolve();
  }
  function render(){
    const hum=[0,1].filter(i=>!st.players[i].ai);
    let bottom;
    if(st.viewer!==null)bottom=st.viewer;
    else if(hum.length===1)bottom=hum[0];
    else bottom=!st.players[st.turn].ai?st.turn:hum[0];
    const top=1-bottom;
    const viewing=st.viewer===bottom;
    const turnIsMe=st.turn===bottom&&!st.players[bottom].ai&&(st.phase==='lead'||st.phase==='follow');
    const canPlay=turnIsMe&&viewing;
    const hand=st.hands[bottom];
    const ok=canPlay&&st.phase==='follow'?legal(hand,st.table[1-bottom]):hand;
    const tag=s=>st.players[s].ai?' <span class="badge">IA</span>':'';
    let handHtml;
    if(viewing){
      handHtml=`<div class="cards">${hand.map((c,i)=>{const can=canPlay&&ok.includes(c);return esCard(c,{btn:1,idx:i,disabled:!can,dim:canPlay&&!can})}).join('')}</div>`;
    }else if(turnIsMe&&nHum()>1){
      handHtml=coverHtml(st.players[bottom].name,bottom);
    }else{
      handHtml=`<div class="cards">${hand.map(()=>backCard()).join('')}</div><div><button type="button" class="btn sm" data-reveal="${bottom}">Ver mis cartas</button></div>`;
    }
    const trumpShow=st.stock.length&&st.stock[0]===st.trumpCard?esCard(st.trumpCard):'';
    const extra=[];
    if(canPlay&&st.phase==='lead'){
      cantesFor(bottom).forEach(s=>extra.push(`<button class="btn" type="button" data-sing="${s}">Cantar ${s===st.trump?'las cuarenta':'las veinte'} en ${s}</button>`));
      if(canSwap(bottom))extra.push(`<button class="btn" type="button" data-swap="1">Cambiar el 7 de triunfo</button>`);
    }
    if(viewing&&nHum()>1&&!turnIsMe)extra.push(`<button class="btn sm" type="button" data-hide="1">Ocultar mis cartas</button>`);
    const slot=(s)=>`<div class="slotcol"><span class="label">${nm(s)}</span>${st.table[s]?esCard(st.table[s]):slotCard()}</div>`;
    root.innerHTML=`
      <div class="scorebar">
        <div class="stat"><span class="label">${nm(bottom)}${tag(bottom)}</span><span class="num">${st.score[bottom]}</span></div>
        <div class="stat"><span class="label">${nm(top)}${tag(top)}</span><span class="num">${st.score[top]}</span></div>
        <div class="stat"><span class="label">En el mazo</span><span class="num">${st.stock.length}</span></div>
        <div class="trump"><div class="stat"><span class="label">Triunfo</span><span class="num">${st.trump}</span></div><div class="cards" style="min-height:0;--cw:46px">${trumpShow}</div></div>
      </div>
      <div><div class="label" style="margin-bottom:6px">${nm(top)} · ${st.hands[top].length} cartas</div><div class="cards" style="--cw:44px">${st.hands[top].map(()=>backCard()).join('')}</div></div>
      <div class="table-mid">${slot(top)}${slot(bottom)}</div>
      <div class="msg" aria-live="polite">${st.msg}</div>
      ${extra.length||st.phase==='over'?`<div class="actions">${extra.join('')}${st.phase==='over'?'<button class="btn primary" type="button" data-new="1">Nueva mano</button><button class="btn" type="button" data-setup="1">Cambiar jugadores</button>':''}</div>`:''}
      <div><div class="label" style="margin-bottom:6px">Mano de ${nm(bottom)}</div>${handHtml}</div>
      <div class="logbox">${st.log.map(l=>`<span>${l}</span>`).join('')}</div>`;
  }
  root.addEventListener('click',e=>{
    if(!st||!st.hands)return;
    const t=e.target.closest('button');if(!t)return;
    if(t.dataset.reveal!==undefined){st.viewer=+t.dataset.reveal;render();return}
    if(t.dataset.hide){st.viewer=null;render();return}
    if(t.dataset.new){deal(Math.random()<.5?0:1);return}
    if(t.dataset.setup){showSetup();return}
    const s=st.turn,human=!st.players[s].ai;
    if(!human||st.viewer!==s)return;
    if(t.dataset.sing&&st.phase==='lead'){sing(s,t.dataset.sing);sortHand(s);render();return}
    if(t.dataset.swap&&st.phase==='lead'&&canSwap(s)){swap(s);render();return}
    if(t.dataset.card!==undefined){
      const idx=+t.dataset.card,c=st.hands[s][idx];if(!c)return;
      if(st.phase==='lead')playCard(s,idx);
      else if(st.phase==='follow'&&legal(st.hands[s],st.table[1-s]).includes(c))playCard(s,idx);
    }
  });
  $('#tu-new').addEventListener('click',()=>{if(st&&st.hands)deal(Math.random()<.5?0:1)});
  $('#tu-setup').addEventListener('click',showSetup);
  return{init(){showSetup()},_dbg:()=>st};
})();
mods.tute=TU;

/* =====================================================
   PÓKER
   ===================================================== */
const PK=(()=>{
  const root=$('#pk');
  const SB=10,BB=20;
  const HAND_NAMES=['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full','Póker','Escalera de color'];
  let g=null,lastSeats=[{ai:false,name:'Jugador 1'},{ai:true,name:'Lola'},{ai:true,name:'Paco'}],lastOpts={chips:1000};

  function eval5(c){
    const rs=c.map(x=>x.r).sort((a,b)=>b-a);
    const flush=c.every(x=>x.s===c[0].s);
    let sh=0;
    if(new Set(rs).size===5){if(rs[0]-rs[4]===4)sh=rs[0];else if(rs[0]===14&&rs[1]===5)sh=5}
    const cnt={};rs.forEach(r=>cnt[r]=(cnt[r]||0)+1);
    const gr=Object.entries(cnt).map(([r,n])=>[+r,n]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    let cat,tb;
    if(sh&&flush){cat=8;tb=[sh]}
    else if(gr[0][1]===4){cat=7;tb=[gr[0][0],gr[1][0]]}
    else if(gr[0][1]===3&&gr[1][1]===2){cat=6;tb=[gr[0][0],gr[1][0]]}
    else if(flush){cat=5;tb=rs}
    else if(sh){cat=4;tb=[sh]}
    else if(gr[0][1]===3){cat=3;tb=gr.map(x=>x[0])}
    else if(gr[0][1]===2&&gr[1][1]===2){cat=2;tb=gr.map(x=>x[0])}
    else if(gr[0][1]===2){cat=1;tb=gr.map(x=>x[0])}
    else{cat=0;tb=rs}
    let s=cat;for(let i=0;i<5;i++)s=s*15+(tb[i]||0);
    return s;
  }
  const combCache={};
  function combos(n){
    if(combCache[n])return combCache[n];
    const out=[];
    (function rec(start,cur){if(cur.length===5){out.push(cur.slice());return}for(let i=start;i<n;i++){cur.push(i);rec(i+1,cur);cur.pop()}})(0,[]);
    return combCache[n]=out;
  }
  function best(cards){
    let b=-1;
    for(const ix of combos(cards.length)){const s=eval5(ix.map(i=>cards[i]));if(s>b)b=s}
    return b;
  }
  const catOf=s=>Math.floor(s/759375);
  function handName(s){
    const cat=catOf(s);
    if(cat===8){const hi=Math.floor(s/50625)%15;return hi===14?'Escalera real':'Escalera de color'}
    return HAND_NAMES[cat];
  }
  const deckNew=()=>shuffle(FS.flatMap(s=>Array.from({length:13},(_,i)=>({r:i+2,s}))));
  function equity(hole,comm,nOpp,sims){
    const known=new Set([...hole,...comm].map(c=>c.r+c.s));
    const rest=deckNew().filter(c=>!known.has(c.r+c.s));
    let win=0;
    for(let k=0;k<sims;k++){
      const d=shuffle(rest.slice());
      let p=0;
      const board=comm.concat(d.slice(p,p+5-comm.length));p+=5-comm.length;
      const mine=best(hole.concat(board));
      let res=1;
      for(let o=0;o<nOpp;o++){
        const oh=[d[p],d[p+1]];p+=2;
        const sc=best(oh.concat(board));
        if(sc>mine){res=0;break}
        if(sc===mine)res=Math.min(res,.5);
      }
      win+=res;
    }
    return win/sims;
  }

  const alive=i=>!g.players[i].out;
  const inHand=p=>!p.out&&!p.folded;
  const canAct=p=>!p.out&&!p.folded&&!p.allIn;
  const pot=()=>g.players.reduce((a,p)=>a+p.total,0);
  const pn=i=>esc(g.players[i].name);
  function nextAlive(from){const n=g.players.length;for(let k=1;k<=n;k++){const i=(from+k+n)%n;if(alive(i))return i}return from}
  function nextActor(from){const n=g.players.length;for(let k=1;k<=n;k++){const i=(from+k)%n;if(canAct(g.players[i]))return i}return -1}
  function pay(p,amt){amt=Math.max(0,Math.min(amt,p.chips));p.chips-=amt;p.bet+=amt;p.total+=amt;if(p.chips===0)p.allIn=true;return amt}

  function showSetup(){
    g=null;
    setupUI(root,{id:'pk',title:'Mesa de póker',intro:'De 2 a 6 asientos, cada uno humano o IA. Con varios humanos, las cartas de cada uno se tapan y aparece una pantalla de cambio de turno. En la mesa hay una IA prudente (Lola) y otras con estilos distintos, hasta Paco, el más agresivo.',seats:lastSeats,min:2,max:6,minHumans:1,
      options:[{id:'chips',label:'Fichas iniciales',values:[{v:500,l:'500'},{v:1000,l:'1000'},{v:2000,l:'2000'}],value:lastOpts.chips}],
      start(seats,o){lastSeats=seats.map(s=>({ai:s.ai,name:s.name}));lastOpts=o;newGame(seats,o)}});
  }
  function newGame(seats,o){
    g={players:seats.map(s=>{const st=s.ai?styleOf(s.name):{agg:0,bluff:0};return{name:s.name,human:!s.ai,chips:o.chips,agg:st.agg,bluff:st.bluff}}),
      dealer:-1,deck:[],community:[],stage:'preflop',currentBet:0,minRaise:BB,toAct:-1,phase:'wait',msg:'',raiseTo:0,handNo:0,token:0,viewer:null,hn:0};
    g.hn=g.players.filter(p=>p.human).length;
    if(g.hn===1)g.viewer=g.players.findIndex(p=>p.human);
    startHand();
  }
  function startHand(){
    g.players.forEach(p=>{if(p.chips<=0)p.out=true});
    const live=g.players.filter(p=>!p.out);
    if(!live.some(p=>p.human)){g.phase='over';g.msg='Todos los jugadores humanos se han quedado sin fichas. Fin de la partida.';render();return}
    if(live.length===1){g.phase='over';g.msg=`${esc(live[0].name)} gana la partida.`;render();return}
    g.handNo++;g.token++;
    if(g.hn>1)g.viewer=null;
    g.players.forEach(p=>{p.hole=[];p.bet=0;p.total=0;p.folded=!!p.out;p.allIn=false;p.acted=false;p.last='';p.show=false;p.win=false;p.score=undefined});
    g.dealer=nextAlive(g.dealer<0?g.players.length-1:g.dealer);
    g.deck=deckNew();g.community=[];g.stage='preflop';
    const liveIdx=g.players.map((p,i)=>i).filter(alive);
    liveIdx.forEach(i=>{g.players[i].hole=[g.deck.pop(),g.deck.pop()];g.players[i].hole.forEach(c=>c._fresh=true)});
    let sb,bb;
    if(liveIdx.length===2){sb=g.dealer;bb=nextAlive(sb)}else{sb=nextAlive(g.dealer);bb=nextAlive(sb)}
    pay(g.players[sb],SB);pay(g.players[bb],BB);
    g.players[sb].last='Ciega pequeña';g.players[bb].last='Ciega grande';
    g.currentBet=BB;g.minRaise=BB;
    g.toAct=nextActor(bb);
    g.msg=`Mano ${g.handNo}. Reparte ${pn(g.dealer)}.`;
    g.raiseTo=0;
    step();
  }
  function roundDone(){
    const actors=g.players.filter(canAct);
    if(actors.length===0)return true;
    if(actors.length===1&&actors[0].bet>=g.currentBet)return true;
    return actors.every(p=>p.acted&&p.bet===g.currentBet);
  }
  function step(){
    const tk=g.token;
    const live=g.players.filter(inHand);
    if(live.length===1){return award(live[0],true)}
    if(roundDone()){return nextStage()}
    const i=g.toAct,p=g.players[i];
    if(p.human){
      if(g.hn>1&&g.viewer!==i)g.viewer=null;
      g.phase='human';render();return;
    }
    g.phase='bot';render();
    sleep(()=>{if(g&&g.token===tk)botAct(i)},650+Math.random()*500);
  }
  function nextStage(){
    g.players.forEach(p=>{p.bet=0;p.acted=false});
    g.currentBet=0;g.minRaise=BB;g.raiseTo=0;
    const tk=g.token;
    const order=['preflop','flop','turn','river','showdown'];
    const ns=order[order.indexOf(g.stage)+1];
    g.stage=ns;
    if(ns==='showdown'){return showdown()}
    const n=ns==='flop'?3:1;
    for(let k=0;k<n;k++){const c=g.deck.pop();c._fresh=true;g.community.push(c)}
    g.toAct=nextActor(g.dealer);
    g.phase='wait';render();
    sleep(()=>{if(g.token===tk)step()},900);
  }
  function act(i,kind,to){
    const p=g.players[i];
    if(p.human&&g.hn>1)g.viewer=null;
    if(kind==='fold'){p.folded=true;p.last='Se retira'}
    else if(kind==='call'){
      const need=g.currentBet-p.bet;
      if(need<=0){p.last='Pasa'}
      else{pay(p,need);p.last=p.allIn?'All-in':'Iguala'}
      p.acted=true;
    }else if(kind==='raise'){
      const maxTo=p.chips+p.bet;
      to=Math.min(Math.max(to,Math.min(g.currentBet+g.minRaise,maxTo)),maxTo);
      const inc=to-g.currentBet;
      pay(p,to-p.bet);
      if(inc>0)g.minRaise=Math.max(g.minRaise,inc);
      const wasBet=g.currentBet===0;
      g.currentBet=Math.max(g.currentBet,p.bet);
      p.last=p.allIn?`All-in ${p.bet}`:(wasBet?`Apuesta ${p.bet}`:`Sube a ${p.bet}`);
      g.players.forEach(q=>{if(q!==p&&canAct(q))q.acted=false});
      p.acted=true;
    }
    g.toAct=nextActor(i);
    g.raiseTo=0;
    step();
  }
  function botAct(i){
    const p=g.players[i];
    const toCall=Math.min(g.currentBet-p.bet,p.chips);
    const potNow=pot();
    const nOpp=g.players.filter(q=>inHand(q)&&q!==p).length;
    const eq=equity(p.hole,g.community,nOpp,nOpp>2?90:130);
    const odds=toCall/(potNow+toCall||1);
    const r=Math.random();
    const size=()=>{const frac=.4+Math.random()*.5;return Math.max(5,Math.round(potNow*frac/5)*5)};
    const raiseTo=()=>Math.min(p.chips+p.bet,g.currentBet+Math.max(g.minRaise,size()));
    const strong=eq>(nOpp>1?.52:.64)*(nOpp>2?.85:1);
    if(toCall===0){
      if(strong&&r<.45+p.agg*.5)return act(i,'raise',raiseTo());
      if(eq<.4&&r<p.bluff)return act(i,'raise',raiseTo());
      return act(i,'call');
    }
    if(eq<odds*.92&&!(r<p.bluff*.5)){
      if(toCall<=BB&&g.stage==='preflop'&&eq>.3/Math.max(1,nOpp/2))return act(i,'call');
      return act(i,'fold');
    }
    if(eq>(nOpp>1?.62:.74)*(nOpp>2?.85:1)&&r<p.agg+.25)return act(i,'raise',raiseTo());
    if(r<p.bluff*.4&&eq>.3)return act(i,'raise',raiseTo());
    return act(i,'call');
  }
  function showdown(){
    g.phase='wait';
    const contenders=g.players.filter(inHand);
    contenders.forEach(p=>{p.show=true;p.score=best(p.hole.concat(g.community))});
    const tot=g.players.filter(p=>p.total>0);
    const levels=[...new Set(tot.map(p=>p.total))].sort((a,b)=>a-b);
    let prev=0;const won=new Map();
    for(const L of levels){
      const slice=tot.reduce((a,p)=>a+Math.min(p.total,L)-Math.min(p.total,prev),0);
      const elig=contenders.filter(p=>p.total>=L);
      if(elig.length===0){
        tot.filter(p=>p.total>prev).forEach(p=>won.set(p,(won.get(p)||0)+(Math.min(p.total,L)-prev)));
      }else{
        const top=Math.max(...elig.map(p=>p.score));
        const ws=elig.filter(p=>p.score===top);
        const share=Math.floor(slice/ws.length);
        ws.forEach((p,k)=>won.set(p,(won.get(p)||0)+share+(k===0?slice-share*ws.length:0)));
      }
      prev=L;
    }
    finishHand(won,false);
  }
  function award(winner,uncontested){
    const won=new Map();won.set(winner,pot());
    finishHand(won,uncontested);
  }
  function finishHand(won,uncontested){
    won.forEach((amt,p)=>{p.chips+=amt;p.win=amt>0});
    const parts=[];
    won.forEach((amt,p)=>{
      if(amt<=0)return;
      parts.push(uncontested?`${esc(p.name)} gana ${amt}: todos se retiran.`:`${esc(p.name)} gana ${amt} con ${handName(p.score)}.`);
    });
    g.players.forEach(p=>{p.bet=0});
    g.phase='end';g.msg=parts.join(' ');
    render();
  }

  function seatHtml(i){
    const p=g.players[i];
    const acting=g.toAct===i&&(g.phase==='bot'||g.phase==='human');
    const isD=g.dealer===i;
    const faceUp=p.show||(p.human&&g.viewer===i);
    let cards='';
    if(p.out)cards='<span class="sub">Eliminado</span>';
    else if(p.folded)cards='<span class="sub">Fuera de la mano</span>';
    else if(p.hole&&p.hole.length)cards=p.hole.map(c=>faceUp?frCard(c,{cls:p.win?'win':''}):backCard()).join('');
    let tag='';
    if(p.show&&p.score!==undefined&&!p.folded)tag=`<span class="badge ${p.win?'good':''}">${handName(p.score)}</span>`;
    else if(p.human&&g.viewer===i&&!p.folded&&!p.out&&g.community.length>=3&&g.phase!=='end')tag=`<span class="badge">${handName(best(p.hole.concat(g.community)))}</span>`;
    let peek='';
    if(g.hn>1&&p.human&&!p.folded&&!p.out&&!p.show){
      peek=g.viewer===i?`<button type="button" class="btn sm" data-hide="1">Ocultar</button>`:`<button type="button" class="btn sm" data-reveal="${i}">Ver cartas</button>`;
    }
    return `<div class="seat${acting?' active':''}${p.out?' out':''}">
      <div class="seat-top"><strong>${esc(p.name)}</strong><span>${isD?'<span class="badge">Dealer</span> ':''}${p.human?'':'<span class="badge">IA</span> '}${tag}</span></div>
      <div class="rowline"><span><span class="label">Fichas</span> <span class="num">${p.chips}</span></span>${p.bet>0?`<span><span class="label">Apuesta</span> <span class="num">${p.bet}</span></span>`:''}${p.last&&!p.out?`<span class="badge ${p.folded?'bad':''}">${p.last}</span>`:''}</div>
      <div class="cards">${cards}</div>${peek}</div>`;
  }
  function controls(){
    if(g.phase==='over')return `<div class="actions"><button class="btn primary" type="button" data-act="again">Nueva partida</button><button class="btn" type="button" data-act="setup">Cambiar jugadores</button></div>`;
    if(g.phase==='end')return `<button class="btn primary" type="button" data-act="next">Siguiente mano</button>`;
    if(g.phase==='human'){
      const i=g.toAct,me=g.players[i];
      if(g.hn>1&&g.viewer!==i)return coverHtml(me.name,i);
      const toCall=Math.min(g.currentBet-me.bet,me.chips);
      const maxTo=me.chips+me.bet;
      const minTo=Math.min(g.currentBet+g.minRaise,maxTo);
      const canRaise=me.chips>toCall&&maxTo>g.currentBet;
      if(!g.raiseTo||g.raiseTo<minTo)g.raiseTo=minTo;
      if(g.raiseTo>maxTo)g.raiseTo=maxTo;
      const callLbl=toCall===0?'Pasar':(toCall>=me.chips?`Igualar all-in (${toCall})`:`Igualar ${toCall}`);
      const verb=g.currentBet===0?'Apostar':'Subir a';
      let h=`${g.hn>1?`<div class="label">Turno de ${esc(me.name)}</div>`:''}<div class="actions"><button class="btn danger" type="button" data-act="fold">Retirarse</button><button class="btn primary" type="button" data-act="call">${callLbl}</button></div>`;
      if(canRaise){
        const potNow=pot();
        const q=(l,v)=>`<button class="btn sm" type="button" data-to="${Math.min(maxTo,Math.max(minTo,Math.round(v/5)*5))}">${l}</button>`;
        h+=`<div class="raise"><button class="btn" type="button" data-act="raise" id="pk-raise">${g.raiseTo>=maxTo?'All-in '+maxTo:verb+' '+g.raiseTo}</button>
          <input type="range" id="pk-range" min="${minTo}" max="${maxTo}" step="5" value="${g.raiseTo}" aria-label="Cantidad a subir">
          ${q('Mínimo',minTo)}${q('½ bote',g.currentBet+potNow/2)}${q('Bote',g.currentBet+potNow)}${q('All-in',maxTo)}</div>`;
      }
      return h;
    }
    return `<span class="sub">${g.phase==='bot'&&g.toAct>=0?`Juega ${pn(g.toAct)}…`:''}</span>`;
  }
  function render(){
    const comm=Array.from({length:5},(_,i)=>g.community[i]?frCard(g.community[i]):slotCard()).join('');
    const stageName={preflop:'Preflop',flop:'Flop',turn:'Turn',river:'River',showdown:'Showdown'}[g.stage];
    root.innerHTML=`
      <div class="board"><div class="rowline" style="justify-content:center"><span class="pot">Bote <span class="num">${pot()}</span></span><span class="badge">${stageName}</span></div><div class="cards">${comm}</div></div>
      <div class="msg" aria-live="polite">${g.msg}</div>
      <div id="pk-ctrl">${controls()}</div>
      <div class="seats">${g.players.map((_,i)=>seatHtml(i)).join('')}</div>`;
  }
  root.addEventListener('click',e=>{
    const t=e.target.closest('button');if(!t||!g)return;
    if(t.dataset.reveal!==undefined){g.viewer=+t.dataset.reveal;render();return}
    if(t.dataset.hide){g.viewer=null;render();return}
    if(t.dataset.to&&g.phase==='human'){g.raiseTo=+t.dataset.to;render();return}
    const a=t.dataset.act;if(!a)return;
    if(a==='again'){newGame(lastSeats,lastOpts);return}
    if(a==='setup'){showSetup();return}
    if(a==='next'&&g.phase==='end'){startHand();return}
    if(g.phase!=='human'||(g.hn>1&&g.viewer!==g.toAct))return;
    if(a==='fold')act(g.toAct,'fold');
    else if(a==='call')act(g.toAct,'call');
    else if(a==='raise')act(g.toAct,'raise',g.raiseTo);
  });
  root.addEventListener('input',e=>{
    if(e.target.id==='pk-range'&&g&&g.phase==='human'){
      g.raiseTo=+e.target.value;
      const me=g.players[g.toAct],maxTo=me.chips+me.bet;
      $('#pk-raise').textContent=g.raiseTo>=maxTo?'All-in '+maxTo:(g.currentBet===0?'Apostar ':'Subir a ')+g.raiseTo;
    }
  });
  $('#pk-new').addEventListener('click',()=>{if(g)newGame(lastSeats,lastOpts)});
  $('#pk-setup').addEventListener('click',showSetup);
  return{init(){showSetup()},_eval:best,_name:handName,_eq:equity,_dbg:()=>g};
})();
mods.poker=PK;

/* =====================================================
   SOLITARIO (Klondike)
   ===================================================== */
const SOL=(()=>{
  const root=$('#sol');
  let st=null,sel=null,hist=[],drawN=1;
  const isRed=s=>s==='♥'||s==='♦';
  function newGame(){
    const d=shuffle(FS.flatMap(s=>Array.from({length:13},(_,i)=>({r:i+1,s,up:false}))));
    const tab=[];
    for(let i=0;i<7;i++){const col=d.splice(0,i+1);col[col.length-1].up=true;tab.push(col)}
    st={tab,found:[[],[],[],[]],stock:d,waste:[],moves:0,won:false};
    sel=null;hist=[];render();
  }
  const snap=()=>{hist.push(JSON.stringify(st));if(hist.length>300)hist.shift()};
  function stackOf(pile,idx){
    if(pile[0]==='t')return st.tab[+pile.slice(1)].slice(idx);
    if(pile==='waste')return st.waste.length?[st.waste[st.waste.length-1]]:[];
    if(pile[0]==='f'){const f=st.found[+pile.slice(1)];return f.length?[f[f.length-1]]:[]}
    return[];
  }
  function canPlace(cards,pile){
    const c=cards[0];if(!c)return false;
    if(pile[0]==='t'){
      const col=st.tab[+pile.slice(1)];
      if(!col.length)return c.r===13;
      const top=col[col.length-1];
      return top.up&&top.r===c.r+1&&isRed(top.s)!==isRed(c.s);
    }
    if(pile[0]==='f'){
      if(cards.length!==1)return false;
      const f=st.found[+pile.slice(1)];
      if(!f.length)return c.r===1;
      const top=f[f.length-1];
      return top.s===c.s&&c.r===top.r+1;
    }
    return false;
  }
  function takeFrom(pile,idx){
    if(pile[0]==='t'){const col=st.tab[+pile.slice(1)];const out=col.splice(idx);if(col.length&&!col[col.length-1].up)col[col.length-1].up=true;return out}
    if(pile==='waste')return[st.waste.pop()];
    return[st.found[+pile.slice(1)].pop()];
  }
  function move(src,dst){
    if(src.pile===dst)return false;
    const cards=stackOf(src.pile,src.idx);
    if(!cards.length||!cards.every(c=>c.up)||!canPlace(cards,dst))return false;
    snap();
    const mv=takeFrom(src.pile,src.idx);
    if(dst[0]==='t')st.tab[+dst.slice(1)].push(...mv);else st.found[+dst.slice(1)].push(...mv);
    st.moves++;
    if(st.found.every(f=>f.length===13))st.won=true;
    return true;
  }
  function toFoundation(pile,idx){
    const cards=stackOf(pile,idx);
    if(cards.length!==1||!cards[0].up||pile[0]==='f')return false;
    const c=cards[0];
    let dst=st.found.findIndex(f=>f.length&&f[f.length-1].s===c.s&&f[f.length-1].r+1===c.r);
    if(dst<0&&c.r===1)dst=st.found.findIndex(f=>!f.length);
    if(dst<0)return false;
    return move({pile,idx},'f'+dst);
  }
  function autoAll(){
    let moved=true,any=false;
    while(moved&&!st.won){
      moved=false;
      for(const p of ['waste','t0','t1','t2','t3','t4','t5','t6']){
        const n=p==='waste'?st.waste.length:st.tab[+p.slice(1)]?.length||0;
        if(n&&toFoundation(p,n-1)){moved=true;any=true}
      }
    }
    return any;
  }
  function drawStock(){
    snap();
    if(st.stock.length){
      for(let k=0;k<drawN&&st.stock.length;k++){const c=st.stock.pop();c.up=true;st.waste.push(c)}
    }else{
      st.stock=st.waste.reverse().map(c=>(c.up=false,c));st.waste=[];
    }
    st.moves++;
  }
  function render(){
    const isSel=(pile,i)=>sel&&sel.pile===pile&&i>=sel.idx;
    const cell=(pile,idx,inner)=>`<div class="scell" data-pile="${pile}"${idx!==undefined?` data-idx="${idx}"`:''}>${inner}</div>`;
    const stock=cell('stock',undefined,st.stock.length?backCard():'<div class="card slot recycle">↺</div>');
    const wn=st.waste.length;
    const waste=cell('waste',wn-1,wn?frCard(st.waste[wn-1],{cls:isSel('waste',wn-1)?'sel':''}):slotCard());
    const founds=st.found.map((f,i)=>cell('f'+i,f.length-1,f.length?frCard(f[f.length-1],{cls:isSel('f'+i,f.length-1)?'sel':''}):`<div class="card slot ghost">${FS[i]}</div>`)).join('');
    const tabs=st.tab.map((col,i)=>`<div class="tcol" data-pile="t${i}">${col.length?col.map((c,k)=>{
      const ov=k===0?'':(col[k-1].up?'ou':'od');
      return `<div class="sc ${ov}" data-pile="t${i}" data-idx="${k}">${c.up?frCard(c,{cls:isSel('t'+i,k)?'sel':''}):backCard()}</div>`;
    }).join(''):'<div class="card slot"></div>'}</div>`).join('');
    root.innerHTML=`
      <div class="actions">
        <button class="btn sm" type="button" data-act="undo" ${hist.length?'':'disabled'}>Deshacer</button>
        <button class="btn sm" type="button" data-act="auto">Subir a los montones</button>
        <button class="btn sm" type="button" data-act="new">Nueva partida</button>
        <span class="seg"><span class="lbl">Robar</span><button class="btn sm${drawN===1?' on':''}" type="button" data-draw="1">1</button><button class="btn sm${drawN===3?' on':''}" type="button" data-draw="3">3</button></span>
        <span class="sub">Movimientos: <span class="num">${st.moves}</span></span>
      </div>
      ${st.won?`<div class="msg">¡Solitario resuelto en ${st.moves} movimientos!</div>`:''}
      <div class="solwrap"><div class="solboard">
        <div class="solrow top">${stock}${waste}<div></div>${founds}</div>
        <div class="solrow tab">${tabs}</div>
      </div></div>`;
  }
  root.addEventListener('click',e=>{
    if(!st)return;
    const b=e.target.closest('button');
    if(b){
      if(b.dataset.draw){drawN=+b.dataset.draw;newGame();return}
      const a=b.dataset.act;
      if(a==='new')newGame();
      else if(a==='undo'&&hist.length){st=JSON.parse(hist.pop());sel=null;render()}
      else if(a==='auto'){sel=null;autoAll();render()}
      return;
    }
    if(st.won)return;
    const el=e.target.closest('[data-pile]');if(!el)return;
    const pile=el.dataset.pile,idx=el.dataset.idx!==undefined?+el.dataset.idx:undefined;
    if(pile==='stock'){sel=null;drawStock();render();return}
    if(sel){
      if(sel.pile===pile&&(idx===undefined||idx===sel.idx)){sel=null;render();return}
      if(move(sel,pile)){sel=null;render();return}
    }
    const cards=idx!==undefined?stackOf(pile,idx):[];
    if(cards.length&&cards[0].up&&pile!=='stock'){sel={pile,idx};}
    else sel=null;
    render();
  });
  root.addEventListener('dblclick',e=>{
    if(!st||st.won)return;
    const el=e.target.closest('[data-pile]');if(!el||el.dataset.idx===undefined)return;
    const pile=el.dataset.pile,idx=+el.dataset.idx;
    if(pile==='stock')return;
    const n=pile==='waste'?st.waste.length:(pile[0]==='t'?st.tab[+pile.slice(1)].length:0);
    if(pile!=='waste'&&(pile[0]!=='t'||idx!==n-1))return;
    sel=null;
    if(toFoundation(pile,idx))render();else render();
  });
  return{init(){newGame()}};
})();
mods.solitario=SOL;

return{go};
}
