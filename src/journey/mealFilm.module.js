/* Meal Film engine.
 *
 *   var film = MealFilm.start(container, data, { THREE: THREE, geo: geo });
 *   film.stop();                       // call before starting another, and when the page is left
 *   film.go('years');                  // optional: jump to an act
 *
 * container  an element with a set height; the film fills it and replaces its contents.
 * data       one person's film summary (see HANDOVER.md, "The film summary").
 * THREE      three.js r128 (npm: three@0.128.0). Falls back to window.THREE.
 * geo        { land: [...], shapes: {...} } from film-geo.json. Optional: without it the maps are plain.
 *
 * Only one film can be on a page at a time (it uses fixed element ids inside the container).
 */
(function(root){
'use strict';
var CSS=".mealfilm{--sky:#0d1330;\n  --ink:#1d2440;\n  --paper:#fffaf0;\n  --accent:#e4572e;\n  --gold:#f2b632;\n  --teal:#1f8a7d;\n  --shade:rgba(29,36,64,.22);\n  --display:'Fredoka','Trebuchet MS','Segoe UI',sans-serif;\n  --body:'Nunito','Segoe UI',system-ui,sans-serif;\n  color-scheme:light;;position:relative;overflow:hidden;background:var(--sky);color:var(--ink);font-family:var(--body);-webkit-tap-highlight-color:transparent;line-height:normal}\n.mealfilm *{box-sizing:border-box}\n.mealfilm #stage{position:absolute;inset:0;touch-action:none;cursor:grab}\n.mealfilm #stage:active{cursor:grabbing}\n.mealfilm #stage canvas{display:block;width:100%;height:100%}\n.mealfilm #overlay{position:absolute;inset:0;overflow:hidden;pointer-events:none}\n.mealfilm .label{position:absolute;left:0;top:0;will-change:transform;white-space:nowrap}\n.mealfilm .label span{display:inline-block;transform:scale(0);opacity:0;transition:transform .28s cubic-bezier(.3,1.7,.5,1),opacity .18s}\n.mealfilm .label.on span{transform:scale(1);opacity:1}\n.mealfilm .card span{background:var(--paper);border:2px solid var(--ink);border-radius:8px;padding:2px 8px;font-family:var(--display);font-weight:600;font-size:14px;box-shadow:0 2px 0 var(--ink)}\n.mealfilm .card b{color:var(--accent);font-variant-numeric:tabular-nums}\n.mealfilm .val span{background:var(--paper);border-radius:999px;padding:0 7px;font-weight:800;font-size:14px;font-variant-numeric:tabular-nums;box-shadow:0 1px 0 var(--shade)}\n.mealfilm .yr span{font-weight:800;font-size:11px;color:var(--ink);font-variant-numeric:tabular-nums}\n.mealfilm .big span{display:flex;flex-direction:column;align-items:center;background:var(--paper);border:3px solid var(--ink);border-radius:16px;padding:3px 16px 6px;box-shadow:0 5px 0 var(--ink);transform-origin:50% 100%}\n.mealfilm .big b{font-family:var(--display);font-weight:700;font-size:48px;line-height:1;color:var(--accent);font-variant-numeric:tabular-nums}\n.mealfilm .big i{font-style:normal;font-weight:800;font-size:14px;letter-spacing:.08em;text-transform:uppercase}\n.mealfilm .big.win span{background:var(--gold)}\n.mealfilm .big.win b{color:var(--ink);font-size:60px}\n.mealfilm .bubble span{background:var(--ink);color:var(--paper);border-radius:14px;padding:6px 11px;font-weight:700;font-size:13px;max-width:200px;white-space:normal;transform-origin:50% 100%}\n.mealfilm .dock{position:absolute;left:16px;right:16px;bottom:16px;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none}\n.mealfilm #caption{font-family:var(--display);font-weight:600;font-size:17px;line-height:1.2;text-align:center;text-wrap:balance;max-width:26em;min-height:2.4em;display:flex;align-items:flex-end;justify-content:center;color:var(--ink)}\n.mealfilm #caption:not(:empty){background:var(--paper);border:3px solid var(--ink);border-radius:16px;padding:8px 14px;box-shadow:0 4px 0 var(--ink);min-height:0}\n.mealfilm .controls{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;pointer-events:auto}\n.mealfilm .big.flash b{font-size:56px}\n.mealfilm .icon span{display:block}\n.mealfilm .icon img{display:block;border-radius:50%;background:var(--paper);border:3px solid var(--gold)}\n@media (max-width:700px){}\n.mealfilm .bar{display:flex;align-items:center;gap:8px;max-width:100%;pointer-events:auto}\n.mealfilm #controls{flex:1 1 auto;min-width:0;flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:none}\n.mealfilm #controls::-webkit-scrollbar{display:none}\n.mealfilm #controls button,.mealfilm #play{flex:0 0 auto}\n.mealfilm #album{position:absolute;left:0;right:0;top:10px;bottom:122px;display:none;pointer-events:none;padding:4px 14px;align-items:center;justify-content:center}\n.mealfilm #album.on{display:flex}\n.mealfilm .book{position:relative;width:100%;max-width:600px;background:#efe4c9;border-left:20px solid #6a1f2a;border-radius:4px 10px 10px 4px;padding:8px 10px 10px;\n  box-shadow:3px 3px 0 #dccfae,6px 6px 0 #cdbf9a,9px 9px 0 #bfb08a,0 18px 30px rgba(0,0,0,.55);transform:translateY(120vh) rotate(-2deg);transition:transform .6s cubic-bezier(.2,1.1,.4,1)}\n.mealfilm .book.in{transform:rotate(-1deg)}\n.mealfilm .book::before{content:\"\";position:absolute;left:-15px;top:14px;bottom:14px;width:10px;background:radial-gradient(circle,#e6c25a 0 3.2px,transparent 3.6px) 0 0/10px 26px repeat-y}\n.mealfilm .book h2{margin:0 0 6px;font-family:var(--display);font-weight:600;font-size:15px;color:#6a1f2a;text-align:center}\n.mealfilm .page{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 7px;transform-origin:left center;transition:transform .32s ease-in,opacity .32s}\n.mealfilm .page.turn{transform:perspective(900px) rotateY(-80deg);opacity:.15}\n.mealfilm .snap{margin:0;min-width:0;background:var(--paper);padding:4px 4px 5px;box-shadow:0 2px 5px rgba(0,0,0,.4);transform:rotate(var(--r,0deg)) scale(0);transition:transform .35s cubic-bezier(.3,1.5,.5,1)}\n.mealfilm .snap.in{transform:rotate(var(--r,0deg)) scale(1)}\n.mealfilm .snap .ph{position:relative;aspect-ratio:4/3;background:#d9d2c0;overflow:hidden}\n.mealfilm .snap img{display:none;width:100%;height:100%;object-fit:cover}\n.mealfilm .snap .ph.ok img{display:block}\n.mealfilm .snap .ph.ok .miss{display:none}\n.mealfilm .snap .miss{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:4px;font-size:9px;font-weight:700;color:#6f6a5c;line-height:1.15}\n.mealfilm .snap figcaption{padding-top:4px;color:var(--ink);line-height:1.15}\n.mealfilm .snap b{display:block;font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.mealfilm .snap i{display:block;font-style:normal;font-size:9px;font-weight:700;color:var(--teal)}\n.mealfilm .snap q{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;quotes:none;font-size:9.5px;font-style:italic;font-weight:600;min-height:2.3em}\n.mealfilm .book .foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;font-size:11px;font-weight:700;color:#6a1f2a}\n.mealfilm #shuffle{pointer-events:auto;padding:5px 12px;font-size:12px}\n@media (min-width:700px){.mealfilm .book{padding:14px 18px 16px}\n.mealfilm .book h2{font-size:19px}\n.mealfilm .page{gap:14px}\n.mealfilm .snap b{font-size:13px}\n.mealfilm .snap i{font-size:11px}\n.mealfilm .snap q{font-size:12px}\n.mealfilm .snap .miss{font-size:11px}}\n@media (prefers-reduced-motion: reduce){.mealfilm .book,.mealfilm .snap,.mealfilm .page{transition:none}}\n.mealfilm #fade{position:absolute;inset:0;pointer-events:none;opacity:0}\n.mealfilm .controls button{padding:6px 10px;font-size:13px}\n.mealfilm button{font:inherit;font-weight:800;font-size:14px;color:var(--ink);background:var(--paper);border:3px solid var(--ink);border-radius:999px;padding:8px 14px;box-shadow:0 3px 0 var(--ink);cursor:pointer}\n.mealfilm button:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}\n.mealfilm button:focus-visible{outline:3px solid var(--gold);outline-offset:2px}\n.mealfilm button[aria-pressed=\"true\"]{background:var(--ink);color:var(--paper)}\n.mealfilm #play{background:var(--accent);color:var(--paper);min-width:6.5em}\n.mealfilm #fail{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:24px;text-align:center;font-weight:700}\n@media (prefers-reduced-motion: reduce){.mealfilm .label span{transition:none}}";
var SHELL="<div id=\"stage\" aria-label=\"3D film of meal numbers. Drag to look around.\"></div><div id=\"fade\"></div><div id=\"overlay\"></div><div id=\"album\" aria-label=\"Photos from these meals\"></div><div class=\"dock\"><div id=\"caption\" aria-live=\"polite\"></div><div class=\"bar\"><div class=\"controls\" id=\"controls\"></div><button type=\"button\" id=\"play\">Pause</button></div></div><div id=\"fail\">This film needs WebGL, and this browser would not start it.</div>";
var NOOP={stop:function(){},go:function(){}};
function ensureHead(){
  if(document.getElementById('mealfilm-css'))return;
  var st=document.createElement('style');st.id='mealfilm-css';st.textContent=CSS;document.head.appendChild(st);
  var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800&display=swap';document.head.appendChild(l);
}
function start(container,DATA,opts){
opts=opts||{};var THREE=opts.THREE||root.THREE,GEO=opts.geo||{};
DATA=JSON.parse(JSON.stringify(DATA));
ensureHead();container.classList.add('mealfilm');container.innerHTML=SHELL;

'use strict';

function fresh(id){var o=document.getElementById(id),n=o.cloneNode(false);o.parentNode.replaceChild(n,o);return n;}
var stage=fresh('stage'), overlay=fresh('overlay');fresh('album');fresh('controls');
var captionEl=document.getElementById('caption'), playBtn=fresh('play');captionEl.textContent='';
var chips={},fadeEl=document.getElementById('fade');
function fail(){document.getElementById('fail').style.display='flex';}
if(!THREE){fail();return NOOP;}
var renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){fail();return NOOP;}

/* ---------- one companion's numbers, generated from the meals workbook ---------- */
var WITH=DATA.me?'':' with '+DATA.name, PAIR=DATA.me?DATA.full:DATA.name+' & '+DATA.host;
var COL={Indian:0xe08a1e,Pub:0xb98545,Continental:0x9a4a2a,Mediterranean:0xd2452f,SouthEastAsian:0x7fb24a,British:0xc8963c,EastAsian:0xd9b77a,LatinAmerican:0xe0b030,Other:0x9a8fd1};
var NICE={SouthEastAsian:'South-East Asian',EastAsian:'East Asian',LatinAmerican:'Latin American',MiddleEast:'Middle East',BBQGrill:'BBQ & Grill',General:'Other',Fastfood:'Fast food'};
function nice(n){return NICE[n]||n;}
DATA.cuisines.forEach(function(c){c.color=COL[c.name]||0x1f8a7d;});
var CUISINES=DATA.cuisines, YEARS=DATA.years, TOTAL=0;CUISINES.forEach(function(c){TOTAL+=c.n;});
var Y0=YEARS[0][0], Y1=YEARS[YEARS.length-1][0];
function q(i){return DATA.comments.length?'“'+DATA.comments[i%DATA.comments.length]+'”':'';}
var DISP="Fredoka,'Trebuchet MS',sans-serif", BODY="Nunito,'Segoe UI',sans-serif";

var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var FOV=50, TAN=Math.tan(FOV*Math.PI/360);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
stage.appendChild(renderer.domElement);
var scene=new THREE.Scene();
scene.background=new THREE.Color(0x0d1330).convertSRGBToLinear();
var camera=new THREE.PerspectiveCamera(FOV,1,0.1,300);
var W=1,H=1,aspect=1;
function resize(){
  W=stage.clientWidth||1;H=stage.clientHeight||1;aspect=W/H;
  renderer.setSize(W,H,false);camera.aspect=aspect;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();var dead=false;
function kill(){if(dead)return;dead=true;window.removeEventListener('resize',resize);try{renderer.dispose();renderer.forceContextLoss();}catch(e){}container.innerHTML='';}

var hemi=new THREE.HemisphereLight(0xffffff,0x7fa7c4,0.95);scene.add(hemi);
scene.fog=new THREE.Fog(0x3a2414,500,1000);var sunOff=new THREE.Vector3(7,16,9);
var sun=new THREE.DirectionalLight(0xfff1d8,1.25);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
var sc=sun.shadow.camera;sc.left=-16;sc.right=16;sc.top=16;sc.bottom=-16;sc.near=1;sc.far=60;
sun.shadow.bias=-0.0006;
scene.add(sun);scene.add(sun.target);

function mat(color,o){o=o||{};o.color=color;if(o.roughness===undefined)o.roughness=0.85;o.metalness=0;var m=new THREE.MeshStandardMaterial(o);m.color.convertSRGBToLinear();return m;}
function mesh(geo,m,cast,recv){var x=new THREE.Mesh(geo,m);x.castShadow=cast!==false;x.receiveShadow=!!recv;return x;}
var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}
function smooth(u){u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);}

/* ---------- labels drawn as HTML over the 3D scene ---------- */
function makeLabel(html,cls,anchor){
  var d=document.createElement('div');d.className='label '+cls;
  var s=document.createElement('span');s.innerHTML=html;d.appendChild(s);overlay.appendChild(d);
  return {el:d,span:s,pos:new THREE.Vector3(),on:false,anchor:anchor||'-50%,-50%'};
}
function setOn(l,b){if(l.on!==b){l.on=b;l.el.classList.toggle('on',b);}}
var pv=new THREE.Vector3();
function place(l){
  pv.copy(l.pos).project(camera);
  if(pv.z>1||pv.z<-1){l.el.style.visibility='hidden';return;}
  l.el.style.visibility='visible';
  var tr='translate('+((pv.x*0.5+0.5)*W).toFixed(1)+'px,'+((-pv.y*0.5+0.5)*H).toFixed(1)+'px) translate('+l.anchor+')';
  if(l.world&&l.img){l.img.style.width=l.img.style.height=Math.max(8,l.world*H/(2*camera.position.distanceTo(l.pos)*TAN)).toFixed(1)+'px';}
  if(l.scaleBy){var d=camera.position.distanceTo(l.pos);tr+=' scale('+Math.max(0.42,Math.min(1.25,l.scaleBy/d)).toFixed(3)+')';}
  l.el.style.transform=tr;
}

/* ---------- Rich ---------- */
function makePerson(o){o=o||{};
  var outer=new THREE.Group(), pivot=new THREE.Group(), inner=new THREE.Group();
  pivot.position.y=0.65;inner.position.y=-0.65;outer.add(pivot);pivot.add(inner);
  var skin=mat(o.skin||0xf1c7a3), shirt=mat(o.shirt||0x2f6fde), trousers=mat(0x1d2440), hair=mat(o.hair||0x5a3a22), black=mat(0x111111,{roughness:0.4});
  [-0.12,0.12].forEach(function(x){var l=mesh(new THREE.CylinderGeometry(0.09,0.09,0.36,10),trousers);l.position.set(x,0.18,0);inner.add(l);
    var f=mesh(new THREE.BoxGeometry(0.16,0.08,0.26),black);f.position.set(x,0.04,0.05);inner.add(f);});
  var body=mesh(new THREE.CylinderGeometry(0.23,0.29,0.56,14),shirt);body.position.y=0.62;inner.add(body);
  var head=mesh(new THREE.SphereGeometry(0.27,18,14),skin);head.position.y=1.12;inner.add(head);
  var h=mesh(new THREE.SphereGeometry(0.285,18,10,0,Math.PI*2,0,Math.PI*0.48),hair);h.position.y=1.14;h.rotation.x=-0.25;inner.add(h);
  if(o.long){var lh=mesh(new THREE.SphereGeometry(0.3,14,10),hair);lh.scale.set(1,1.3,0.75);lh.position.set(0,0.96,-0.1);inner.add(lh);}
  [-0.1,0.1].forEach(function(x){
    if(o.glasses!==false){var g=mesh(new THREE.TorusGeometry(0.075,0.016,6,18),black,false);g.position.set(x,1.13,0.245);inner.add(g);}
    var e=mesh(new THREE.SphereGeometry(0.028,8,8),black,false);e.position.set(x,1.13,0.25);inner.add(e);});
  var smile=mesh(new THREE.TorusGeometry(0.07,0.014,6,12,Math.PI),black,false);smile.position.set(0,1.03,0.25);smile.rotation.z=Math.PI;inner.add(smile);
  var arms=[];
  [1,-1].forEach(function(s){var a=new THREE.Group();a.position.set(0.3*s,0.84,0);
    var m=mesh(new THREE.CylinderGeometry(0.06,0.06,0.4,8),shirt);m.position.y=-0.2;a.add(m);
    var hand=mesh(new THREE.SphereGeometry(0.075,8,8),skin);hand.position.y=-0.42;a.add(hand);
    inner.add(a);arms.push(a);});
  var chute=new THREE.Group();chute.visible=false;outer.add(chute);
  var can=mesh(new THREE.SphereGeometry(1.25,16,8,0,Math.PI*2,0,Math.PI/2),mat(0xe4572e,{side:THREE.DoubleSide,flatShading:true}));can.position.y=2.5;chute.add(can);
  [-1,1].forEach(function(s){var ln=mesh(new THREE.CylinderGeometry(0.012,0.012,2.1,4),mat(0xfffaf0),false);ln.position.set(s*0.6,1.75,0);ln.rotation.z=s*0.52;chute.add(ln);});
  return {outer:outer,pivot:pivot,armL:arms[0],armR:arms[1],chute:chute};
}
var rich=makePerson(DATA.full==='Rich Benson'?{}:(function(){var h=0,n=DATA.full,k;for(k=0;k<n.length;k++)h=(h*31+n.charCodeAt(k))%9973;
  return {shirt:[0x2f6fde,0xe4572e,0x1f8a7d,0x9a8fd1,0xd23c6a,0x3f8a3a][h%6],hair:[0x5a3a22,0x2a1a10,0xd9b24a,0x8a4a2a,0xb0b0b0,0x1a1a1a][(h>>2)%6],skin:[0xf1c7a3,0xe0ac80,0xf6d7b8,0xc98e62][(h>>4)%4],glasses:h%3===0,long:h%2===1};})());scene.add(rich.outer);
var bubble=makeLabel('','bubble','-50%,-100%');

/* ---------- splash particles ---------- */
var parts=[];
(function(){var geo=new THREE.SphereGeometry(0.08,6,5);
  for(var i=0;i<70;i++){var m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({roughness:0.6}));m.visible=false;scene.add(m);parts.push({m:m,v:new THREE.Vector3(),life:0});}})();
function splash(p,color,n,power){
  var k=0;for(var i=0;i<parts.length&&k<n;i++){var q=parts[i];if(q.life>0)continue;k++;
    var a=rnd()*Math.PI*2, r=0.3+rnd()*0.7;
    q.m.position.set(p.x+Math.cos(a)*0.25,p.y,p.z+Math.sin(a)*0.25);
    q.v.set(Math.cos(a)*r*power*0.45,power*(0.6+rnd()*0.6),Math.sin(a)*r*power*0.45);
    q.m.material.color.setHex(color).convertSRGBToLinear();q.m.scale.setScalar(0.6+rnd()*1.2);q.m.visible=true;q.life=1.6;}
}
function stepParts(dt){for(var i=0;i<parts.length;i++){var q=parts[i];if(q.life<=0)continue;q.life-=dt;q.v.y-=13*dt;q.m.position.addScaledVector(q.v,dt);if(q.life<=0)q.m.visible=false;}}
function clearParts(){parts.forEach(function(q){q.life=0;q.m.visible=false;});}

/* ---------- shared hop maths ---------- */
function hopPose(segs,t,start){
  var o={x:start.x,y:start.y,z:start.z,air:false,u:0,seg:null,landed:-1,since:99};
  for(var i=0;i<segs.length;i++){var s=segs[i];
    if(t>=s.t1){o.x=s.b.x;o.y=s.b.y;o.z=s.b.z;o.landed=i;o.since=t-s.t1;}
    else if(t>=s.t0){var u=(t-s.t0)/(s.t1-s.t0);
      o.x=s.a.x+(s.b.x-s.a.x)*u;o.z=s.a.z+(s.b.z-s.a.z)*u;
      o.y=s.a.y+(s.b.y-s.a.y)*u+s.H*4*u*(1-u);o.air=true;o.u=u;o.seg=s;break;}
    else break;}
  return o;
}
function squash(since){var sy=1-0.28*Math.exp(-7*since)*Math.cos(17*since);var sx=1/Math.sqrt(sy);rich.pivot.scale.set(sx,sy,sx);}
function kFit(){return Math.max(1,Math.min(2.3,0.78/aspect));}

/* ---------- textures and shared materials ---------- */
var textTex=[];
function canvasTex(w,h,draw,isText){var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  var t=new THREE.CanvasTexture(c);if(isText)textTex.push(function(){draw(c.getContext('2d'),w,h);t.needsUpdate=true;});t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
function woodTex(base,planks){return canvasTex(512,256,function(c,w,h){
  c.fillStyle=base;c.fillRect(0,0,w,h);var ph=h/planks;
  for(var i=0;i<planks;i++){
    c.fillStyle='rgba('+(rnd()>0.5?'255,225,170':'60,30,10')+','+(0.04+rnd()*0.12)+')';c.fillRect(0,i*ph,w,ph);
    for(var j=0;j<24;j++){var y=i*ph+rnd()*ph;c.strokeStyle='rgba(70,35,10,'+(0.05+rnd()*0.16)+')';c.lineWidth=0.6+rnd()*1.5;
      c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*0.3,y+(rnd()-0.5)*9,w*0.65,y+(rnd()-0.5)*9,w,y);c.stroke();}
    c.fillStyle='rgba(35,18,6,.6)';c.fillRect(0,i*ph,w,2);}
});}
var glowTex=canvasTex(128,128,function(c,w){var g=c.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,w);});
function glow(color,size,opacity){var m=new THREE.SpriteMaterial({map:glowTex,color:color,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:opacity,fog:false});
  var sp=new THREE.Sprite(m);sp.scale.setScalar(size);return sp;}
function texMat(tex,rough){return new THREE.MeshStandardMaterial({map:tex,roughness:rough,metalness:0});}
var MC={};
function M(hex,rough,flat){var k=hex+'_'+rough+'_'+(flat?1:0);if(!MC[k])MC[k]=mat(hex,{roughness:rough===undefined?0.8:rough,flatShading:!!flat});return MC[k];}
var copper=mat(0xd07a3e,{roughness:0.3,flatShading:true,side:THREE.DoubleSide});copper.metalness=0.45;
var shiny=[copper];
function glaze(hex){var m=mat(hex,{roughness:0.22,side:THREE.DoubleSide});return m;}
var G={sph:new THREE.SphereGeometry(1,14,10),ico:new THREE.IcosahedronGeometry(1,0),ico1:new THREE.IcosahedronGeometry(1,1),box:new THREE.BoxGeometry(1,1,1),
  cyl:new THREE.CylinderGeometry(1,1,1,18),cone:new THREE.ConeGeometry(1,1,10),dome:new THREE.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2)};
function put(g,geo,m,x,y,z,sx,sy,sz,rx,ry,rz,cast){var o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy===undefined?sx:sy,sz===undefined?sx:sz);
  o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=!!cast;o.receiveShadow=true;g.add(o);return o;}
function torus(g,m,R,tube,x,y,z,arc,rx,ry,rz){var o=new THREE.Mesh(new THREE.TorusGeometry(R,tube,6,28,arc||Math.PI*2),m);o.position.set(x,y,z);
  o.rotation.set(rx===undefined?Math.PI/2:rx,ry||0,rz||0);o.receiveShadow=true;g.add(o);return o;}
function bowlPts(r,depth,base,pow){var p=[new THREE.Vector2(0.001,0.03)];for(var k=0;k<=8;k++){var a=k/8;
  p.push(new THREE.Vector2(r*(base+(1-base)*Math.sin(a*Math.PI/2)),0.03+depth*Math.pow(a,pow)));}return p;}
function radAt(r,depth,base,pow,y){var a=Math.pow(Math.max(0,Math.min(1,(y-0.03)/depth)),1/pow);return r*(base+(1-base)*Math.sin(a*Math.PI/2))*0.985;}
function vessel(g,r,depth,base,pow,m,seg){var o=new THREE.Mesh(new THREE.LatheGeometry(bowlPts(r,depth,base,pow),seg||36),m);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function sauce(g,r,depth,base,pow,y,hex){var o=new THREE.Mesh(new THREE.CircleGeometry(radAt(r,depth,base,pow,y),36),M(hex,0.28));o.rotation.x=-Math.PI/2;o.position.y=y;o.receiveShadow=true;g.add(o);}
function spot(r,lo,hi){var a=rnd()*Math.PI*2,d=(lo+rnd()*(hi-lo))*r;return [Math.cos(a)*d,Math.sin(a)*d];}

/* ---------- the dishes: one per cuisine, each returns the height Rich lands at ---------- */
var DISH={
  Indian:function(g,r){
    var d=0.62*r,fy=0.5*r,i,p;
    vessel(g,r,d,0.4,1.15,copper,22);torus(g,copper,r,0.055*r,0,d+0.03,0);
    [1,-1].forEach(function(s){torus(g,copper,0.3*r,0.045*r,0,d-0.02,s*(r+0.03),Math.PI,s*1.1);});
    sauce(g,r,d,0.4,1.15,fy,0xd4691a);
    for(i=0;i<10;i++){p=spot(r,0.28,0.78);put(g,G.box,M(i%3?0xc8843a:0x94551f,0.8,true),p[0],fy+0.03*r,p[1],0.2*r,0.13*r,0.17*r,rnd(),rnd()*3,rnd());}
    torus(g,M(0xfff4e0,0.4),0.5*r,0.022*r,0,fy+0.012*r,0,4.4,Math.PI/2,0,1);
    torus(g,M(0xfff4e0,0.4),0.27*r,0.02*r,0.05*r,fy+0.012*r,0,4.2,Math.PI/2,0,3.4);
    for(i=0;i<9;i++){p=spot(r,0.15,0.8);put(g,G.ico,M(0x4f9a3a,0.8,true),p[0],fy+0.07*r,p[1],0.075*r,0.016*r,0.075*r,0,rnd()*3,0);}
    for(i=0;i<3;i++){p=spot(r,0.2,0.6);torus(g,M(0xb24a8c,0.5),0.12*r,0.016*r,p[0],fy+0.08*r,p[1],0,Math.PI/2+(rnd()-0.5)*0.5);}
    put(g,G.cone,M(0xc0261c,0.4),0.45*r,fy+0.07*r,0.45*r,0.04*r,0.34*r,0.04*r,0,0.6,Math.PI/2);
    var naan=new THREE.Group();naan.position.set(0.8*r,d+0.16*r,-0.2*r);naan.rotation.set(0.15,0.2,1.0);g.add(naan);
    put(naan,G.sph,M(0xecd3a3,0.9),0,0,0,0.5*r,0.045*r,0.36*r,0,0,0,true);
    for(i=0;i<6;i++)put(naan,G.sph,M(0x8a5a2c,0.9),(rnd()-0.5)*0.6*r,0.035*r,(rnd()-0.5)*0.4*r,0.05*r,0.012*r,0.05*r);
    put(naan,G.box,M(0xf6d65a,0.4),0.05*r,0.06*r,0,0.09*r,0.04*r,0.09*r);
    return fy;
  },
  Italian:function(g,r){
    var d=0.48*r,fy=0.36*r,i,p,china=glaze(0xfffaf0);
    vessel(g,r,d,0.5,0.85,china);torus(g,M(0xc23b2a,0.4),r,0.028*r,0,d+0.03,0);
    sauce(g,r,d,0.5,0.85,fy,0xc23a26);
    for(i=0;i<16;i++){p=spot(r,0,0.16);torus(g,M(0xf2d684,0.6),(0.2+rnd()*0.36)*r,0.028*r,p[0],fy+(0.03+rnd()*0.12)*r,p[1],0,Math.PI/2+(rnd()-0.5)*0.5,(rnd()-0.5)*0.5);}
    for(i=0;i<5;i++){p=spot(r,0.3,0.6);put(g,G.ico1,M(0x7a4424,0.9,true),p[0],fy+0.13*r,p[1],0.12*r);}
    for(i=0;i<4;i++){p=spot(r,0.1,0.5);put(g,G.sph,M(0x3f8f3a,0.7),p[0],fy+0.2*r,p[1],0.11*r,0.012*r,0.07*r,0,rnd()*3,0.2);}
    return fy+0.12*r;
  },
  Pub:function(g,r){
    var fy=0.1*r,i,stone=glaze(0xf3ead8);
    var o=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001,0.03),new THREE.Vector2(0.62*r,0.03),new THREE.Vector2(0.82*r,0.03+0.07*r),new THREE.Vector2(r,0.03+0.16*r)],40),stone);
    o.castShadow=true;o.receiveShadow=true;g.add(o);torus(g,M(0x2f4f8f,0.4),r,0.026*r,0,0.03+0.16*r,0);
    put(g,G.ico1,M(0xd69a3c,0.9,true),0,fy+0.11*r,-0.36*r,0.56*r,0.11*r,0.23*r,0,0.2,0,true);
    for(i=0;i<30;i++)put(g,G.box,M(i%2?0xf0c24f:0xe6b03c,0.8),(rnd()-0.5)*0.95*r,fy+(0.03+rnd()*0.13)*r,(0.12+rnd()*0.5)*r,0.3*r,0.055*r,0.055*r,0,rnd()*3,(rnd()-0.5)*0.5);
    put(g,G.cyl,glaze(0xffffff),0.6*r,fy+0.07*r,-0.02*r,0.16*r,0.14*r,0.16*r);
    put(g,G.sph,M(0x6fae3f,0.9),0.6*r,fy+0.14*r,-0.02*r,0.14*r,0.06*r,0.14*r);
    put(g,G.sph,M(0xf4d83a,0.6),-0.62*r,fy+0.06*r,0.02*r,0.11*r,0.07*r,0.06*r,0,0.5,0);
    return fy+0.05*r;
  },
  Chinese:function(g,r){
    var fy=0.3*r,i,bam=mat(0xd8b475,{roughness:0.85,side:THREE.DoubleSide});
    var w=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.55*r,32,1,true),bam);w.position.y=0.03+0.275*r;w.castShadow=true;w.receiveShadow=true;g.add(w);
    torus(g,M(0xa9824a,0.8),1.01*r,0.035*r,0,0.1*r,0);torus(g,M(0xa9824a,0.8),1.01*r,0.035*r,0,0.03+0.52*r,0);
    var b=new THREE.Mesh(new THREE.CircleGeometry(0.985*r,32),M(0xc9a468,0.9));b.rotation.x=-Math.PI/2;b.position.y=fy;b.receiveShadow=true;g.add(b);
    for(i=0;i<6;i++){var a=i/6*Math.PI*2+0.3,x=Math.cos(a)*0.58*r,z=Math.sin(a)*0.58*r;
      put(g,G.sph,M(0xfaf3e6,0.6),x,fy+0.12*r,z,0.2*r,0.14*r,0.2*r);put(g,G.cone,M(0xf1e7d2,0.6,true),x,fy+0.27*r,z,0.07*r,0.08*r,0.07*r);}
    put(g,G.cyl,M(0x7a1f1a,0.4),0.05*r,0.03+0.59*r,-0.55*r,0.02*r,2.35*r,0.02*r,0,0.12,Math.PI/2,true);
    put(g,G.cyl,M(0x7a1f1a,0.4),0,0.03+0.59*r,-0.68*r,0.02*r,2.35*r,0.02*r,0,0.2,Math.PI/2,true);
    return fy+0.02*r;
  },
  Thai:function(g,r){
    var d=0.62*r,fy=0.5*r,i,p;
    vessel(g,r,d,0.38,1.1,glaze(0x1b6a74));torus(g,M(0xd9a53a,0.35),r,0.03*r,0,d+0.03,0);
    sauce(g,r,d,0.38,1.1,fy,0xa9c867);
    put(g,G.dome,M(0xfdfbf4,0.9),-0.42*r,fy,0.25*r,0.3*r);
    for(i=0;i<6;i++){p=spot(r,0.2,0.75);torus(g,M(0xd0281e,0.4),0.04*r,0.014*r,p[0],fy+0.015*r,p[1]);}
    for(i=0;i<6;i++){p=spot(r,0.2,0.75);put(g,G.sph,M(0x2f6a2f,0.7),p[0],fy+0.03*r,p[1],0.1*r,0.012*r,0.06*r,0,rnd()*3,0);}
    for(i=0;i<6;i++){p=spot(r,0.25,0.7);put(g,G.box,M(i%2?0x6a3a7a:0xe3d6ee,0.7,true),p[0],fy+0.02*r,p[1],0.13*r,0.09*r,0.11*r,rnd(),rnd()*3,0);}
    put(g,G.sph,M(0x8fc93a,0.6),0.2*r,d+0.07*r,0.97*r,0.14*r,0.09*r,0.07*r,0,0.2,0);
    return fy;
  },
  Japanese:function(g,r){
    var d=0.66*r,fy=0.52*r,i,p;
    vessel(g,r,d,0.45,1.2,glaze(0x191514));torus(g,M(0xb3261e,0.3),r,0.035*r,0,d+0.03,0);
    sauce(g,r,d,0.45,1.2,fy,0xd8a65c);
    for(i=0;i<10;i++){p=spot(r,0,0.25);torus(g,M(0xf5e2a0,0.6),(0.15+rnd()*0.27)*r,0.022*r,p[0],fy+(0.02+rnd()*0.05)*r,p[1],0,Math.PI/2+(rnd()-0.5)*0.3,(rnd()-0.5)*0.3);}
    [[-0.5,0.3],[-0.28,0.52]].forEach(function(q){put(g,G.cyl,M(0xfffdf5,0.5),q[0]*r,fy+0.03*r,q[1]*r,0.13*r,0.05*r,0.13*r);put(g,G.cyl,M(0xf2a21e,0.5),q[0]*r,fy+0.06*r,q[1]*r,0.07*r,0.02*r,0.07*r);});
    [-0.2,0.2].forEach(function(z){put(g,G.box,M(0x1f3a26,0.7),0.62*r,fy+0.17*r,z*r,0.012*r,0.38*r,0.3*r,0,0,-0.25,true);});
    put(g,G.cyl,M(0xffffff,0.5),0.3*r,fy+0.03*r,-0.5*r,0.1*r,0.03*r,0.1*r);torus(g,M(0xf08aa8,0.5),0.05*r,0.013*r,0.3*r,fy+0.05*r,-0.5*r);
    for(i=0;i<9;i++){p=spot(r,0.2,0.75);torus(g,M(0x6fbf4a,0.6),0.03*r,0.012*r,p[0],fy+0.015*r,p[1]);}
    return fy+0.03*r;
  },
  Other:function(g,r){
    var d=0.58*r,fy=0.46*r,i,p,cols=[0x6fb04a,0x8fc95a,0x4f9a3a,0xd23c2f,0xf2c53a,0x7a3f8a,0xf2efe6];
    vessel(g,r,d,0.42,1.1,mat(0xb4603a,{roughness:0.7,side:THREE.DoubleSide}));
    sauce(g,r,d,0.42,1.1,fy,0x5f9f3f);
    for(i=0;i<26;i++){p=spot(r,0,0.8);var s=(0.09+rnd()*0.07)*r;put(g,G.ico,M(cols[i%cols.length],0.8,true),p[0],fy+rnd()*0.08*r,p[1],s,s*0.6,s,rnd(),rnd()*3,rnd());}
    return fy+0.04*r;
  }
};

DISH.Mediterranean=DISH.Italian;DISH.SouthEastAsian=DISH.Thai;DISH.EastAsian=DISH.Chinese;
DISH.Continental=function(g,r){ /* an enamel casserole of stew, with bread */
  var fy=0.55*r,i,p,en=glaze(0xe2571e);
  var o=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001,0.03),new THREE.Vector2(0.84*r,0.03),new THREE.Vector2(0.96*r,0.2*r),new THREE.Vector2(r,0.72*r)],36),en);o.castShadow=true;o.receiveShadow=true;g.add(o);
  torus(g,M(0xf3ead8,0.4),r,0.035*r,0,0.72*r,0);[1,-1].forEach(function(sd){put(g,G.box,en,0,0.62*r,sd*1.08*r,0.42*r,0.1*r,0.2*r,0,0,0,true);});
  var st=new THREE.Mesh(new THREE.CircleGeometry(0.965*r,36),M(0x7a3e22,0.3));st.rotation.x=-Math.PI/2;st.position.y=fy;st.receiveShadow=true;g.add(st);
  for(i=0;i<8;i++){p=spot(r,0.25,0.8);put(g,G.ico1,M(0x4a2414,0.8,true),p[0],fy+0.03*r,p[1],0.13*r,0.1*r,0.13*r,rnd(),rnd()*3,0);}
  for(i=0;i<8;i++){p=spot(r,0.2,0.8);put(g,G.cyl,M(0xe8842a,0.6),p[0],fy+0.03*r,p[1],0.07*r,0.07*r,0.07*r,rnd(),0,rnd());}
  for(i=0;i<5;i++){p=spot(r,0.25,0.75);put(g,G.sph,M(0xead9a8,0.7),p[0],fy+0.02*r,p[1],0.11*r,0.08*r,0.11*r);}
  for(i=0;i<6;i++){p=spot(r,0.1,0.8);put(g,G.sph,M(0x3f7a34,0.7),p[0],fy+0.06*r,p[1],0.08*r,0.012*r,0.04*r,0,rnd()*3,0);}
  [-0.25,0.2].forEach(function(z,k){put(g,G.cyl,M(0xe2c48a,0.9),0.86*r,0.86*r+k*0.04*r,z*r,0.2*r,0.07*r,0.2*r,0,0,1.1,true);});
  return fy;
};
DISH.British=function(g,r){ /* a golden pie in its dish */
  var d=0.3*r,i;
  var o=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001,0.03),new THREE.Vector2(0.76*r,0.03),new THREE.Vector2(r,d)],36),glaze(0x2f4f8f));o.castShadow=true;o.receiveShadow=true;g.add(o);
  put(g,G.dome,M(0xd9a441,0.75),0,d-0.02*r,0,0.96*r,0.42*r,0.96*r,0,0,0,true);
  for(i=0;i<18;i++){var a=i/18*6.283;put(g,G.sph,M(0xc8892e,0.8),Math.cos(a)*0.93*r,d+0.02*r,Math.sin(a)*0.93*r,0.09*r,0.06*r,0.09*r);}
  [-0.14,0,0.14].forEach(function(x){put(g,G.box,M(0x7a4a1a,0.8),x*r,d+0.4*r,0,0.03*r,0.02*r,0.22*r);});
  put(g,G.sph,M(0xb9792a,0.8),0.3*r,d+0.33*r,0.3*r,0.12*r,0.02*r,0.06*r,0,0.6,0.3);
  return d+0.39*r;
};
DISH.LatinAmerican=function(g,r){ /* tacos, salsa and guacamole */
  var fy=0.1*r,i,j,shell=mat(0xe9c04a,{roughness:0.85,side:THREE.DoubleSide}),half=new THREE.CircleGeometry(0.36*r,14,0,Math.PI);
  var o=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001,0.03),new THREE.Vector2(0.62*r,0.03),new THREE.Vector2(0.82*r,0.03+0.07*r),new THREE.Vector2(r,0.03+0.16*r)],40),glaze(0xc8643a));o.castShadow=true;o.receiveShadow=true;g.add(o);
  [-0.42,0,0.42].forEach(function(z){[1,-1].forEach(function(sd){var h=new THREE.Mesh(half,shell);h.position.set(-0.1*r,fy,z*r+sd*0.07*r);h.rotation.x=sd*0.38;h.castShadow=true;g.add(h);});
    for(j=0;j<7;j++)put(g,G.ico,M([0x7a4424,0x4f9a3a,0xd23c2f,0xfffaf0,0xf2c53a][j%5],0.8,true),-0.1*r+(j-3)*0.09*r,fy+(0.2-Math.abs(j-3)*0.035)*r,z*r,0.07*r);});
  put(g,G.cyl,glaze(0xfffaf0),0.55*r,fy+0.07*r,-0.35*r,0.17*r,0.14*r,0.17*r);put(g,G.sph,M(0x7fb24a,0.8),0.55*r,fy+0.14*r,-0.35*r,0.15*r,0.06*r,0.15*r);
  put(g,G.cyl,glaze(0xfffaf0),0.55*r,fy+0.07*r,0.35*r,0.17*r,0.14*r,0.17*r);put(g,G.sph,M(0xc8281e,0.6),0.55*r,fy+0.14*r,0.35*r,0.15*r,0.05*r,0.15*r);
  [-0.6,0.62].forEach(function(z){put(g,G.sph,M(0x8fc93a,0.6),-0.6*r,fy+0.05*r,z*r*0.5,0.1*r,0.07*r,0.06*r,0,z,0);});
  return fy+0.3*r;
};

/* ---------- the room around the table ---------- */
function buildRoom(g,pg,L,bowls,flames){
  var X0=-17,X1=L+11,ZW=10,YF=-3.2,YC=10.5,len=X1-X0,mx=(X0+X1)/2,tall=YC-YF,i,x,s;
  var dark=M(0x4a2c18,0.8),mid=M(0x8a5326,0.8),plaster=mat(0xe6c890,{roughness:0.95,side:THREE.DoubleSide}),plaster2=mat(0xc9a36c,{roughness:0.95,side:THREE.DoubleSide});
  var ft=woodTex('#7a4e2c',8);ft.repeat.set(len/10,2.5);
  var floor=mesh(new THREE.PlaneGeometry(len,ZW*2),texMat(ft,0.75),false,true);floor.rotation.x=-Math.PI/2;floor.position.set(mx,YF,0);g.add(floor);
  var ceil=mesh(new THREE.PlaneGeometry(len,ZW*2),plaster2,false,false);ceil.rotation.x=Math.PI/2;ceil.position.set(mx,YC,0);g.add(ceil);
  [1,-1].forEach(function(s){
    var wall=mesh(new THREE.PlaneGeometry(len,tall),plaster,false,true);wall.position.set(mx,YF+tall/2,s*ZW);g.add(wall);
    put(g,G.box,dark,mx,YF+2,s*(ZW-0.13),len,4,0.26);put(g,G.box,mid,mx,YF+4.1,s*(ZW-0.2),len,0.26,0.42);
    for(x=X0+3;x<X1;x+=6){put(g,G.box,dark,x,YF+tall/2,s*(ZW-0.18),0.5,tall,0.36);
      put(g,G.box,dark,x,4.2,s*(ZW-0.5),0.16,0.5,0.4);put(g,G.sph,new THREE.MeshBasicMaterial({color:0xffe2a0,fog:false}),x,4.75,s*(ZW-0.6),0.09,0.2,0.09);
      var sg=glow(0xffb45a,2.6,0.45);sg.position.set(x,4.8,s*(ZW-0.65));g.add(sg);flames.push(sg);}
    [L*0.2,L*0.72].forEach(function(px,k){
      put(g,G.box,dark,px,5.6,s*(ZW-0.25),3.4,2.6,0.2);
      var pt=canvasTex(64,48,function(c,w,h){var gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,k?'#f3c98a':'#a9d3e6');gr.addColorStop(1,'#f6e7c0');c.fillStyle=gr;c.fillRect(0,0,w,h);
        c.fillStyle=k?'#6f8f4a':'#4f7f5a';c.beginPath();c.moveTo(0,h);c.quadraticCurveTo(w*0.3,h*0.3,w*0.6,h*0.75);c.quadraticCurveTo(w*0.8,h*0.5,w,h*0.7);c.lineTo(w,h);c.fill();});
      var pic=mesh(new THREE.PlaneGeometry(2.8,2.0),texMat(pt,0.9),false,false);pic.position.set(px,5.6,s*(ZW-0.37));pic.rotation.y=s>0?Math.PI:0;g.add(pic);});
  });
  [X0,X1].forEach(function(wx){var wall=mesh(new THREE.PlaneGeometry(ZW*2,tall),plaster,false,true);wall.rotation.y=Math.PI/2;wall.position.set(wx,YF+tall/2,0);g.add(wall);
    put(g,G.box,dark,wx+(wx<0?0.13:-0.13),YF+2,0,0.26,4,ZW*2);});
  for(x=X0+3;x<X1;x+=6)put(g,G.box,dark,x,YC-0.35,0,0.6,0.7,ZW*2);
  put(g,G.box,dark,mx,YC-0.25,0,len,0.5,0.6);
  /* window at the far end */
  var wt=canvasTex(256,256,function(c,w,h){var gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#bfe6ff');gr.addColorStop(0.6,'#fff3cf');gr.addColorStop(1,'#ffe1a0');c.fillStyle=gr;c.fillRect(0,0,w,h);
    for(var i=0;i<60;i++){c.fillStyle='rgba('+(60+rnd()*60|0)+','+(140+rnd()*70|0)+',70,'+(0.25+rnd()*0.4)+')';c.beginPath();c.arc(rnd()*w,h*(0.35+rnd()*0.65),10+rnd()*26,0,7);c.fill();}});
  var win=new THREE.Mesh(new THREE.PlaneGeometry(8,6.5),new THREE.MeshBasicMaterial({map:wt,fog:false,toneMapped:false}));win.rotation.y=-Math.PI/2;win.position.set(X1-0.06,4.8,0);g.add(win);
  put(g,G.box,dark,X1-0.2,8.2,0,0.4,0.45,8.9);put(g,G.box,dark,X1-0.2,1.4,0,0.5,0.45,9.3);
  [-4.2,0,4.2].forEach(function(z){put(g,G.box,dark,X1-0.2,4.8,z,0.4,6.8,z?0.45:0.28);});
  put(g,G.box,dark,X1-0.2,5.6,0,0.3,0.26,8.4);
  var wg=glow(0xfff0c0,18,0.28);wg.position.set(X1-1.2,4.8,0);g.add(wg);
  for(i=0;i<54;i++){var u=i/54,py,pz;if(u<0.3){pz=-4.5;py=1.6+u/0.3*6.8;}else if(u<0.7){pz=-4.5+(u-0.3)/0.4*9;py=8.5+Math.sin((u-0.3)/0.4*Math.PI)*-0.5;}else{pz=4.5;py=8.4-(u-0.7)/0.3*6.8;}
    s=0.2+rnd()*0.22;put(g,G.ico,M(i%3?0x3f7a34:0x5f9a44,0.9,true),X1-0.45-rnd()*0.2,py+(rnd()-0.5)*0.3,pz+(rnd()-0.5)*0.4,s,s,s,rnd()*3,rnd()*3,0);}
  /* hanging lamps */
  var shade=new THREE.MeshStandardMaterial({color:0x8a4a14,emissive:0xc46a1c,emissiveIntensity:0.9,side:THREE.DoubleSide,roughness:0.6});
  [L*0.1,L*0.45,L*0.8].forEach(function(lx){
    put(g,G.cyl,dark,lx,(YC+8.4)/2,0,0.03,YC-8.4,0.03);
    var sh=new THREE.Mesh(new THREE.ConeGeometry(0.95,0.75,22,1,true),shade);sh.position.set(lx,8.05,0);g.add(sh);
    put(g,G.sph,new THREE.MeshBasicMaterial({color:0xfff0c8,fog:false}),lx,7.78,0,0.2);
    var lg=glow(0xffc070,5,0.5);lg.position.set(lx,7.7,0);g.add(lg);
    var pl=new THREE.PointLight(0xffb45e,1.0,30,2);pl.position.set(lx,7.5,0);g.add(pl);});
  /* table */
  var tt=woodTex('#c98a45',6);tt.repeat.set(3,1);
  var tlen=L+7,tcx=(L-1)/2,top=mesh(new THREE.BoxGeometry(tlen,0.35,6.4),texMat(tt,0.55),true,true);top.position.set(tcx,-0.175,0);g.add(top);
  put(g,G.box,mid,tcx,-0.6,0,tlen-1.2,0.5,5.4,0,0,0,true);
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(p){put(g,G.box,mid,tcx+p[0]*(tlen/2-0.9),-2,p[1]*2.5,0.6,2.5,0.6,0,0,0,true);});
  /* chairs and place settings */
  var check=canvasTex(32,32,function(c){c.fillStyle='#f6f8ff';c.fillRect(0,0,32,32);c.fillStyle='rgba(47,96,200,.6)';c.fillRect(0,0,16,32);c.fillRect(0,0,32,16);});check.repeat.set(3,2);
  var napkin=texMat(check,0.9),plateM=glaze(0xfffaf0),gold=M(0xc9a23c,0.35);
  for(x=0.4;x<L+1.5;x+=3.4){[1,-1].forEach(function(s){
    var ch=new THREE.Group();ch.position.set(x,0,s*4.7);if(s<0)ch.rotation.y=Math.PI;g.add(ch);
    put(ch,G.box,mid,0,-1.28,0,2,0.18,1.9);
    [[-0.9,-0.85],[0.9,-0.85],[-0.9,0.85],[0.9,0.85]].forEach(function(q){put(ch,G.box,mid,q[0],-2.24,q[1],0.18,1.92,0.18);});
    [-0.9,0.9].forEach(function(q){put(ch,G.box,mid,q,-0.1,0.86,0.18,2.4,0.18);});
    [-0.5,0.15,0.8].forEach(function(q){put(ch,G.box,mid,0,q,0.86,1.9,0.32,0.1);});
    put(g,G.cyl,plateM,x,0.03,s*2.6,0.5,0.05,0.5);
    put(g,G.box,napkin,x+0.8,0.035,s*2.62,0.62,0.05,0.44,0,0.3*s,0);
    put(g,G.box,gold,x-0.72,0.015,s*2.6,0.05,0.02,0.7);});}
  /* candles between the dishes */
  [0,2,4].forEach(function(i,k){
    if(!bowls[i+1])return;
    var cx=(bowls[i].x+bowls[i].r+bowls[i+1].x-bowls[i+1].r)/2,cz=k%2?-1.25:1.25;
    put(pg,G.cyl,gold,cx,0.06,cz,0.24,0.12,0.24,0,0,0,true);put(pg,G.cyl,M(0xf6ecd2,0.6),cx,0.5,cz,0.085,0.8,0.085,0,0,0,true);
    put(pg,G.sph,new THREE.MeshBasicMaterial({color:0xffdf9a,fog:false}),cx,1.03,cz,0.055,0.14,0.055);
    for(var j=0;j<7;j++){var a=j/7*6.28;put(pg,G.ico,M(0x4f8a3a,0.9,true),cx+Math.cos(a)*0.3,0.08,cz+Math.sin(a)*0.3,0.13,0.09,0.13,rnd(),rnd()*3,0);}
    var fg=glow(0xffb040,1.9,0.85);fg.position.set(cx,1.08,cz);pg.add(fg);flames.push(fg);});
  /* dust in the window light */
  var n=90,pos=new Float32Array(n*3);for(i=0;i<n;i++){pos[i*3]=L*0.3+rnd()*(L*0.7+8);pos[i*3+1]=0.5+rnd()*7;pos[i*3+2]=(rnd()-0.5)*9;}
  var pgeo=new THREE.BufferGeometry();pgeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  var motes=new THREE.Points(pgeo,new THREE.PointsMaterial({color:0xffe6b0,size:0.07,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));g.add(motes);
  return {group:g,bounds:{x0:X0+1.2,x1:X1-2,z:ZW-1.2,y:YC-1.4},tick:function(t){
    for(var f=0;f<flames.length;f++){var m=flames[f],b0=m.userData.s||(m.userData.s=m.scale.x);m.scale.setScalar(b0*(1+0.1*Math.sin(t*11+f*2.1)+0.06*Math.sin(t*23+f)));}
    motes.position.y=Math.sin(t*0.3)*0.4;motes.position.z=Math.sin(t*0.17)*0.6;}};
}

var LAY=(function(){var items=CUISINES.slice().sort(function(a,b){return a.n-b.n;}),max=items[items.length-1].n,bowls=[],x=0;
  items.forEach(function(c,i){var r=Math.max(0.6,1.5*Math.sqrt(c.n/max));if(i>0)x+=bowls[i-1].r+r+0.5;bowls.push({c:c,r:r,x:x});});
  while(x<9){x+=1;}return {bowls:bowls,L:Math.max(x,bowls[bowls.length-1].x)};})();
var FEASTPROPS=new THREE.Group();
var ROOM=buildRoom(new THREE.Group(),FEASTPROPS,LAY.L,LAY.bowls,[]);

/* ---------- scene 2: the feast table ---------- */
function buildFeast(){
  var g=FEASTPROPS,bowls=LAY.bowls,L=LAY.L,labels=[],room=ROOM;
  bowls.forEach(function(b,i){
    var dg=new THREE.Group();dg.position.set(b.x,0,0);g.add(dg);
    b.foodY=(DISH[b.c.name]||DISH.Other)(dg,b.r);
    var winr=i===bowls.length-1;
    var l=makeLabel('<b>'+b.c.n+'</b><i>'+nice(b.c.name)+(winr?' · '+Math.round(b.c.n/TOTAL*100)+'%':'')+'</i>','big'+(winr?' win':''),'-50%,-100%');
    l.pos.set(b.x,b.foodY+(winr?2.6:2.3),0);l.scaleBy=10;labels.push(l);
  });
  var start={x:-2.6,y:0,z:0}, P=[start].concat(bowls.map(function(b){return {x:b.x,y:b.foodY,z:0};}));
  var segs=[],t=1.0;
  for(var i=0;i<bowls.length-1;i++){segs.push({t0:t,t1:t+0.75,a:P[i],b:P[i+1],H:1.3});t+=1.3;}
  var last=bowls[bowls.length-1];
  segs.push({t0:t,t1:t+1.5,a:P[bowls.length-1],b:P[bowls.length],H:4.2,flip:true});
  var tSplash=t+1.5, tPop=tSplash+1.0, dur=tPop+5, tDive=t;
  var share=Math.round(last.c.n/TOTAL*100);
  return {
    groups:[room.group,g],labels:labels,duration:dur,lag:2.0,bounds:room.bounds,mood:'room',fadeIn:'#ffe9bf',
    captions:[[0,TOTAL+' meals'+WITH+'. Here is what was on the table.'],[tDive,'And the big one…'],[tSplash,nice(last.c.name)+' wins: '+last.c.n+' meals, '+share+(DATA.me?'% of everything you have eaten.':'% of everything you two have eaten.')]],
    bubbles:[[segs[Math.min(2,segs.length-1)].t1+0.15,segs[Math.min(2,segs.length-1)].t1+2.3,q(0)],[tPop+0.6,dur+1,q(1)]],
    update:function(t,prev){
      var o=hopPose(segs,t,start), yaw=Math.PI/2, flip=0;
      for(var i=0;i<segs.length;i++){
        setOn(labels[i],t>=segs[i].t1);
        if(prev<segs[i].t1&&t>=segs[i].t1){var big=i===segs.length-1;splash(new THREE.Vector3(segs[i].b.x,segs[i].b.y,0),bowls[i].c.color,big?55:9,big?7:3);}
      }
      if(o.air&&o.seg.flip)flip=o.u*Math.PI*2;
      if(t>=tSplash){
        var down=last.foodY-1.4, up=last.foodY-0.42;
        if(t<tPop)o.y=last.foodY+(down-last.foodY)*smooth((t-tSplash)/0.3);
        else{var u=smooth((t-tPop)/0.4);o.y=down+(up-down)*u+Math.sin(t*3)*0.03;
          var face=Math.atan2(camera.position.x-o.x,camera.position.z-o.z);yaw=Math.PI/2+(face-Math.PI/2)*u;}
        rich.pivot.scale.set(1,1,1);
      }else if(o.air)rich.pivot.scale.set(0.94,1.1,0.94);else squash(o.since);
      rich.outer.position.set(o.x,o.y,o.z);rich.outer.rotation.y=yaw;rich.pivot.rotation.x=flip;
      var wave=t>=tPop;
      rich.armL.rotation.z=(o.air||wave)?2.6+(wave?Math.sin(t*9)*0.45:0):0.25;
      rich.armR.rotation.z=(o.air||wave)?-2.6:-0.25;
      room.tick(t);
    },
    cam:function(t){
      /* drone: trails Rich down the table, drifting side to side and closing in and out */
      var k=Math.sqrt(kFit()),p=rich.outer.position,a,R,h;
      if(t>=tSplash){a=0.95-(t-tSplash)*0.2;R=Math.min(7.6,6*k);return {tx:last.x,ty:1.5,tz:0,ox:-Math.cos(a)*R,oy:3.3,oz:Math.sin(a)*R};}
      if(t>=tDive){a=0.95;R=8.2*k;return {tx:last.x-0.8,ty:2.6,tz:0,ox:-Math.cos(a)*R,oy:4.6,oz:Math.sin(a)*R};}
      a=0.8*Math.sin(t*0.45+0.4);R=(6.4+1.7*Math.sin(t*0.31+1))*k;h=3.7+0.7*Math.sin(t*0.37);
      return {tx:p.x+2.2,ty:0.9,tz:0,ox:-Math.cos(a)*R,oy:h,oz:Math.sin(a)*R};
    }
  };
}

/* ---------- the kitchen set behind the year bars ---------- */
function chef(g,x,z,back,skin,tache){
  var c=new THREE.Group();c.position.set(x,-3,z);if(back)c.rotation.y=Math.PI;g.add(c);
  var white=M(0xfafafa,0.8),black=M(0x111111,0.5);
  put(c,G.box,M(0x39404e,0.9),0,0.7,0,1.7,1.4,1.0,0,0,0,true);
  put(c,G.cyl,white,0,3.1,0,1.15,3.6,1.0,0,0,0,true);put(c,G.box,M(0x2f6fde,0.8),0,2.5,0.98,1.5,2.2,0.1);
  torus(c,M(0xd23c2f,0.7),0.62,0.13,0,5.0,0);
  var head=new THREE.Group();head.position.y=5.75;c.add(head);
  put(head,G.sph,M(skin,0.8),0,0,0,0.85,0.85,0.85,0,0,0,true);
  [-0.3,0.3].forEach(function(ex){put(head,G.sph,black,ex,0.1,0.78,0.09);});
  if(tache)put(head,G.box,M(0x3a2414,0.8),0,-0.22,0.82,0.7,0.14,0.1);else torus(head,black,0.2,0.035,0,-0.25,0.76,Math.PI,0,0,Math.PI);
  put(head,G.cyl,white,0,1.05,0,0.78,1.1,0.78,0,0,0,true);put(head,G.sph,white,0,1.75,0,0.98,0.6,0.98,0,0,0,true);
  var arms=[];[1,-1].forEach(function(sd){var a=new THREE.Group();a.position.set(sd*1.2,4.5,0.1);a.rotation.x=-1.0;a.rotation.z=sd*0.25;c.add(a);
    put(a,G.cyl,white,0,-0.9,0,0.3,1.9,0.3,0,0,0,true);put(a,G.sph,M(skin,0.8),0,-1.95,0,0.32);arms.push(a);});
  put(arms[0],G.cyl,M(0xb98545,0.8),0,-2.6,0.3,0.07,1.8,0.07,0.5,0,0);
  return {g:c,head:head,arm:arms[0],x:x,z:z,back:back};
}
function buildKitchen(g,len){
  var x0=-16,x1=len+16,mx=(x0+x1)/2,w=x1-x0,i,steel=mat(0xc3cad2,{roughness:0.35}),steelD=mat(0x8d949c,{roughness:0.45});steel.metalness=0.3;steelD.metalness=0.3;
  var ft=canvasTex(64,64,function(c){c.fillStyle='#e6dfd0';c.fillRect(0,0,64,64);c.fillStyle='#3a3f4a';c.fillRect(0,0,32,32);c.fillRect(32,32,32,32);});ft.repeat.set((w+80)/3.2,20);
  var floor=mesh(new THREE.PlaneGeometry(w+80,64),texMat(ft,0.6),false,true);floor.rotation.x=-Math.PI/2;floor.position.set(mx,-3,22);g.add(floor);
  var wt=canvasTex(64,64,function(c){c.fillStyle='#f4f1e8';c.fillRect(0,0,64,64);c.fillStyle='#b9b4a6';for(var r=0;r<4;r++){c.fillRect(0,r*16,64,1.5);c.fillRect((r%2)*16,r*16,1.5,16);c.fillRect((r%2)*16+32,r*16,1.5,16);}});wt.repeat.set(w/2.4,6);
  var wall=mesh(new THREE.PlaneGeometry(w,15),texMat(wt,0.5),false,true);wall.position.set(mx,4.5,-7.4);g.add(wall);
  put(g,G.box,M(0x39404e,0.8),mx,-2.6,-7.3,w,0.8,0.2);
  /* the steel counter the bars stand on */
  put(g,G.box,steel,len/2,-0.18,0,len+6.4,0.36,3.8,0,0,0,true);put(g,G.box,M(0x4a5560,0.7),len/2,-1.68,0,len+5.6,2.64,3.2,0,0,0,true);
  for(i=0;i<=(len+4)/2.4;i++)put(g,G.box,steelD,-2+i*2.4,-0.9,1.62,0.9,0.1,0.08);
  put(g,G.cyl,M(0xfffaf0,0.5),-2.5,0.2,0.3,0.6,0.4,0.6,0,0,0,true);
  put(g,G.box,M(0xb98545,0.8),len+2.3,0.06,0.2,1.3,0.12,1.9,0,0.2,0,true);
  [0xd23c2f,0xd23c2f,0x4f9a3a,0xf2c53a].forEach(function(cl,k){put(g,G.sph,M(cl,0.6),len+2.0+(k%2)*0.5,0.3,-0.2+(k>1?0.6:0),0.2);});
  /* ranges, pots and the hood along the back wall */
  var steam=[];
  for(var cx=-4,k=0;cx<len+6;cx+=4.6,k++){
    put(g,G.box,steelD,cx,-1.5,-5.9,4.0,3.0,2.4,0,0,0,true);put(g,G.box,M(0x1a1c22,0.6),cx,0.03,-5.9,3.8,0.1,2.2);
    lit(g,cx,-1.75,-4.68,2.3,1.1,0xd9641a);put(g,G.box,steel,cx,-0.95,-4.62,2.6,0.1,0.14);
    [-1.5,-0.5,0.5,1.5].forEach(function(kx){put(g,G.sph,M(0x1a1c22,0.5),cx+kx,-0.45,-4.66,0.1);});
    [-0.95,0.95].forEach(function(px,j){var copperPot=(k+j)%2===0;
      put(g,G.cyl,copperPot?copper:steel,cx+px,0.55,-5.9,0.7,0.95,0.7,0,0,0,true);put(g,G.box,copperPot?copper:steel,cx+px+0.9,0.85,-5.9,0.6,0.1,0.14);
      put(g,G.cyl,M([0xd4691a,0xc23a26,0xa9c867,0xf2d684][(k+j)%4],0.4),cx+px,1.0,-5.9,0.64,0.04,0.64);
      var fl=glow(0x5aa8ff,1.7,0.8);fl.position.set(cx+px,0.12,-5.2);g.add(fl);
      for(var q2=0;q2<2;q2++){var sp=glow(0xffffff,1.3,0.22);sp.material.blending=THREE.NormalBlending;sp.position.set(cx+px,1.2,-5.9);g.add(sp);steam.push({s:sp,x:cx+px,o:rnd()*2+q2});}});
  }
  put(g,G.box,steelD,mx,9.0,-5.7,w*0.86,1.3,3.4,0,0,0,true);put(g,G.box,steel,mx,8.3,-5.7,w*0.86+0.3,0.14,3.7);
  for(var hx=1;hx<len+2;hx+=6.5){var hg=glow(0xfff0d0,4,0.5);hg.position.set(hx,8.1,-4.2);g.add(hg);var pl=new THREE.PointLight(0xfff0d8,0.5,26,2);pl.position.set(hx,7.4,-2.6);g.add(pl);}
  put(g,G.cyl,steel,mx,6.6,-7.05,0.06,w*0.8,0.06,0,0,Math.PI/2);
  for(var rx=-6,n=0;rx<len+8;rx+=1.7,n++){var pan=n%3===0?copper:steel;put(g,G.cyl,pan,rx,5.5,-7.05,0.5+(n%2)*0.15,0.12,0.5+(n%2)*0.15,Math.PI/2,0,0);put(g,G.box,pan,rx,6.2,-7.05,0.1,0.8,0.08);}
  var chefs=[chef(g,len*0.14,-3.3,false,0xf1c7a3,true),chef(g,len*0.5,-3.5,true,0xc98e62,false),chef(g,len*0.86,-3.3,false,0x8a5a3c,false)];
  return {tick:function(t){
    steam.forEach(function(o){var u=((t*0.45+o.o)%1+1)%1;o.s.position.set(o.x+Math.sin(t+o.o*3)*0.2,1.2+u*2.6,-5.9);o.s.material.opacity=0.26*(1-u);o.s.scale.setScalar(1+u*1.6);});
    chefs.forEach(function(c,k){c.g.position.y=-3+Math.sin(t*2+k*2)*0.05;
      if(c.back){c.arm.rotation.x=-1.0+Math.sin(t*5)*0.2;c.arm.rotation.z=0.25+Math.cos(t*5)*0.2;}
      else{c.head.rotation.y=Math.max(-1.1,Math.min(1.1,Math.atan2(rich.outer.position.x-c.x,rich.outer.position.z-c.z)));c.head.rotation.x=-0.12-Math.min(0.25,rich.outer.position.y*0.03);c.arm.rotation.x=-1.0+Math.sin(t*1.5+k)*0.08;}});
  }};
}

/* ---------- scene 3: the year parkour, on the kitchen counter ---------- */
function buildYears(){
  var g=new THREE.Group(), many=YEARS.length>20, STEP=many?0.86:1.3, BW=many?0.7:1.05, UNIT=0.13;
  var max=0,peak=0,total=0;YEARS.forEach(function(y,i){total+=y[1];if(y[1]>max){max=y[1];peak=i;}});
  UNIT=6/Math.max(1,max);
  var kit=buildKitchen(g,(YEARS.length-1)*STEP);
  var lo=new THREE.Color(0x1f8a7d),hi=new THREE.Color(0xe4572e),plateM=mat(0xfffaf0,{roughness:0.5});
  var vals=[],yrs=[],tops=[],pops=[];
  YEARS.forEach(function(y,i){
    var h=Math.max(0.12,y[1]*UNIT),x=i*STEP;
    var col=i===peak?new THREE.Color(0xf2b632):lo.clone().lerp(hi,y[1]/max);
    var bar=mesh(new THREE.BoxGeometry(BW,h,1.7),mat(col.getHex()),true,true);bar.position.set(x,h/2,0);g.add(bar);
    var plate=mesh(new THREE.BoxGeometry(BW+0.09,0.08,1.8),plateM,true,true);plate.position.set(x,h+0.04,0);g.add(plate);
    tops.push({x:x,y:h+0.08,z:0});
    var pw=BW*0.96,ph=pw*0.56,above=h<ph+0.2;
    var nt=canvasTex(128,72,function(c,w,hh){c.clearRect(0,0,w,hh);if(above){c.fillStyle='#fffaf0';c.fillRect(0,0,w,hh);c.strokeStyle='#1d2440';c.lineWidth=6;c.strokeRect(3,3,w-6,hh-6);}
      c.textAlign='center';c.textBaseline='middle';var fs=60;do{c.font='700 '+fs+'px '+DISP;fs-=2;}while(c.measureText(String(y[1])).width>w-16&&fs>20);
      if(!above){c.lineJoin='round';c.lineWidth=9;c.strokeStyle='#1d2440';c.strokeText(String(y[1]),w/2,hh/2+3);}c.fillStyle=above?'#1d2440':'#fffaf0';c.fillText(String(y[1]),w/2,hh/2+3);},true);
    nt.wrapS=nt.wrapT=THREE.ClampToEdgeWrapping;
    var num=new THREE.Mesh(new THREE.PlaneGeometry(pw,ph),new THREE.MeshBasicMaterial({map:nt,transparent:true,fog:false,toneMapped:false}));
    num.position.set(x,above?h+0.1+ph/2:h-ph/2-0.08,above?0.6:0.86);g.add(num);
    var yt=canvasTex(128,64,function(c,w,h){c.fillStyle='#fffaf0';c.fillRect(0,0,w,h);c.strokeStyle='#1d2440';c.lineWidth=5;c.strokeRect(3,3,w-6,h-6);c.fillStyle=i===peak?'#e4572e':'#1d2440';c.textAlign='center';c.textBaseline='middle';c.font='700 46px '+DISP;c.fillText(String(y[0]),w/2,h/2+3);},true);
    yt.wrapS=yt.wrapT=THREE.ClampToEdgeWrapping;var cw=Math.min(1.15,STEP-0.06),card=new THREE.Mesh(new THREE.PlaneGeometry(cw,cw/2),new THREE.MeshBasicMaterial({map:yt,fog:false,toneMapped:false}));
    card.position.set(x,cw/4*0.82+0.02,1.32);card.rotation.x=-0.6;g.add(card);
  });
  var flag=new THREE.Group();
  var pole=mesh(new THREE.CylinderGeometry(0.035,0.035,1.7,6),mat(0x1d2440));pole.position.y=0.85;flag.add(pole);
  var pen=mesh(new THREE.ConeGeometry(0.32,0.7,3),mat(0xe4572e,{flatShading:true}));pen.rotation.z=-Math.PI/2;pen.scale.z=0.15;pen.position.set(0.36,1.45,0);flag.add(pen);
  flag.position.set(tops[peak].x,tops[peak].y,-0.55);g.add(flag);
  /* one hop per decade, landing on each decade's best year */
  var decs=[],byDec={};YEARS.forEach(function(y,i){var d=Math.floor(y[0]/10)*10;if(!byDec[d]){byDec[d]={d:d,total:0,best:i};decs.push(byDec[d]);}byDec[d].total+=y[1];if(y[1]>YEARS[byDec[d].best][1])byDec[d].best=i;});
  var bestDec=decs.slice().sort(function(a,b){return b.total-a.total;})[0];
  var start={x:-1.7,y:0,z:0},segs=[],t=0.8,from=start,fromI=-1;
  decs.forEach(function(dc){var to=tops[dc.best],hi=0;for(var j=fromI+1;j<dc.best;j++)hi=Math.max(hi,tops[j].y);
    var d=0.55+0.02*Math.abs(to.x-from.x),H=Math.max(1.5,hi-Math.min(from.y,to.y)+1.1);
    segs.push({t0:t,t1:t+d,a:from,b:to,H:H});t+=d+1.05;from=to;fromI=dc.best;
    var bl=makeLabel('<b>'+dc.total+'</b><i>The '+dc.d+'s</i>','big flash'+(dc===bestDec&&decs.length>1?' win':''),'-50%,-100%');bl.pos.set(to.x,to.y+2.5,0);bl.scaleBy=15;pops.push(bl);});
  var tEnd=t, dur=tEnd+4.5, half=(YEARS.length-1)*STEP/2,peakSeg=0;decs.forEach(function(dc,k){if(dc.best===peak)peakSeg=k;});
  var caps=[[0,'Into the kitchen: a bar for every year, a hop for every decade.']];
  decs.forEach(function(dc,k){var y=YEARS[dc.best];caps.push([segs[k].t1,'The '+dc.d+'s: '+dc.total+(dc.total===1?' meal':' meals')+'. Best year '+y[0]+', with '+y[1]+'.']);});
  caps.push([tEnd,total+' meals since '+YEARS[0][0]+'. Peak year: '+YEARS[peak][0]+', with '+max+'.']);
  return {
    groups:[g],labels:pops,duration:dur,lag:3.2,mood:'kitchen',captions:caps,
    bubbles:[[tEnd+0.6,dur+1,q(3)]],
    update:function(t,prev){
      var o=hopPose(segs,t,start);
      for(var i=0;i<segs.length;i++){setOn(pops[i],t>=segs[i].t1&&(i===segs.length-1?t<tEnd+0.3:t<segs[i+1].t1-0.15));
        if(prev<segs[i].t1&&t>=segs[i].t1)splash(new THREE.Vector3(segs[i].b.x,segs[i].b.y,0),0xfffaf0,8,3);}
      kit.tick(t);
      var f=smooth((t-segs[peakSeg].t1)/0.35);flag.scale.setScalar(Math.max(0.001,f));
      if(o.air)rich.pivot.scale.set(0.94,1.1,0.94);else squash(o.since);
      var done=t>=tEnd, u=smooth((t-tEnd)/0.4);
      rich.outer.position.set(o.x,o.y,o.z);rich.outer.rotation.y=Math.PI/2*(1-(done?u*0.6:0));rich.pivot.rotation.x=0;
      rich.armL.rotation.z=(o.air||done)?2.6+(done?Math.sin(t*9)*0.45:0):0.25;
      rich.armR.rotation.z=o.air?-2.6:-0.25;
    },
    cam:function(t){
      var k=kFit(),p=rich.outer.position;
      if(t>=tEnd+0.3){
        var yaw=aspect<1?(many?1.15:0.95):0.35;
        var d=Math.max(14,1.12*(half*Math.cos(yaw)+3)/(TAN*aspect));
        return {tx:half,ty:max*UNIT*0.42,tz:0,ox:Math.sin(yaw)*d,oy:d*0.3,oz:Math.cos(yaw)*d};
      }
      return {tx:p.x+0.8,ty:p.y*0.7+0.9,tz:0,ox:-1.5*k,oy:4*k,oz:10.5*k};
    }
  };
}


function starField(g,n,rad){var pos=new Float32Array(n*3);for(var i=0;i<n;i++){var a=rnd()*6.283,b=Math.acos(rnd()*1.6-0.6);pos[i*3]=Math.sin(b)*Math.cos(a)*rad;pos[i*3+1]=Math.cos(b)*rad;pos[i*3+2]=Math.sin(b)*Math.sin(a)*rad;}
  var ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.add(new THREE.Points(ge,new THREE.PointsMaterial({color:0xfff6dc,size:1.6,sizeAttenuation:false,fog:false,transparent:true,opacity:0.85})));}
function wrap(c,text,maxW){var words=text.split(' '),lines=[],cur='';words.forEach(function(w){var t=cur?cur+' '+w:w;if(c.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;});if(cur)lines.push(cur);return lines;}

/* ---------- scene 1: the restaurant door ---------- */
function buildFront(){
  var g=new THREE.Group(),DW=3.4,DH=5.8,i;
  starField(g,260,120);
  var brick=canvasTex(128,128,function(c,w,h){c.fillStyle='#7d4435';c.fillRect(0,0,w,h);for(var r=0;r<8;r++)for(var k=0;k<5;k++){c.fillStyle='rgba('+(rnd()>0.5?'255,190,150':'40,15,10')+','+(rnd()*0.14)+')';c.fillRect(k*32-(r%2)*16,r*16,32,16);}
    c.fillStyle='rgba(225,200,175,.55)';for(var r2=0;r2<8;r2++){c.fillRect(0,r2*16,w,1.5);for(var k2=0;k2<5;k2++)c.fillRect(k2*32-(r2%2)*16,r2*16,1.5,16);}});
  function wall(x,y,w,h,rx,ry){var t=brick.clone();t.needsUpdate=true;t.repeat.set(rx,ry);var m=mesh(new THREE.BoxGeometry(w,h,0.6),texMat(t,0.9),true,true);m.position.set(x,y,-0.3);g.add(m);}
  wall(-(DW/2+4.5),5.75,9,11.5,3.5,4.5);wall(DW/2+4.5,5.75,9,11.5,3.5,4.5);wall(0,DH+(11.5-DH)/2,DW,11.5-DH,1.3,2.2);
  var cream=M(0xf3e6c8,0.7),dark=M(0x2a2018,0.8),green=M(0x1f5a48,0.6);
  put(g,G.box,cream,-DW/2-0.15,DH/2,0.05,0.3,DH+0.3,0.3);put(g,G.box,cream,DW/2+0.15,DH/2,0.05,0.3,DH+0.3,0.3);put(g,G.box,cream,0,DH+0.15,0.05,DW+0.6,0.3,0.3);
  put(g,G.box,M(0x9a9a9a,0.9),0,-0.1,0.5,DW+1.4,0.2,1.2);put(g,G.box,cream,0,11.6,0,21.8,0.5,1.1);
  /* warm inside */
  var inside=new THREE.Mesh(new THREE.PlaneGeometry(14,10),new THREE.MeshBasicMaterial({color:0xffd58a,fog:false,toneMapped:false}));inside.position.set(0,4,-4);g.add(inside);
  put(g,G.box,M(0x8a5a34,0.8),0,-0.05,-2.2,8,0.1,4);
  var doorLight=new THREE.PointLight(0xffc56b,0,16,2);doorLight.position.set(0,3,1.4);g.add(doorLight);
  /* the door, with the welcome and the headline numbers painted on it */
  var doorTex=canvasTex(512,874,function(c,w,h){
    c.fillStyle='#1f5a48';c.fillRect(0,0,w,h);c.strokeStyle='rgba(0,0,0,.28)';c.lineWidth=6;c.strokeRect(22,22,w-44,h-44);
    c.fillStyle='#fffaf0';c.strokeStyle='#c9a23c';c.lineWidth=8;var px=44,py=60,pw=w-88,ph=h-190;c.beginPath();
    if(c.roundRect)c.roundRect(px,py,pw,ph,26);else c.rect(px,py,pw,ph);c.fill();c.stroke();
    c.textAlign='center';c.fillStyle='#1d2440';c.font='700 30px '+BODY;c.fillText('WELCOME TO',w/2,py+70);
    c.font='700 84px '+DISP;c.fillStyle='#e4572e';c.fillText(DATA.name+'’s',w/2,py+160);
    c.fillStyle='#1d2440';c.font='600 54px '+DISP;c.fillText('food journey',w/2,py+226);c.fillText(DATA.me?'so far':'with '+DATA.host,w/2,py+288);
    c.font='700 46px '+DISP;c.fillStyle='#1f8a7d';c.fillText(Y0+' – '+Y1,w/2,py+362);
    c.strokeStyle='#1d2440';c.lineWidth=3;c.beginPath();c.moveTo(px+50,py+396);c.lineTo(px+pw-50,py+396);c.stroke();
    [[TOTAL,'meals'],[DATA.restaurants,'restaurants']].forEach(function(sv,k){var cx=w/2+(k?1:-1)*pw/4;c.fillStyle='#e4572e';c.font='700 66px '+DISP;c.fillText(sv[0],cx,py+470);c.fillStyle='#1d2440';c.font='800 24px '+BODY;c.fillText(sv[1],cx,py+504);});
    c.font='700 25px '+BODY;c.fillStyle='#1d2440';c.fillText('First meal  '+DATA.first,w/2,py+570);c.fillText('Latest  '+DATA.latest,w/2,py+610);
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(44,h-104,w-88,60);
  },true);
  doorTex.wrapS=doorTex.wrapT=THREE.ClampToEdgeWrapping;
  var hinge=new THREE.Group();hinge.position.set(-DW/2,0,0.05);g.add(hinge);
  var faces=[green,green,green,green,new THREE.MeshStandardMaterial({map:doorTex,roughness:0.6}),green];
  var door=new THREE.Mesh(new THREE.BoxGeometry(DW,DH,0.14),faces);door.position.set(DW/2,DH/2,0);door.castShadow=true;hinge.add(door);
  put(hinge,G.sph,M(0xc9a23c,0.3),DW-0.3,DH*0.42,0.14,0.13);
  /* sign, windows, awnings */
  var signTex=canvasTex(512,96,function(c,w,h){c.fillStyle='#1d2440';c.fillRect(0,0,w,h);c.strokeStyle='#c9a23c';c.lineWidth=5;c.strokeRect(6,6,w-12,h-12);c.fillStyle='#f2b632';c.textAlign='center';c.font='700 54px '+DISP;c.fillText('THE FOOD JOURNEY',w/2,66);},true);
  signTex.wrapS=signTex.wrapT=THREE.ClampToEdgeWrapping;
  var sign=new THREE.Mesh(new THREE.PlaneGeometry(7.4,1.4),new THREE.MeshStandardMaterial({map:signTex,roughness:0.6,emissive:0x332200,emissiveMap:signTex,emissiveIntensity:0.6}));sign.position.set(0,7.6,0.06);g.add(sign);
  [-2.6,2.6].forEach(function(x){var sg=glow(0xffc070,3,0.6);sg.position.set(x,8.7,0.6);g.add(sg);put(g,G.sph,new THREE.MeshBasicMaterial({color:0xfff0c8,fog:false}),x,8.7,0.5,0.12);});
  var stripe=canvasTex(64,16,function(c){c.fillStyle='#fffaf0';c.fillRect(0,0,64,16);c.fillStyle='#e4572e';c.fillRect(0,0,32,16);});stripe.repeat.set(4,1);
  [-1,1].forEach(function(s){var x=s*6.2;
    var win=new THREE.Mesh(new THREE.PlaneGeometry(5,3.6),new THREE.MeshBasicMaterial({color:0xffcf80,fog:false,toneMapped:false}));win.position.set(x,3.3,0.02);g.add(win);
    put(g,G.box,dark,x,3.3,0.06,0.14,3.6,0.1);put(g,G.box,dark,x,3.9,0.06,5,0.14,0.1);
    put(g,G.box,cream,x,1.35,0.1,5.5,0.3,0.4);put(g,G.box,cream,x,5.2,0.05,5.4,0.2,0.2);
    var aw=mesh(new THREE.BoxGeometry(5.6,0.08,1.7),texMat(stripe,0.9),true,false);aw.position.set(x,5.6,0.85);aw.rotation.x=0.45;g.add(aw);
    var wg=glow(0xffb45a,7,0.35);wg.position.set(x,3.3,0.8);g.add(wg);
    [-1.3,0,1.3].forEach(function(dx){var uw=new THREE.Mesh(new THREE.PlaneGeometry(0.9,1.4),new THREE.MeshBasicMaterial({color:rnd()>0.4?0xffd9a0:0x2a3050,fog:false}));uw.position.set(x+dx,9.4,0.02);g.add(uw);});
    put(g,G.box,M(0x5a3a22,0.9),s*(DW/2+0.95),0.45,0.75,0.8,0.9,0.8,0,0,0,true);
    for(i=0;i<9;i++)put(g,G.ico,M(i%2?0x3f7a34:0x5f9a44,0.9,true),s*(DW/2+0.95)+(rnd()-0.5)*0.7,1.1+rnd()*0.7,0.75+(rnd()-0.5)*0.6,0.3+rnd()*0.15);
    put(g,G.cyl,dark,s*9.5,3,5,0.09,6,0.09,0,0,0,true);put(g,G.sph,new THREE.MeshBasicMaterial({color:0xfff0c8,fog:false}),s*9.5,6.1,5,0.28);
    var lg=glow(0xffc070,6,0.6);lg.position.set(s*9.5,6.1,5);g.add(lg);
    var pl=new THREE.PointLight(0xffb866,0.9,24,2);pl.position.set(s*7,5.5,5);g.add(pl);
    var nb=put(g,G.box,M(0x2b2f45,0.9),s*17.5,7,-1,13,14,6);
    for(i=0;i<10;i++){var nw=new THREE.Mesh(new THREE.PlaneGeometry(0.8,1.1),new THREE.MeshBasicMaterial({color:rnd()>0.5?0xffd9a0:0x3a4268,fog:false}));nw.position.set(s*(12.6+(i%5)*2.1),4+(i>4?4:0),2.02);g.add(nw);}
  });
  var pave=mesh(new THREE.BoxGeometry(60,0.3,8),M(0x8d8f98,0.95),false,true);pave.position.set(0,-0.35,4);g.add(pave);
  var road=mesh(new THREE.PlaneGeometry(200,120),M(0x2c2f3a,0.95),false,true);road.rotation.x=-Math.PI/2;road.position.set(0,-0.5,50);g.add(road);
  var tHold=2.4,tOpen=4.3,tFly=5.2,dur=6.6,S=2.2;
  var start={x:2.1,y:-0.2,z:2.6},segs=[{t0:tOpen+0.3,t1:tOpen+0.75,a:start,b:{x:0.5,y:-0.2,z:1.7},H:1.2},{t0:tOpen+0.85,t1:tOpen+1.35,a:{x:0.5,y:-0.2,z:1.7},b:{x:0.3,y:0,z:-1.8},H:1.2}];
  return {groups:[g],labels:[],duration:dur,lag:7,mood:'night',fadeOut:'#ffe9bf',captions:[[0,''],[tOpen,'Come on in.']],bubbles:[],
    update:function(t){
      var op=smooth((t-tOpen)/0.8);hinge.rotation.y=op*1.95;doorLight.intensity=op*1.6;
      var o=hopPose(segs,t,start);rich.outer.scale.setScalar(S);rich.outer.position.set(o.x,o.y,o.z);
      rich.outer.rotation.y=t<tOpen+0.3?-0.25:Math.PI;rich.pivot.rotation.x=0;
      if(o.air)rich.pivot.scale.set(0.94,1.1,0.94);else squash(o.since);
      var w=t<tOpen+0.3;rich.armL.rotation.z=(w||o.air)?2.6+(w?Math.sin(t*9)*0.45:0):0.25;rich.armR.rotation.z=o.air?-2.6:-0.25;
    },
    cam:function(t){
      var D=Math.max(9.7,2.5/(TAN*aspect)),u=smooth(t/tHold),f=smooth((t-tFly)/1.4);
      var px=7*(1-u),py=7+(3.1-7)*u-0.4*f,pz=36+(D-36)*u+(-2-D)*f,ty=4.2+(3.0-4.2)*u;
      return {tx:0,ty:ty,tz:-6*f,ox:px,oy:py-ty,oz:pz+6*f};
    }
  };
}

/* ---------- scene: where in the world, then the UK, then London ---------- */
function buildPlaces(){
  var g=new THREE.Group(),globeG=new THREE.Group(),R=5,i;g.add(globeG);starField(g,320,140);
  var LAND=[[[-168,66],[-140,70],[-95,72],[-80,62],[-60,52],[-65,45],[-75,38],[-81,30],[-83,26],[-97,27],[-97,17],[-88,15],[-83,9],[-105,20],[-112,29],[-118,33],[-125,42],[-125,49],[-135,58],[-155,58]],
    [[-80,10],[-62,10],[-50,0],[-35,-7],[-40,-22],[-55,-35],[-66,-55],[-74,-50],[-72,-30],[-70,-18],[-81,-5]],
    [[-9,37],[-9,43],[-1,44],[-4,48],[3,51],[8,54],[9,57],[5,60],[12,65],[25,71],[40,67],[60,68],[60,55],[50,46],[40,45],[28,41],[23,37],[20,40],[13,45],[16,39],[8,44],[3,43],[-1,37]],
    [[-17,21],[-10,30],[-6,35],[10,37],[20,32],[32,31],[43,12],[51,11],[40,-5],[40,-16],[33,-27],[20,-35],[17,-29],[12,-17],[13,-5],[9,4],[-8,4],[-17,12]],
    [[60,68],[100,77],[140,73],[180,68],[165,58],[142,50],[128,38],[122,30],[118,23],[108,18],[104,9],[99,8],[98,17],[92,22],[86,20],[80,10],[76,9],[72,20],[66,25],[60,25],[57,18],[45,13],[35,28],[36,36],[28,41],[40,45],[50,46],[60,55]],
    [[114,-22],[122,-17],[131,-12],[137,-16],[142,-11],[146,-19],[153,-27],[150,-37],[140,-38],[131,-32],[116,-34]],
    [[-55,60],[-45,60],[-22,70],[-20,80],[-60,82],[-70,77]],
    [[-5.5,50],[1.5,51],[1.7,53],[-1,55],[-2,58],[-5,58.5],[-6,56],[-3,54],[-5,52]],[[-10,52],[-6,52],[-6,55],[-9,54.5]],[[130,32],[136,34],[141,37],[142,43],[139,38],[133,34]]];
  var gt=canvasTex(2048,1024,function(c,w,h){c.fillStyle='#2d6cb3';c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(255,255,255,.1)';c.lineWidth=1;for(var a=0;a<12;a++){c.beginPath();c.moveTo(a*w/12,0);c.lineTo(a*w/12,h);c.stroke();}for(var b=1;b<6;b++){c.beginPath();c.moveTo(0,b*h/6);c.lineTo(w,b*h/6);c.stroke();}
    c.fillStyle='#74c26b';c.strokeStyle='#4f9a4a';c.lineWidth=GEO.land?1.5:3;c.lineJoin='round';
    (GEO.land||LAND).forEach(function(p){c.beginPath();p.forEach(function(q,k){var x=(q[0]+180)/360*w,y=(90-q[1])/180*h;if(k)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();c.fill();c.stroke();});
    c.fillStyle='#f4f8ff';c.fillRect(0,h*0.9,w,h*0.1);c.fillRect(0,0,w,h*0.035);});
  gt.wrapS=gt.wrapT=THREE.ClampToEdgeWrapping;
  var globe=mesh(new THREE.SphereGeometry(R,48,32),texMat(gt,0.8),false,true);globeG.add(globe);
  globeG.add(glow(0x6fb8ff,R*3.1,0.35));
  function onGlobe(lat,lon,rad){var ph=(lon+180)*Math.PI/180,la=lat*Math.PI/180;return new THREE.Vector3(-rad*Math.cos(ph)*Math.cos(la),rad*Math.sin(la),rad*Math.sin(ph)*Math.cos(la));}
  var W=DATA.world,wmax=W[0].n,farAway=W.some(function(p){return Math.abs(p.lon)>50;}),up=new THREE.Vector3(0,1,0),wl=[];
  W.forEach(function(p,k){var h=0.35+2.4*Math.sqrt(p.n/wmax),n=onGlobe(p.lat,p.lon,1),big=k===0,wd=big?0.24:0.14;
    var tw=mesh(new THREE.BoxGeometry(wd,h,wd),mat(big?0xf2b632:0xe4572e),true,false);tw.position.copy(n).multiplyScalar(R+h/2);tw.quaternion.setFromUnitVectors(up,n);globe.add(tw);
    if(k<6){var l=makeLabel('<b>'+p.n+'</b><i>'+p.name+'</i>','big'+(big?' win':''),big?'-50%,-100%':(k%2?'-112%,-50%':'12%,-50%'));l.scaleBy=big?9:7;wl.push({l:l,n:n,tip:R+h+(big?0.25:0)});}});
  /* flat maps: towers that grow, tallest last */
  var winTex=canvasTex(64,64,function(c){c.fillStyle='#5a6486';c.fillRect(0,0,64,64);for(var y=0;y<4;y++)for(var x=0;x<4;x++){c.fillStyle=rnd()>0.35?'#ffe08a':'#39405e';c.fillRect(5+x*15,5+y*16,9,10);}});
  var ug=new THREE.BoxGeometry(1,1,1);ug.translate(0,0.5,0);
  function relax(list){for(var it=0;it<50;it++)list.forEach(function(a,ia){list.forEach(function(b,ib){if(ib<=ia)return;var dx=b.x-a.x,dz=b.z-a.z,dd=Math.sqrt(dx*dx+dz*dz);if(dd<0.01){dx=0.1*(ib-ia);dz=0.07;dd=0.12;}
    if(dd<1.6){var ps=(1.6-dd)/2;a.x-=dx/dd*ps;a.z-=dz/dd*ps;b.x+=dx/dd*ps;b.z+=dz/dd*ps;}});});}
  function fit(list,minSpan,maxK){var la0=1e9,la1=-1e9,lo0=1e9,lo1=-1e9;list.forEach(function(a){la0=Math.min(la0,a.lat);la1=Math.max(la1,a.lat);lo0=Math.min(lo0,a.lon);lo1=Math.max(lo1,a.lon);});
    var lac=(la0+la1)/2,loc=(lo0+lo1)/2,cs=Math.cos(lac*Math.PI/180),K=Math.min(maxK,9/Math.max((lo1-lo0)*cs,la1-la0,minSpan));
    return function(lat,lon){return [(lon-loc)*cs*K,-(lat-lac)*K];};}
  function towerSet(parent,list,t0,last){
    var areas=list.slice().sort(function(a,b){return a.n-b.n;}),amax=areas[areas.length-1].n,towers=[],labels=[];
    areas.forEach(function(a,k){var h=0.7+a.n/amax*6.6,big=k===areas.length-1,t=winTex.clone();t.needsUpdate=true;t.repeat.set(1,Math.max(1,Math.round(h/1.1)));
      var m=new THREE.MeshStandardMaterial({map:t,roughness:0.7});if(big)m.color.setHex(0xffd27a).convertSRGBToLinear();
      var tw=mesh(ug,m,true,true);tw.position.set(a.x,0,a.z);tw.scale.set(1.1,0.001,1.1);parent.add(tw);
      var cap=mesh(ug,mat(0xfffaf0),true,false);cap.scale.set(1.25,0.12,1.25);cap.position.set(a.x,0,a.z);parent.add(cap);
      var l=makeLabel('<b>'+a.n+'</b><i>'+a.name+'</i>','big'+(big?' win':''),'-50%,-100%');l.scaleBy=big?13:9.5;l.pos.set(a.x,h+(big&&last?2.7:0.45),a.z);labels.push(l);
      towers.push({a:a,h:h,tw:tw,cap:cap,t0:t0+0.5+k*0.32});});
    return {g:parent,towers:towers,labels:labels,top:towers[towers.length-1],t0:t0,end:t0+0.5+(areas.length-1)*0.32+0.55};
  }
  var stages=[],tA=5.2,hasUK=DATA.areas.length>0,isUK=(DATA.areaCountry||'UK')==='UK',hasLon=hasUK&&DATA.london&&DATA.london.length>1&&DATA.areas[0].name==='London';
  if(hasUK){
    var ukG=new THREE.Group();g.add(ukG);var pj=fit(DATA.areas,2.2,2.9);
    DATA.areas.forEach(function(a){var p=pj(a.lat,a.lon);a.x=p[0];a.z=p[1];});relax(DATA.areas);
    var SH=(GEO.shapes||{})[DATA.areaIso],RINGS=SH?SH.map(function(r){return r.map(function(q){return pj(q[1],q[0]);});}):[];
    var inPoly=function(P,x,z){var c=false;for(var i2=0,j2=P.length-1;i2<P.length;j2=i2++){var a=P[i2],b=P[j2];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
    var sea=mesh(new THREE.PlaneGeometry(160,160),mat(RINGS.length?0x2d6cb3:0x5a9a5e,{roughness:RINGS.length?0.35:0.9}),false,true);sea.rotation.x=-Math.PI/2;sea.position.y=RINGS.length?-0.25:-0.01;ukG.add(sea);
    RINGS.forEach(function(P){var shp=new THREE.Shape();P.forEach(function(q,k){if(k)shp.lineTo(q[0],-q[1]);else shp.moveTo(q[0],-q[1]);});
      var land=mesh(new THREE.ExtrudeGeometry(shp,{depth:0.25,bevelEnabled:false}),mat(0x5a9a5e),true,true);land.rotation.x=-Math.PI/2;land.position.y=-0.25;ukG.add(land);});
    for(i=0;i<150;i++){var px=(rnd()-0.5)*18,pz=(rnd()-0.5)*18;if(RINGS.length&&!RINGS.some(function(P){return inPoly(P,px,pz);}))continue;var clash=false;DATA.areas.forEach(function(a){if(Math.abs(a.x-px)<1&&Math.abs(a.z-pz)<1)clash=true;});if(clash)continue;
      if(i%3)put(ukG,G.cone,M(0x2f7a3a,0.9,true),px,0.3,pz,0.2,0.6,0.2,0,0,0,true);else put(ukG,G.box,M([0xf3e6c8,0xe9b08a,0xd9d2c0][i%9/3|0],0.8),px,0.16,pz,0.34,0.32,0.34,0,rnd(),0,true);}
    stages.push(towerSet(ukG,DATA.areas,tA,!hasLon));
  }
  if(hasLon){
    var loG=new THREE.Group();g.add(loG);var pl=fit(DATA.london,0.14,36);
    DATA.london.forEach(function(a){var p=pl(a.lat,a.lon);a.x=p[0];a.z=p[1];});relax(DATA.london);
    var town=mesh(new THREE.PlaneGeometry(160,160),mat(0x6f8a70),false,true);town.rotation.x=-Math.PI/2;town.position.y=-0.02;loG.add(town);
    var TH=[[-0.50,51.43],[-0.42,51.41],[-0.34,51.41],[-0.30,51.455],[-0.29,51.485],[-0.25,51.488],[-0.225,51.487],[-0.21,51.468],[-0.17,51.482],[-0.125,51.487],[-0.12,51.505],[-0.09,51.508],[-0.075,51.505],[-0.04,51.505],[-0.02,51.49],[0.0,51.486],[0.01,51.505],[0.05,51.50],[0.07,51.495],[0.15,51.51],[0.25,51.47]];
    var crv=new THREE.CatmullRomCurve3(TH.map(function(q){var p=pl(q[1],q[0]);return new THREE.Vector3(p[0],0,p[1]);}));
    var river=mesh(new THREE.TubeGeometry(crv,120,0.38,6),mat(0x4aa3d9,{roughness:0.3}),false,true);river.scale.y=0.1;river.position.y=0.02;loG.add(river);
    for(i=0;i<170;i++){var hx=(rnd()-0.5)*26,hz=(rnd()-0.5)*22,cl=false;DATA.london.forEach(function(a){if(Math.abs(a.x-hx)<1.1&&Math.abs(a.z-hz)<1.1)cl=true;});if(cl)continue;
      if(i%5===0)put(loG,G.cyl,M(0x4f8f5a,0.9),hx,0.02,hz,0.9+rnd()*0.8,0.04,0.9+rnd()*0.8);else{var bh=0.2+rnd()*0.5;put(loG,G.box,M([0xd9d2c0,0xc9b8a0,0xb8a898,0xe9dcc8][i%4],0.85),hx,bh/2,hz,0.4+rnd()*0.4,bh,0.4+rnd()*0.4,0,rnd(),0,true);}}
    stages.push(towerSet(loG,DATA.london,stages[0].end+1.5,true));
  }
  var fin=stages[stages.length-1],topA=fin?fin.top:null,tDrop=fin?fin.end+0.4:0,tLand=tDrop+2.6,dur=fin?tLand+4.6:tA+2.2;
  var caps=[[0,DATA.me?'Where in the world have you eaten?':'Where in the world did you two eat?']],flashes=[];
  if(!fin)caps.push([3.6,W[0].name+': '+W[0].n+' meals, '+Math.round(W[0].n/TOTAL*100)+'% of the total.']);
  stages.forEach(function(sg,k){flashes.push([sg.t0,'#eaf4ff']);caps.push([sg.t0,k===0?'Down to '+DATA.areaCountry+': meals by town.':'London leads, so here is London by area.']);});
  if(fin){caps.push([tLand,topA.a.name+': '+topA.a.n+' meals, '+Math.round(topA.a.n/TOTAL*100)+'% of the total.']);caps.push([dur-1.5,'Down to street level…']);}
  var labels=wl.map(function(w){return w.l;});stages.forEach(function(sg){labels=labels.concat(sg.labels);});
  var wv=new THREE.Vector3(),th1=-Math.PI/2-W[0].lon*Math.PI/180,th0=farAway?th1-5.6:th1-0.96,la1=W[0].lat*Math.PI/180,tipR=R+0.35+2.4,tip=new THREE.Vector3(0,Math.sin(la1)*tipR,Math.cos(la1)*tipR);
  function stageAt(t){var k=-1;stages.forEach(function(sg,j){if(t>=sg.t0)k=j;});return k;}
  return {groups:[g],labels:labels,duration:dur,lag:2.6,mood:'night',flashes:flashes,captions:caps,bubbles:fin?[[tLand+0.7,dur+1,q(4)]]:[],
    update:function(t,prev){
      var cur=stageAt(t),glb=cur<0;globeG.visible=glb;
      stages.forEach(function(sg,j){if(prev<sg.t0&&t>=sg.t0)st.snap=true;var vis=j===cur;sg.g.visible=vis;
        sg.towers.forEach(function(o,k){var u=Math.max(0,Math.min(1,(t-o.t0)/0.55)),e=u<=0?0:1+2.2*Math.pow(u-1,3)+1.2*Math.pow(u-1,2);
          o.tw.scale.y=Math.max(0.001,o.h*e);o.cap.position.y=o.h*e;o.tw.visible=o.cap.visible=u>0;setOn(sg.labels[k],vis&&u>=1);});});
      globe.rotation.y=th0+(th1-th0)*smooth(t/(farAway?4.4:3.6));globe.updateMatrixWorld(true);
      wl.forEach(function(w){wv.copy(w.n).applyAxisAngle(up,globe.rotation.y);var facing=wv.z*0.8+wv.y*0.5>0.62;setOn(w.l,glb&&facing&&(!fin||t<tA-0.35));w.l.pos.copy(wv).multiplyScalar(w.tip);});
      if(!fin){rich.outer.visible=false;return;}
      var show=t>=tDrop;rich.outer.visible=show;rich.outer.scale.setScalar(1.3);rich.pivot.rotation.x=0;
      var u2=Math.max(0,Math.min(1,(t-tDrop)/(tLand-tDrop))),e2=1-Math.pow(1-u2,2),top=topA.h+0.12;
      rich.outer.position.set(topA.a.x+Math.sin(t*2.2)*0.9*(1-u2),top+(16-top)*(1-e2),topA.a.z+Math.cos(t*1.7)*0.5*(1-u2));
      rich.chute.visible=show&&u2<1;rich.outer.rotation.y=Math.atan2(camera.position.x-rich.outer.position.x,camera.position.z-rich.outer.position.z);
      if(u2>=1)squash(t-tLand);else rich.pivot.scale.set(1,1,1);
      var wave=u2>=1;rich.armL.rotation.z=2.6+(wave?Math.sin(t*9)*0.45:0);rich.armR.rotation.z=wave?-0.25:-2.6;
      if(prev<tLand&&t>=tLand){[0xf2b632,0xe4572e,0xfffaf0,0x1f8a7d].forEach(function(c){splash(new THREE.Vector3(topA.a.x,top+0.2,topA.a.z),c,10,5);});}
    },
    cam:function(t){
      var k=Math.pow(kFit(),0.8),a,Rr,cur=stageAt(t);
      if(cur<0){var dive=fin?smooth((t-(tA-1))/0.9):0,aim=smooth((t-2.6)/1.4);return {tx:0,ty:3.6+(tip.y*0.82-3.6)*aim,tz:3.5+(tip.z*0.82-3.5)*aim,ox:0,oy:(4.4*k)*(1-dive)+0.9*dive,oz:(9.5*k)*(1-dive)+1.6*dive};}
      var sg=stages[cur],nx=stages[cur+1],tp=sg.top;a=0.5+(t-sg.t0)*0.09;
      if(nx&&t>=nx.t0-0.9)return {tx:tp.a.x,ty:tp.h*0.5,tz:tp.a.z,ox:Math.sin(a)*4,oy:3,oz:Math.cos(a)*4};
      if(!nx&&t>=dur-1.5)return {tx:tp.a.x,ty:0.4,tz:tp.a.z+0.8,ox:Math.sin(a)*2.6,oy:1.4,oz:Math.cos(a)*2.6};
      if(!nx&&t>=tLand-0.6){Rr=13.5*k;return {tx:tp.a.x,ty:tp.h+1.0,tz:tp.a.z,ox:Math.sin(a)*Rr,oy:4.2,oz:Math.cos(a)*Rr};}
      Rr=15*k;return {tx:0,ty:2.4,tz:0.6,ox:Math.sin(a)*Rr,oy:9.5,oz:Math.cos(a)*Rr};
    }
  };
}

/* ---------- scene 5: a walk down the high street of favourites ---------- */
G.pyr=new THREE.ConeGeometry(0.7071,1,4);G.pyr.rotateY(Math.PI/4);G.pyr.translate(0,0.5,0);
(function(){var sh=new THREE.Shape();sh.moveTo(-0.5,0);sh.lineTo(0.5,0);sh.lineTo(0,1);sh.lineTo(-0.5,0);G.prism=new THREE.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false});G.prism.translate(0,0,-0.5);})();
function lit(g,x,y,z,w,h,hex){var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:hex||0xffd28a,fog:false}));m.material.color.convertSRGBToLinear();m.position.set(x,y,z);g.add(m);return m;}
var STYLE={
  Indian:{wall:0xd98a3a,base:0x8a2f2a,door:0x5a1f1a,bg:'#7a1f2a',fg:'#f2c53a'},
  Italian:{wall:0xf0dfb8,base:0x3f7a4a,door:0x7a2a1f,bg:'#2f6a3f',fg:'#fffaf0'},
  Pub:{wall:0xf3ead8,base:0x1f4a3a,door:0x16261f,bg:'#16261f',fg:'#f2b632'},
  Chinese:{wall:0xb3261e,base:0x7a1410,door:0x3a0a08,bg:'#1a1210',fg:'#f2c53a'},
  Thai:{wall:0x9a5a2c,base:0x6a3a1a,door:0x3a2010,bg:'#3a2a6a',fg:'#f2c53a'},
  Japanese:{wall:0x3a2a22,base:0x2a1e18,door:0x1a1210,bg:'#f3ead8',fg:'#1d2440'},
  Other:{wall:0x2f8a8a,base:0x1d5a5a,door:0x123a3a,bg:'#1d2440',fg:'#fffaf0'}};
STYLE.Latin={wall:0xe07a5a,base:0x1f9a9a,door:0xd23c6a,bg:'#d23c6a',fg:'#fff3c8'};
var SMAP={Indian:'Indian',Pub:'Pub',British:'Pub',Mediterranean:'Italian',Continental:'Italian',SouthEastAsian:'Thai',EastAsian:'Chinese',LatinAmerican:'Latin'};
function stripeTex(a,b,c3){var t=canvasTex(48,16,function(c){[a,b,c3||a].forEach(function(col,k){c.fillStyle=col;c.fillRect(k*16,0,16,16);});});t.repeat.set(3,1);return t;}
function shop(g,r,rank,x,sc,icons){
  var b=new THREE.Group();b.position.set(x,0,0);b.scale.setScalar(sc);g.add(b);
  var type=SMAP[r[2]]||'Other',st=STYLE[type],W=6.2,H=7.2,D=5,i,gold=M(0xf2c53a,0.35);
  put(b,G.box,M(new THREE.Color(st.wall).lerp(new THREE.Color(0xfff2dc),(rank%3)*0.16).getHex(),0.85),0,H/2,-D/2,W,H,D,0,0,0,true);
  put(b,G.box,M(st.base,0.8),0,1.65,0.03,W+0.1,3.3,0.12);
  put(b,G.box,M(st.door,0.6),-2.25,1.35,0.12,1.3,2.7,0.1);put(b,G.sph,gold,-1.8,1.3,0.2,0.07);
  lit(b,1.9,1.75,0.1,2.2,2.0);put(b,G.box,M(st.door,0.6),1.9,1.75,0.12,0.08,2.0,0.06);put(b,G.box,M(st.door,0.6),1.9,0.7,0.14,2.4,0.14,0.2);
  [-2,0,2].forEach(function(wx){lit(b,wx,5.5,0.02,1.1,1.5,(wx+rank)%3?0xffd9a0:0xffc070);put(b,G.box,M(st.base,0.8),wx,4.68,0.06,1.3,0.12,0.16);});
  /* the name sign */
  var signTex=canvasTex(512,100,function(c,w,h){c.fillStyle=st.bg;c.fillRect(0,0,w,h);c.strokeStyle=st.fg;c.lineWidth=4;c.strokeRect(7,7,w-14,h-14);
    c.fillStyle=st.fg;c.textAlign='center';c.textBaseline='middle';var fs=62;do{c.font='700 '+fs+'px '+DISP;fs-=2;}while(c.measureText(r[0]).width>w-44&&fs>20);c.fillText(r[0],w/2,h/2+3);},true);
  signTex.wrapS=signTex.wrapT=THREE.ClampToEdgeWrapping;
  var sign=new THREE.Mesh(new THREE.PlaneGeometry(W-0.3,1.15),new THREE.MeshBasicMaterial({map:signTex,fog:false,toneMapped:false}));sign.position.set(0,3.95,0.16);b.add(sign);
  put(b,G.box,M(0x1a1410,0.8),0,3.95,0.08,W-0.1,1.35,0.1);
  /* the plaque by the door */
  var pt=canvasTex(240,312,function(c,w,h){c.fillStyle='#fffaf0';c.fillRect(0,0,w,h);c.strokeStyle='#c9a23c';c.lineWidth=10;c.strokeRect(5,5,w-10,h-10);
    c.textAlign='center';c.fillStyle='#e4572e';c.font='700 76px '+DISP;c.fillText('#'+rank,w/2,88);
    c.font='38px sans-serif';c.fillStyle='#f2b632';var s5='';for(var k=0;k<5;k++)s5+=k<Math.round(r[4])?'★':'☆';c.fillText(s5,w/2,140);
    c.fillStyle='#1d2440';c.font='700 46px '+DISP;c.fillText(r[3]+' visits',w/2,200);
    var vf=27;do{c.font='800 '+vf+'px '+BODY;vf-=1;}while(c.measureText(r[5]).width>w-36&&vf>14);c.fillText(r[5],w/2,244);c.font='700 24px '+BODY;c.fillStyle='#1f8a7d';c.fillText(r[1],w/2,284);},true);
  pt.wrapS=pt.wrapT=THREE.ClampToEdgeWrapping;
  var pq=new THREE.Mesh(new THREE.PlaneGeometry(2.0,2.6),new THREE.MeshBasicMaterial({map:pt,fog:false,toneMapped:false}));pq.position.set(-0.35,1.75,0.14);b.add(pq);
  /* what makes each type of place look like itself */
  if(type==='Indian'){
    put(b,G.box,M(0xf0dfb8,0.8),0,H+0.2,-D/2,W+0.3,0.4,D+0.3,0,0,0,true);
    put(b,G.sph,gold,0,H+1.2,-D/2,1.35,1.2,1.35,0,0,0,true);put(b,G.cone,gold,0,H+2.8,-D/2,0.12,0.9,0.12);
    [-2.5,2.5].forEach(function(dx){put(b,G.sph,gold,dx,H+0.75,-0.7,0.5,0.5,0.5);put(b,G.cone,gold,dx,H+1.45,-0.7,0.06,0.45,0.06);});
    [-2,0,2].forEach(function(wx){var a=new THREE.Mesh(new THREE.CircleGeometry(0.55,16,0,Math.PI),new THREE.MeshBasicMaterial({color:0xffd9a0,fog:false}));a.position.set(wx,6.25,0.02);b.add(a);});
  }else if(type==='Italian'){
    put(b,G.pyr,M(0xc0583a,0.9,true),0,H,-D/2,W+0.7,1.9,D+0.7,0,0,0,true);
    var aw=mesh(new THREE.BoxGeometry(2.7,0.08,1.4),texMat(stripeTex('#3f8f4a','#fffaf0','#c8402a'),0.9),true,false);aw.position.set(1.9,3.05,0.6);aw.rotation.x=0.5;b.add(aw);
    [-2,0,2].forEach(function(wx){put(b,G.box,M(0x7a4424,0.9),wx,4.5,0.25,1.3,0.25,0.3);for(i=0;i<5;i++)put(b,G.ico,M(i%2?0xd23c2f:0x4f9a3a,0.9,true),wx-0.5+i*0.25,4.75,0.28,0.16);});
  }else if(type==='Pub'){
    var tim=M(0x1a1410,0.8);[-3.02,-1,1,3.02].forEach(function(dx){put(b,G.box,tim,dx,5.4,0.05,0.18,3.6,0.1);});put(b,G.box,tim,0,7.1,0.05,W,0.2,0.1);
    put(b,G.box,tim,-2,6.3,0.05,0.14,2.3,0.1,0,0,0.9);put(b,G.box,tim,2,6.3,0.05,0.14,2.3,0.1,0,0,-0.9);
    put(b,G.prism,M(0x3a3f4a,0.9),0,H,-D/2,W+0.5,2.5,D+0.4,0,0,0,true);put(b,G.box,M(0x8a4b3a,0.9),2.2,H+1.9,-3.4,0.8,2.4,0.8,0,0,0,true);
    put(b,G.box,tim,2.75,5.3,0.6,0.08,0.08,1.2);put(b,G.box,gold,2.75,4.75,1.0,0.9,0.9,0.08);put(b,G.box,M(0x1f4a3a,0.6),2.75,4.75,1.0,0.7,0.7,0.1);
  }else if(type==='Chinese'){
    put(b,G.pyr,M(0x1f6a4a,0.7,true),0,H,-D/2,W+1.8,1.0,D+1.8,0,0,0,true);put(b,G.box,M(0xb3261e,0.8),0,H+1.5,-D/2,W*0.6,1.2,D*0.6,0,0,0,true);
    put(b,G.pyr,M(0x1f6a4a,0.7,true),0,H+2.1,-D/2,W*0.6+1.5,0.9,D*0.6+1.5,0,0,0,true);put(b,G.sph,gold,0,H+3.15,-D/2,0.22);
    [-3,3].forEach(function(dx){put(b,G.cyl,gold,dx,1.65,0.2,0.16,3.3,0.16);put(b,G.sph,new THREE.MeshBasicMaterial({color:0xff5a3a,fog:false}),dx*0.93,2.75,0.75,0.3,0.38,0.3);
      var lg=glow(0xff6a3a,2.2,0.6);lg.position.set(dx*0.93,2.75,0.85);b.add(lg);});
  }else if(type==='Thai'){
    put(b,G.prism,M(0xd9772a,0.8),0,H,-D/2,W+0.9,3.4,D+0.3,0,0,0,true);put(b,G.prism,M(0xf2a53a,0.8),0,H+1.1,-D/2+0.4,W-1.2,3.1,D+0.3,0,0,0,true);
    put(b,G.cone,gold,0,H+4.9,0.5,0.1,1.4,0.1);[-1,1].forEach(function(sx){put(b,G.cone,gold,sx*(W/2+0.45),H+0.5,0.2,0.09,1.0,0.09,0,0,-sx*0.6);});
    [-3,3].forEach(function(dx){put(b,G.cyl,gold,dx,3.6,0.15,0.12,7.2,0.12);});
  }else if(type==='Japanese'){
    put(b,G.box,M(0x565b66,0.9),0,H+0.14,-D/2,W+1.3,0.28,D+1.3,0,0,0,true);put(b,G.box,M(0x565b66,0.9),0,3.22,0.55,W+0.7,0.16,1.3,0,0,0,true);
    for(i=0;i<13;i++)put(b,G.box,M(0x1a1210,0.8),-3+i*0.5,6.4,0.04,0.1,1.5,0.08);
    [-2.68,-2.25,-1.82].forEach(function(nx){var n=lit(b,nx,2.5,0.22,0.4,0.75,0xf6f1e4);n.material.side=THREE.DoubleSide;});
    put(b,G.cyl,new THREE.MeshBasicMaterial({color:0xfff3d6,fog:false}),-3.15,2.2,0.6,0.28,0.8,0.28);var jg=glow(0xffe2a0,2.4,0.6);jg.position.set(-3.15,2.2,0.8);b.add(jg);
  }else if(type==='Latin'){
    [[W+0.3,0.9,0],[W*0.62,0.9,0.9],[W*0.3,0.8,1.75]].forEach(function(q){put(b,G.box,M(0xe07a5a,0.85),0,H+q[2]+q[1]/2,-0.4,q[0],q[1],0.8,0,0,0,true);});
    for(i=0;i<11;i++)put(b,G.box,M([0xd23c6a,0xf2c53a,0x1f9a9a,0x7fb24a,0xfffaf0][i%5],0.8),-2.9+i*0.58,4.95-Math.sin(i/10*Math.PI)*0.25,0.2,0.42,0.5,0.03);
    [[3.35,1.5],[-3.4,1.1]].forEach(function(q){put(b,G.cyl,M(0x3f8a3a,0.8),q[0],q[1],0.7,0.26,q[1]*2,0.26,0,0,0,true);put(b,G.cyl,M(0x3f8a3a,0.8),q[0]+0.4,q[1]*1.1,0.7,0.14,0.8,0.14);put(b,G.sph,M(0x3f8a3a,0.8),q[0],q[1]*2,0.7,0.26);});
  }else{
    put(b,G.box,M(0x1d2440,0.8),0,H+0.15,-D/2,W+0.3,0.3,D+0.3,0,0,0,true);
    var aw2=mesh(new THREE.BoxGeometry(W-0.4,0.08,1.4),texMat(stripeTex('#1f8a7d','#fffaf0'),0.9),true,false);aw2.position.set(0,3.2,0.6);aw2.rotation.x=0.5;b.add(aw2);
    put(b,G.box,M(0x5a3a22,0.9),3.3,0.4,0.6,0.7,0.8,0.7);for(i=0;i<6;i++)put(b,G.ico,M(0x4f9a3a,0.9,true),3.3+(rnd()-0.5)*0.5,1.0+rnd()*0.6,0.6+(rnd()-0.5)*0.4,0.3);
  }
  var lg2=glow(0xffc070,2.2,0.5);lg2.position.set(-0.35,3.25,0.5);b.add(lg2);
  /* hanging sign for the type icon: a lettered disc underneath in case the picture cannot load */
  put(b,G.box,M(0x1a1410,0.8),-3.3,6.25,0.5,0.08,0.08,1.0);put(b,G.cyl,gold,-3.3,5.4,0.95,0.8,0.1,0.8,Math.PI/2,0,0,true);
  var it=canvasTex(96,96,function(c){c.fillStyle='#fffaf0';c.beginPath();c.arc(48,48,46,0,7);c.fill();c.fillStyle=st.bg==='#f3ead8'?'#1d2440':st.bg;c.textAlign='center';c.textBaseline='middle';c.font='700 56px '+DISP;c.fillText(nice(r[2]).charAt(0),48,52);},true);
  var disc=new THREE.Mesh(new THREE.CircleGeometry(0.7,24),new THREE.MeshBasicMaterial({map:it,fog:false,toneMapped:false}));disc.position.set(-3.3,5.4,1.02);b.add(disc);
  if(r[6]&&icons){var il=makeLabel('','icon','-50%,-50%'),im=document.createElement('img');im.alt='';il.span.appendChild(im);il.img=im;il.world=1.45*sc;il.pos.set(x-3.3*sc,5.4*sc,1.05*sc);
    im.onerror=function(){il.el.style.display='none';};im.src=r[6];icons.push(il);}
}
function buildStreet(){
  var g=new THREE.Group(),top=DATA.top,S=Math.min(6,top.length),PITCH=7.4,stops=[],icons=[],i;
  starField(g,260,150);
  for(i=0;i<S;i++){var rank=S-i,big=rank===1,x=6+i*PITCH+(big?0.9:0);shop(g,top[rank-1],rank,x,big?1.22:1,icons);stops.push({x:x,r:top[rank-1],rank:rank,big:big});}
  var x0=-8,x1=stops[S-1].x+14,len=x1-x0,mx=(x0+x1)/2;
  put(g,G.box,M(0x2b2f45,0.9),x0-4,6,-2.5,8,12,5);put(g,G.box,M(0x2b2f45,0.9),x1+1,5,-2.5,8,10,5);
  var pave=mesh(new THREE.BoxGeometry(len+30,0.3,7),M(0x8d8f98,0.95),false,true);pave.position.set(mx,-0.15,3.4);g.add(pave);
  var road=mesh(new THREE.PlaneGeometry(len+200,160),M(0x2c2f3a,0.95),false,true);road.rotation.x=-Math.PI/2;road.position.set(mx,-0.32,70);g.add(road);
  var bulbs=[0xffd27a,0xe4572e,0x6fd0c0,0xfffaf0],dark=M(0x1a1c26,0.8);
  for(var lx=x0+4;lx<x1;lx+=PITCH*2){
    put(g,G.cyl,dark,lx,3.2,5.6,0.09,6.4,0.09,0,0,0,true);put(g,G.sph,new THREE.MeshBasicMaterial({color:0xfff0c8,fog:false}),lx,6.5,5.6,0.3);
    var lg=glow(0xffc070,6,0.55);lg.position.set(lx,6.5,5.6);g.add(lg);
    for(i=1;i<16;i++){var u=i/16;put(g,G.sph,new THREE.MeshBasicMaterial({color:bulbs[i%4],fog:false}),lx+u*PITCH*2,6.3-Math.sin(u*Math.PI)*0.9,5.6,0.09);}
    put(g,G.box,M(0x5a3a22,0.9),lx+PITCH,0.4,5.3,1.2,0.8,0.8,0,0,0,true);for(i=0;i<8;i++)put(g,G.ico,M(i%2?0x3f7a34:0x5f9a44,0.9,true),lx+PITCH+(rnd()-0.5)*1.0,1.0+rnd()*0.7,5.3+(rnd()-0.5)*0.5,0.34);
  }
  var lamp=new THREE.PointLight(0xffc27a,0.6,24,2);g.add(lamp);
  var WALK=1.05,STAY=1.7,t=1.3,legs=[],prevX=1.5,RZ=2.5;
  stops.forEach(function(sp){var sx=sp.x+2.0*(sp.big?1.22:1);legs.push({t0:t,t1:t+WALK,a:prevX,b:sx,sp:sp});t+=WALK+STAY;prevX=sx;});
  var tLast=legs[S-1].t1,dur=tLast+4.2,one=stops[S-1];
  var caps=[[0,'Street level: a walk past your favourites.']];
  legs.forEach(function(l,k){var r=l.sp.r;caps.push([l.t1-0.25,(k===S-1?'Number one: ':'#'+l.sp.rank+' ')+r[0]+', '+r[1]+'. '+r[3]+' visits. '+r[5]+'.']);});
  return {groups:[g],labels:icons,duration:dur,lag:2.4,mood:'night',captions:caps,bubbles:[[legs[Math.min(1,S-1)].t1+0.2,legs[Math.min(1,S-1)].t1+1.5,q(4)]],
    update:function(t,prev){
      var x=1.5,moving=false,stay=0,k,sc=1;icons.forEach(function(l){setOn(l,true);});
      for(k=0;k<legs.length;k++){var l=legs[k];if(t>=l.t1){x=l.b;sc=l.sp.big?1.22:1;stay=Math.min(1,(t-l.t1)/0.3)*(k===legs.length-1?1:Math.max(0,Math.min(1,(l.t1+STAY-t)/0.3)));}
        else if(t>=l.t0){x=l.a+(l.b-l.a)*smooth((t-l.t0)/(l.t1-l.t0));moving=true;stay=0;break;}else break;}
      var done=t>=tLast,ju=Math.max(0,Math.min(1,(t-tLast-0.1)/0.8)),y=moving?Math.abs(Math.sin(t*11))*0.16:0;
      if(done&&ju<1)y=2.4*4*ju*(1-ju);
      rich.outer.scale.setScalar(1.5);rich.outer.position.set(x,y,RZ);
      rich.outer.rotation.y=done?0.15*smooth(ju):Math.PI/2+stay*(Math.PI/2-0.45);
      rich.pivot.rotation.x=(done&&ju<1)?ju*Math.PI*2:(moving?0.14:0);rich.pivot.scale.set(1,1,1);
      var wave=stay>0.5||done;rich.armL.rotation.z=wave?2.6+Math.sin(t*9)*0.45:0.25+(moving?Math.sin(t*11)*0.5:0);rich.armR.rotation.z=(done)?-2.6:-0.25-(moving?Math.sin(t*11)*0.5:0);
      if(prev<tLast+0.9&&t>=tLast+0.9){[0xf2b632,0xe4572e,0xfffaf0,0x1f8a7d].forEach(function(c){splash(new THREE.Vector3(x,1.2,RZ),c,12,6);});}
      lamp.position.set(x-1.5,5.2,5);this._stay=stay;this._x=x;this._sc=sc;
    },
    cam:function(t){
      var sc=this._sc||1,far=Math.max(12.5,4.6/(TAN*aspect)),near=Math.max(9,3.3*sc/(TAN*aspect)),f=smooth(this._stay||0),x=this._x===undefined?1.5:this._x,D=far+(near-far)*f;
      return {tx:x+1.0-(1.0+2.0*sc)*f,ty:3.9+(sc-1)*2*f,tz:0,ox:3.2*Math.sin(t*0.38)*(1-0.7*f),oy:0.9+0.5*Math.sin(t*0.3)+0.6*f,oz:D};
    }
  };
}

/* ---------- scene 6: the menu of key numbers ---------- */
function buildMenu(){
  var g=new THREE.Group(),L=LAY.L,MX=L*0.6,PW=3.5,PH=6.0,i;
  var span=Y1-Y0+1,fav=CUISINES.slice().sort(function(a,b){return b.n-a.n;})[0],by=YEARS.slice().sort(function(a,b){return b[1]-a[1];})[0];
  var area=((DATA.london&&DATA.london.length>1)?DATA.london:DATA.areas).slice().sort(function(a,b){return b.n-a.n;})[0],one=DATA.top[0];
  var SECT=[['Starters',[[DATA.me?'Meals':'Meals together',String(TOTAL)],['Restaurants',String(DATA.restaurants)],['Years at the table',String(span)]]],
    ['Mains',[['Favourite cuisine',nice(fav.name)+' · '+fav.n],['Top spot',one?one[0]:'–'],['Home turf',area?area.name+' · '+Math.round(area.n/TOTAL*100)+'%':'–'],['Busiest year',by[0]+' · '+by[1]+' meals']]],
    ['Sides',[['Meals a year',(TOTAL/span).toFixed(1)],['Countries',String(DATA.countries)],['Usual verdict',DATA.verdict[0]],['Exceptional meals',String(DATA.exceptional)]]]];
  var pageTex=canvasTex(640,1100,function(c,w,h){
    c.fillStyle='#fffaf0';c.fillRect(0,0,w,h);c.strokeStyle='#c9a23c';c.lineWidth=6;c.strokeRect(18,18,w-36,h-36);c.strokeStyle='#1d2440';c.lineWidth=2;c.strokeRect(30,30,w-60,h-60);
    c.textAlign='center';c.fillStyle='#1d2440';c.font='700 92px '+DISP;c.fillText('MENU',w/2,150);
    c.font='700 27px '+BODY;c.fillStyle='#1f8a7d';c.fillText(PAIR+'  ·  '+Y0+' – '+Y1,w/2,196);
    var y=262;
    SECT.forEach(function(sec){
      c.textAlign='center';c.fillStyle='#e4572e';c.font='700 40px '+DISP;c.fillText(sec[0],w/2,y);
      var tw=c.measureText(sec[0]).width;c.strokeStyle='#e4572e';c.lineWidth=2;[-1,1].forEach(function(sd){c.beginPath();c.moveTo(w/2+sd*(tw/2+16),y-13);c.lineTo(w/2+sd*(tw/2+86),y-13);c.stroke();});
      y+=46;
      sec[1].forEach(function(row){
        c.textAlign='left';c.fillStyle='#1d2440';c.font='700 27px '+BODY;c.fillText(row[0],62,y);var lw=c.measureText(row[0]).width;
        var fs=31;do{c.font='600 '+fs+'px '+DISP;fs-=1;}while(c.measureText(row[1]).width>w-124-lw-40&&fs>16);
        c.textAlign='right';c.fillText(row[1],w-62,y);var vw=c.measureText(row[1]).width;
        c.fillStyle='#9a927e';for(var dx=62+lw+12;dx<w-62-vw-10;dx+=9)c.fillRect(dx,y-4,3,3);
        y+=44;});
      y+=14;});
    c.textAlign='center';c.fillStyle='#1d2440';c.font='italic 700 27px '+BODY;c.fillText(q(6),w/2,y+6);
    c.font='700 21px '+BODY;c.fillStyle='#6f6a5c';c.fillText('First sitting '+DATA.first+'  ·  Latest '+DATA.latest,w/2,h-112);c.fillText('Service not included',w/2,h-78);
  },true);pageTex.wrapS=pageTex.wrapT=THREE.ClampToEdgeWrapping;
  var coverTex=canvasTex(512,880,function(c,w,h){c.fillStyle='#6a1f2a';c.fillRect(0,0,w,h);c.strokeStyle='#d9b24a';c.lineWidth=8;c.strokeRect(26,26,w-52,h-52);c.lineWidth=2;c.strokeRect(42,42,w-84,h-84);
    c.textAlign='center';c.fillStyle='#e6c25a';c.font='700 124px '+DISP;c.fillText('MENU',w/2,330);var cf=54;do{cf-=2;c.font='600 '+cf+'px '+DISP;}while(c.measureText(PAIR).width>w-110&&cf>24);c.fillText(PAIR,w/2,450);
    c.font='700 34px '+BODY;c.fillText(Y0+' – '+Y1,w/2,520);c.lineWidth=5;c.strokeStyle='#e6c25a';c.beginPath();c.arc(w/2,660,54,0,7);c.stroke();c.font='700 50px '+DISP;c.fillText(TOTAL,w/2,678);},true);
  var insideTex=canvasTex(512,880,function(c,w,h){c.fillStyle='#f6ecd6';c.fillRect(0,0,w,h);c.strokeStyle='#c9a23c';c.lineWidth=4;c.strokeRect(30,30,w-60,h-60);
    c.textAlign='center';c.fillStyle='#6a1f2a';c.font='700 150px '+DISP;c.fillText(DATA.me?DATA.full.split(' ').map(function(x){return x.charAt(0);}).join(''):DATA.name.charAt(0)+' & '+DATA.host.charAt(0),w/2,430);c.font='italic 700 40px '+BODY;c.fillText('Bon appétit',w/2,520);},true);
  [coverTex,insideTex].forEach(function(t){t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;});
  var m=new THREE.Group();m.position.set(MX,0.02,0);m.rotation.z=-0.1;g.add(m);
  var leather=M(0x6a1f2a,0.6);
  put(m,G.box,leather,0.1,PH/2+0.1,0,0.12,PH+0.2,PW+0.2,0,0,0,true);
  var page=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),new THREE.MeshBasicMaterial({map:pageTex,fog:false,toneMapped:false}));page.rotation.y=-Math.PI/2;page.position.set(0.03,PH/2+0.1,0);m.add(page);
  put(m,G.box,M(0x5a3a22,0.8),1.5,2.2,0,0.14,4.6,0.5,0,0,0.6,true);
  var hinge=new THREE.Group();hinge.position.set(-0.04,PH/2+0.1,-(PW+0.2)/2);m.add(hinge);
  function face(t){return new THREE.MeshBasicMaterial({map:t,fog:false,toneMapped:false});}
  var cover=new THREE.Mesh(new THREE.BoxGeometry(0.08,PH+0.2,PW+0.2),[face(insideTex),face(coverTex),leather,leather,leather,leather]);cover.position.set(0,0,(PW+0.2)/2);cover.castShadow=true;hinge.add(cover);
  var start={x:MX-9.5,y:0.02,z:0},stop={x:MX-1.3,y:0.02,z:1.15},pts=[start,{x:MX-6.8,y:0.02,z:0.5},{x:MX-4,y:0.02,z:0.2},stop],segs=[],t=0.8;
  for(i=0;i<3;i++){segs.push({t0:t,t1:t+0.6,a:pts[i],b:pts[i+1],H:1.4});t+=0.85;}
  var tOpen=t+0.3,tPush=tOpen-0.2,dur=tOpen+10;
  return {groups:[ROOM.group,g],labels:[],duration:dur,lag:2.4,bounds:ROOM.bounds,mood:'room',
    captions:[[0,'And to finish: the menu.'],[tOpen+0.9,'']],bubbles:[],
    update:function(t,prev){
      var o=hopPose(segs,t,start),op=smooth((t-tOpen)/1.1);hinge.rotation.y=-2.9*op;
      rich.outer.position.set(o.x,o.y+(t>tOpen+1.2?Math.abs(Math.sin(t*3))*0.12:0),o.z);rich.pivot.rotation.x=0;
      var u=smooth((t-tOpen)/0.5);rich.outer.rotation.y=Math.PI/2-u*(Math.PI/2+0.9);
      if(o.air)rich.pivot.scale.set(0.94,1.1,0.94);else squash(o.since);
      var wave=t>=tOpen;rich.armL.rotation.z=(o.air||wave)?2.6+(wave?Math.sin(t*9)*0.45:0):0.25;rich.armR.rotation.z=(o.air||wave)?-2.6:-0.25;
      if(prev<tOpen+1.1&&t>=tOpen+1.1){[0xf2b632,0xe4572e,0xfffaf0,0x1f8a7d].forEach(function(c){splash(new THREE.Vector3(MX-0.6,3.2,(rnd()-0.5)*3),c,10,5);});}
      ROOM.tick(t);
    },
    cam:function(t){
      var k=Math.sqrt(kFit()),p=rich.outer.position,a,R;
      if(t>=tPush){var D=Math.max(8,2.0/(TAN*aspect));return {tx:MX+0.3,ty:PH/2+0.1,tz:0,ox:-D,oy:0.2,oz:0.3*Math.sin(t*0.5)};}
      a=0.5*Math.sin(t*0.6+0.3);R=6.5*k;return {tx:p.x+2.4,ty:1.8,tz:0,ox:-Math.cos(a)*R,oy:3.2,oz:Math.sin(a)*R};
    }
  };
}

/* ---------- scene: who else was at the table, seen through Rich's eyes ---------- */
function buildPeople(){
  var g=new THREE.Group(),C=DATA.companions.slice(0,10).sort(function(a,b){return a[1]-b[1];}),N=C.length,RT=3.5,RS=4.75,TH=1.2,PS=1.55,labels=[],seats=[],i;
  var ft=woodTex('#6a4428',8);ft.repeat.set(8,8);var floor=mesh(new THREE.PlaneGeometry(90,90),texMat(ft,0.75),false,true);floor.rotation.x=-Math.PI/2;g.add(floor);
  put(g,G.cyl,M(0x6a1f2a,0.95),0,0.03,0,8.2,0.06,8.2);put(g,G.cyl,M(0xd9b24a,0.9),0,0.04,0,7.7,0.06,7.7);put(g,G.cyl,M(0x7a2632,0.95),0,0.05,0,7.4,0.06,7.4);
  var tt=woodTex('#c98a45',6);put(g,G.cyl,texMat(tt,0.55),0,TH,0,RT,0.2,RT,0,0,0,true);put(g,G.cyl,M(0x7c5230,0.8),0,TH/2,0,0.55,TH,0.55,0,0,0,true);put(g,G.cyl,M(0x7c5230,0.8),0,0.1,0,1.5,0.2,1.5);
  put(g,G.cyl,M(0xe8c48a,0.5),0,TH+0.15,0,1.45,0.1,1.45,0,0,0,true);
  put(g,G.cyl,M(0x1a1410,0.8),0,10.5,0,0.03,5,0.03);var sh=new THREE.Mesh(new THREE.ConeGeometry(1.5,1.1,24,1,true),new THREE.MeshStandardMaterial({color:0x8a4a14,emissive:0xc46a1c,emissiveIntensity:0.9,side:THREE.DoubleSide,roughness:0.6}));sh.position.y=8.2;g.add(sh);
  var lg=glow(0xffc070,8,0.6);lg.position.y=7.7;g.add(lg);var pl=new THREE.PointLight(0xffc27a,1.5,30,2);pl.position.y=7.2;g.add(pl);
  /* a ring of panelled wall and lamps so there is something behind each face */
  var wallM=texMat(woodTex('#5a3620',10),0.85);wallM.side=THREE.BackSide;wallM.map.repeat.set(10,1);var wall=new THREE.Mesh(new THREE.CylinderGeometry(19,19,12,40,1,true),wallM);wall.position.y=6;g.add(wall);
  for(i=0;i<12;i++){var sa=i/12*6.283,sg=glow(0xffb45a,4,0.5);sg.position.set(Math.sin(sa)*18.4,5,Math.cos(sa)*18.4);g.add(sg);put(g,G.box,M(0x2a1810,0.8),Math.sin(sa+0.26)*18.8,6,Math.cos(sa+0.26)*18.8,0.5,12,0.5,0,sa+0.26,0);}
  var shirts=[0xe4572e,0x1f8a7d,0xf2b632,0x9a8fd1,0xd23c6a,0x3f8a3a,0xc8643a,0x5a6486,0xf3ead8,0x2a9d8f],hairs=[0x2a1a10,0xd9b24a,0x8a4a2a,0x1a1a1a,0xb0b0b0,0x5a3a22,0xc8702a],skins=[0xf1c7a3,0xe0ac80,0xf6d7b8,0xc98e62,0x8a5a3c];
  C.forEach(function(c,k){var a=(k+0.5)/N*6.283,p=makePerson({shirt:shirts[k%10],hair:hairs[(k*3+1)%7],skin:skins[(k*2)%5],glasses:k%3===1,long:k%2===0});
    p.outer.scale.setScalar(PS);p.outer.position.set(Math.sin(a)*RS,0.55,Math.cos(a)*RS);p.outer.rotation.y=a+Math.PI;g.add(p.outer);
    put(g,G.cyl,M(0x8a5326,0.8),Math.sin(a)*RS,0.4,Math.cos(a)*RS,0.55,0.8,0.55,0,0,0,true);
    put(g,G.cyl,glaze(0xfffaf0),Math.sin(a)*(RT-0.75),TH+0.13,Math.cos(a)*(RT-0.75),0.5,0.05,0.5);
    var l=makeLabel('<b>'+c[1]+'</b><i>'+c[0]+'</i>','big'+(k===N-1?' win':''),'-50%,-100%');l.scaleBy=6.2;l.pos.set(Math.sin(a)*RS,0.55+PS*1.5+0.12,Math.cos(a)*RS);labels.push(l);seats.push({p:p,a:a});});
  var start={x:0,y:0,z:11},mid={x:0,y:0,z:7.3},ctr={x:0,y:TH+0.2,z:0};
  var segs=[{t0:0.6,t1:1.15,a:start,b:mid,H:1.2},{t0:1.3,t1:2.2,a:mid,b:ctr,H:3.4,flip:true}],tLand=2.2,tPOV=tLand+0.7,LOOK=1.05,tLast=tPOV+0.5+(N-1)*LOOK,dur=tLast+4.2;
  var EYE=TH+0.2+PS*1.12,HEAD=0.55+PS*1.1,best=C[N-1];
  function who(t){return Math.max(0,Math.min(N-1,Math.floor((t-tPOV-0.5)/LOOK)+1));}
  return {groups:[g],labels:labels,duration:dur,lag:4.2,mood:'room',
    captions:[[0,'Who else was at the table?'],[tPOV,DATA.me?'Round the table, as you see it.':'Round the table, as '+DATA.name+' sees it.'],[tLast+0.3,best[0]+' joined you most: '+best[1]+' of your '+TOTAL+' meals'+WITH+'.']],bubbles:[],
    update:function(t,prev){
      var o=hopPose(segs,t,start),pov=t>=tPOV,cur=who(t);
      rich.outer.visible=!pov;rich.outer.scale.setScalar(PS);rich.outer.position.set(o.x,o.y,o.z);rich.outer.rotation.y=Math.PI;
      rich.pivot.rotation.x=(o.air&&o.seg.flip)?o.u*Math.PI*2:0;if(o.air)rich.pivot.scale.set(0.94,1.1,0.94);else squash(o.since);
      rich.armL.rotation.z=o.air?2.6:0.25;rich.armR.rotation.z=o.air?-2.6:-0.25;
      if(prev<tLand&&t>=tLand){[0xf2b632,0xe4572e,0xfffaf0].forEach(function(c){splash(new THREE.Vector3(0,TH+0.6,0),c,10,5);});}
      if(prev<tLast+0.4&&t>=tLast+0.4){var a=seats[N-1].a;[0xf2b632,0xe4572e,0xfffaf0,0x1f8a7d].forEach(function(c){splash(new THREE.Vector3(Math.sin(a)*3.4,TH+1.2,Math.cos(a)*3.4),c,12,5);});}
      seats.forEach(function(sv,k){var on=pov&&k===cur&&t>tPOV+0.45;setOn(labels[k],on);
        var hi=on||(t>tLast+1.2&&Math.abs(k-cur)<=1);
        sv.p.armL.rotation.x=hi?0:-1.1;sv.p.armL.rotation.z=hi?2.6+Math.sin(t*10+k)*0.5:0.25;sv.p.armR.rotation.x=-1.1;
        sv.p.outer.position.y=0.55+(hi?Math.abs(Math.sin(t*5+k))*0.1:0);});
    },
    cam:function(t){
      if(t<tPOV){var k=Math.sqrt(kFit()),R=11.8*k;return {tx:0,ty:2.1,tz:1.2,ox:0,oy:5.4,oz:R};}
      var a=seats[who(t)].a,hx=Math.sin(a)*RS,hz=Math.cos(a)*RS;
      return {tx:hx,ty:HEAD+0.35,tz:hz,ox:-hx*1.3,oy:EYE-HEAD-0.35,oz:-hz*1.3};
    }
  };
}

/* ---------- scene: the photo book ---------- */
var album=document.getElementById('album'),bookEl,pageEl,snapEls=[];
(function(){
  bookEl=document.createElement('div');bookEl.className='book';
  var h=document.createElement('h2');h.textContent=PAIR+': the photo book';bookEl.appendChild(h);
  pageEl=document.createElement('div');pageEl.className='page';bookEl.appendChild(pageEl);
  for(var i=0;i<9;i++){var f=document.createElement('figure');f.className='snap';f.innerHTML='<div class="ph"><img alt=""><span class="miss">Photo shows on your own site</span></div><figcaption><b></b><i></i><q></q></figcaption>';
    (function(f){var im=f.querySelector('img');im.onload=function(){f.querySelector('.ph').classList.add('ok');};im.onerror=function(){f.querySelector('.ph').classList.remove('ok');};})(f);
    pageEl.appendChild(f);snapEls.push(f);}
  var foot=document.createElement('div');foot.className='foot';foot.innerHTML='<span>'+Math.min(9,DATA.photos.length)+' of '+DATA.photos.length+' photos</span>';
  var b=document.createElement('button');b.type='button';b.id='shuffle';b.textContent='Turn the page';foot.appendChild(b);bookEl.appendChild(foot);album.appendChild(bookEl);
  b.addEventListener('click',function(){st.playing=false;syncBtn();pageEl.classList.add('turn');
    setTimeout(function(){dealPhotos();snapEls.forEach(function(f){f.classList.add('in');});pageEl.classList.remove('turn');},340);});
})();
function dealPhotos(){
  var pool=DATA.photos.slice(),pick=[];while(pick.length<9&&pool.length){pick.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);}
  snapEls.forEach(function(f,k){var p=pick[k];f.style.visibility=p===undefined?'hidden':'';if(p===undefined)return;f.style.setProperty('--r',((Math.random()-0.5)*6).toFixed(1)+'deg');
    f.querySelector('.ph').classList.remove('ok');f.querySelector('img').src=p[0];f.querySelector('b').textContent=p[1];f.querySelector('i').textContent=p[2];f.querySelector('q').textContent=p[3];});
}
function buildPhotos(){
  var L=LAY.L,dur=12;
  return {groups:[],labels:[],duration:dur,lag:2,mood:'room',
    captions:[[0,DATA.photos.length+' photos from your meals'+WITH+'.']],bubbles:[],
    update:function(t,prev){
      if(prev===0||prev>t)dealPhotos();
      bookEl.classList.toggle('in',t>0.3);snapEls.forEach(function(f,k){f.classList.toggle('in',t>0.9+k*0.18);});
      rich.outer.visible=false;
    },
    cam:function(t){return {tx:0,ty:0,tz:0,ox:0,oy:8,oz:0.1};}
  };
}

var BUILD={front:buildFront,feast:buildFeast,years:buildYears,people:buildPeople,places:buildPlaces,street:buildStreet,photos:buildPhotos,menu:buildMenu},scenes={};
var NAMES={front:'Door',feast:'Table',years:'Years',people:'People',street:'Street',places:'Places',photos:'Photos',menu:'Menu'};
var ORDER=['front','feast','years','people','places','street','photos','menu'];
if(TOTAL<10)ORDER=['front','feast','people','street','photos','menu'];
var HAVE={people:DATA.companions.length>0,places:DATA.world.length>0,street:DATA.top.length>0,photos:DATA.photos.length>0};
ORDER=ORDER.filter(function(n){return HAVE[n]!==false;});
ORDER.forEach(function(n){scenes[n]=BUILD[n]();});
var ALLG=[];ORDER.forEach(function(n){scenes[n].groups.forEach(function(x){if(ALLG.indexOf(x)<0){ALLG.push(x);scene.add(x);}});
  var b=document.createElement('button');b.type='button';b.textContent=NAMES[n];b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){go(n);});
  document.getElementById('controls').appendChild(b);chips[n]=b;});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){textTex.forEach(function(f){f();});});
var MOODS={
  room:{hs:0xffd9a8,hg:0x3a2212,hi:0.3,sc:0xffe2b0,si:0.5,so:[12,10,-3],bg:0x1c110a,fog:[24,80],ex:1.0},
  night:{hs:0x8fa8ff,hg:0x20202a,hi:0.5,sc:0xbfd0ff,si:0.55,so:[-6,12,9],bg:0x0d1330,fog:[500,1000],ex:1.15},
  kitchen:{hs:0xffffff,hg:0x8a8f98,hi:0.42,sc:0xfff4e0,si:0.7,so:[3,13,10],bg:0x14161c,fog:[500,1000],ex:1.05},
  dusk:{hs:0xffd9c0,hg:0x39456b,hi:0.7,sc:0xffc890,si:1.0,so:[7,12,9],bg:0x2a3560,fog:[500,1000],ex:1.15}};
function mood(name){
  var m=MOODS[name]||MOODS.room;
  hemi.color.setHex(m.hs);hemi.groundColor.setHex(m.hg);hemi.intensity=m.hi;renderer.toneMappingExposure=m.ex;
  sun.color.setHex(m.sc);sun.intensity=m.si;sunOff.set(m.so[0],m.so[1],m.so[2]);
  scene.background.setHex(m.bg).convertSRGBToLinear();scene.fog.near=m.fog[0];scene.fog.far=m.fog[1];
}
var st={name:'front',t:0,prev:0,playing:!reduce,snap:true,yaw:0,pitch:0};
var cam={tx:0,ty:0,tz:0,ox:0,oy:4,oz:8};

function go(name,play){
  var s=scenes[name];
  ALLG.forEach(function(x){x.visible=s.groups.indexOf(x)>=0;});
  ORDER.forEach(function(n){var on=n===name;chips[n].setAttribute('aria-pressed',on?'true':'false');if(!on)scenes[n].labels.forEach(function(l){setOn(l,false);});});
  rich.outer.visible=true;rich.outer.scale.setScalar(1);rich.chute.visible=false;
  album.classList.toggle('on',name==='photos');
  var cs=document.getElementById('controls'),cb=chips[name];cs.scrollLeft=cb.offsetLeft-cs.offsetLeft-cs.clientWidth/2+cb.offsetWidth/2;
  mood(s.mood);st.name=name;st.t=0;st.prev=0;st.playing=play!==false;st.snap=true;st.yaw=0;st.pitch=0;
  clearParts();setOn(bubble,false);lastCap=null;lastBub=null;syncBtn();
}
function syncBtn(){
  var s=scenes[st.name],end=st.t>=s.duration;
  playBtn.textContent=st.playing?'Pause':(end?'Play again':'Play');
}
playBtn.addEventListener('click',function(){
  var s=scenes[st.name];
  if(!st.playing&&st.t>=s.duration)go(ORDER[0]);else st.playing=!st.playing;
  syncBtn();
});

/* drag to look around */
var drag=null;
stage.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY};try{stage.setPointerCapture(e.pointerId);}catch(_){}});
stage.addEventListener('pointermove',function(e){if(!drag)return;
  st.yaw=Math.max(-1.3,Math.min(1.3,st.yaw-(e.clientX-drag.x)*0.006));
  st.pitch=Math.max(-0.5,Math.min(0.9,st.pitch+(e.clientY-drag.y)*0.004));
  drag.x=e.clientX;drag.y=e.clientY;});
['pointerup','pointercancel'].forEach(function(n){stage.addEventListener(n,function(){drag=null;});});

var lastCap=null,lastBub=null,headPos=new THREE.Vector3();
function hud(s,t){
  var c='';for(var i=0;i<s.captions.length;i++)if(t>=s.captions[i][0])c=s.captions[i][1];
  if(c!==lastCap){captionEl.textContent=c;lastCap=c;}
  var b=null;for(var j=0;j<s.bubbles.length;j++)if(t>=s.bubbles[j][0]&&t<s.bubbles[j][1])b=s.bubbles[j][2];
  if(b!==lastBub){if(b)bubble.span.textContent=b;setOn(bubble,!!b);lastBub=b;}
  rich.outer.getWorldPosition(headPos);bubble.pos.set(headPos.x,headPos.y+1.5*rich.outer.scale.y,headPos.z);
  headPos.project(camera);bubble.anchor=headPos.x>0.15?'-95%,-100%':(headPos.x<-0.15?'-5%,-100%':'-50%,-100%');
}

var clock=new THREE.Clock();
function frame(){
  if(dead)return;
  var dt=Math.min(clock.getDelta(),0.05), s=scenes[st.name];
  if(st.playing){
    st.t+=dt;
    if(st.t>=s.duration){
      var i=ORDER.indexOf(st.name);
      if(i<ORDER.length-1){go(ORDER[i+1]);s=scenes[st.name];}
      else{st.t=s.duration;st.playing=false;syncBtn();}
    }
  }
  s.update(st.t,st.prev);st.prev=st.t;
  stepParts(dt);
  var want=s.cam(st.t), a=st.snap?1:1-Math.exp(-dt*(s.lag||3.2));st.snap=false;
  for(var key in want)cam[key]+=(want[key]-cam[key])*a;
  var cy=Math.cos(st.yaw),sy=Math.sin(st.yaw);
  var ox=cam.ox*cy+cam.oz*sy, oz=-cam.ox*sy+cam.oz*cy, oy=Math.max(0.6,cam.oy*(1+st.pitch));
  var px=cam.tx+ox,py=cam.ty+oy,pz=cam.tz+oz,bd=s.bounds;
  if(bd){px=Math.max(bd.x0,Math.min(bd.x1,px));pz=Math.max(-bd.z,Math.min(bd.z,pz));py=Math.min(bd.y,py);}
  camera.position.set(px,py,pz);camera.lookAt(cam.tx,cam.ty,cam.tz);
  camera.updateMatrixWorld();
  sun.position.set(cam.tx+sunOff.x,sunOff.y,cam.tz+sunOff.z);sun.target.position.set(cam.tx,0,cam.tz);
  hud(s,st.t);
  var fo=0,fc=s.fadeIn||'#120c08',rem=s.duration-st.t,isLast=ORDER.indexOf(st.name)===ORDER.length-1;
  if(st.playing||st.t<s.duration){
    if(st.t<0.45)fo=1-st.t/0.45;
    if(!isLast&&rem<0.45){fo=1-rem/0.45;fc=s.fadeOut||'#120c08';}
    (s.flashes||[]).forEach(function(fl){var fd=Math.abs(st.t-fl[0]);if(fd<0.45&&1-fd/0.45>fo){fo=1-fd/0.45;fc=fl[1];}});
  }
  fadeEl.style.opacity=fo.toFixed(3);if(fo>0)fadeEl.style.background=fc;
  for(var i=0;i<s.labels.length;i++)place(s.labels[i]);
  place(bubble);
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
go('front',!reduce);
if(reduce){st.t=4.5;syncBtn();}

requestAnimationFrame(frame);
return {stop:kill,go:function(name){if(scenes[name])go(name);},acts:ORDER.slice()};
}
root.MealFilm={start:start};
})(typeof window!=='undefined'?window:this);

export const startMealFilm = window.MealFilm.start;
