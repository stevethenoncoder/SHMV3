/* Places globe: a 3D globe with one tower per place, redrawn smoothly when the data changes.
 *
 *   var globe = PlacesGlobe.create(container, { THREE: THREE, geo: geo, onSelect: function(point){} });
 *   globe.update(points);   // points: [{ id, name, lat, lon, n }], n = meals. Towers grow, shrink, appear and sink.
 *   globe.highlight(id);    // optional: mark one tower as selected (null to clear)
 *   globe.destroy();        // on unmount
 *
 * container  an element with a set size. The globe fills it.
 * THREE      three.js r128 (npm three@0.128.0). Falls back to window.THREE.
 * geo        { land: [...], shapes: { ISO2: [...] } } from the same map file as the meal film. Optional.
 * onSelect   called with the point when a tower is clicked or tapped.
 *
 * The camera flies to frame whatever points it is given: the whole world for a spread,
 * down to a single country or city when the points are close together.
 */
(function (root) {
  'use strict';
  var CSS =
    '.pg{position:relative;overflow:hidden;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}' +
    '.pg:active{cursor:grabbing}.pg canvas{display:block;width:100%;height:100%}' +
    '.pg-ov{position:absolute;inset:0;pointer-events:none;overflow:hidden}' +
    '.pg-lb{position:absolute;left:0;top:0;white-space:nowrap;transform-origin:50% 100%;will-change:transform;opacity:0;transition:opacity .2s}' +
    '.pg-lb.on{opacity:1;pointer-events:auto;cursor:pointer}' +
    '.pg-lb span{display:inline-flex;align-items:baseline;gap:6px;background:#fffaf0;color:#1d2440;border:2px solid #1d2440;border-radius:10px;padding:2px 8px;box-shadow:0 2px 0 #1d2440;font:700 12px/1.3 Nunito,"Segoe UI",system-ui,sans-serif}' +
    '.pg-lb b{font:700 15px/1 Fredoka,"Trebuchet MS",sans-serif;color:#e4572e;font-variant-numeric:tabular-nums}' +
    '.pg-lb.top span{background:#f2b632}.pg-lb.top b{color:#1d2440}' +
    '.pg-lb.sel span{background:#1f8a7d;color:#fffaf0;border-color:#1d2440}.pg-lb.sel b{color:#fffaf0}' +
    '.pg-empty{position:absolute;inset:0;display:none;align-items:center;justify-content:center;color:#fffaf0;font:700 15px Nunito,system-ui,sans-serif;text-align:center;padding:20px;pointer-events:none}' +
    '.pg-empty.on{display:flex}';

  function ensureCss() {
    if (document.getElementById('pg-css')) return;
    var s = document.createElement('style'); s.id = 'pg-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(cur, tgt, k) { return cur + (tgt - cur) * k; }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  var D2R = Math.PI / 180;

  function create(container, opts) {
    opts = opts || {};
    var THREE = opts.THREE || root.THREE, geo = opts.geo || {}, onSelect = opts.onSelect || function () {};
    if (!THREE) throw new Error('PlacesGlobe needs three.js r128');
    ensureCss();
    container.classList.add('pg');
    var R = 5, FOV = 40;

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);
    var ov = document.createElement('div'); ov.className = 'pg-ov'; container.appendChild(ov);
    var empty = document.createElement('div'); empty.className = 'pg-empty'; empty.textContent = 'No meals match these filters.'; container.appendChild(empty);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(opts.background || 0x0d1330).convertSRGBToLinear();
    var camera = new THREE.PerspectiveCamera(FOV, 1, 0.001, 400);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 0.75));
    var sun = new THREE.DirectionalLight(0xfff4e0, 0.7); scene.add(sun); scene.add(sun.target);

    /* ---- the globe texture, drawn from the coastline data ---- */
    function pos(lat, lon, r) {
      var ph = (lon + 180) * D2R, la = lat * D2R;
      return new THREE.Vector3(-r * Math.cos(ph) * Math.cos(la), r * Math.sin(la), r * Math.sin(ph) * Math.cos(la));
    }
    var maxTex = renderer.capabilities.maxTextureSize || 4096;
    var TW = Math.min(8192, maxTex, window.innerWidth < 700 ? 4096 : 8192), TH = TW / 2;
    var cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
    var c = cv.getContext('2d');
    var grad = c.createLinearGradient(0, 0, 0, TH);
    grad.addColorStop(0, '#24579a'); grad.addColorStop(0.5, '#2d6cb3'); grad.addColorStop(1, '#24579a');
    c.fillStyle = grad; c.fillRect(0, 0, TW, TH);
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = TW / 4096;
    for (var gx = 0; gx <= 36; gx++) { c.beginPath(); c.moveTo(gx * TW / 36, 0); c.lineTo(gx * TW / 36, TH); c.stroke(); }
    for (var gy = 1; gy < 18; gy++) { c.beginPath(); c.moveTo(0, gy * TH / 18); c.lineTo(TW, gy * TH / 18); c.stroke(); }
    /* draw one outline; outlines that cross the 180 degree line are unwrapped and drawn again on the other side */
    function ring(r, paint) {
      var xs = [], prev = null, sh = 0, mn = 1e9, mx = -1e9;
      for (var i = 0; i < r.length; i++) {
        var lon = r[i][0];
        if (prev !== null) { var d = lon - prev; if (d > 180) sh -= 360; else if (d < -180) sh += 360; }
        prev = lon;
        var x = (lon + sh + 180) / 360 * TW; xs.push(x); if (x < mn) mn = x; if (x > mx) mx = x;
      }
      [-TW, 0, TW].forEach(function (off) {
        if (mx + off < 0 || mn + off > TW) return;
        c.beginPath();
        for (var i = 0; i < r.length; i++) { var y = (90 - r[i][1]) / 180 * TH; if (i) c.lineTo(xs[i] + off, y); else c.moveTo(xs[i] + off, y); }
        c.closePath(); paint();
      });
    }
    function fillStroke() { c.fill(); c.stroke(); }
    c.lineJoin = 'round';
    c.fillStyle = '#74c26b'; c.strokeStyle = '#4f9a4a'; c.lineWidth = TW / 2048;
    (geo.land || []).forEach(function (r) { ring(r, fillStroke); });
    /* finer outlines and borders for the countries in the data */
    var shp = geo.shapes || {};
    c.fillStyle = '#7cc873'; c.strokeStyle = 'rgba(40,90,40,.75)'; c.lineWidth = TW / 4096;
    Object.keys(shp).forEach(function (k) { shp[k].forEach(function (r) { ring(r, fillStroke); }); });
    c.fillStyle = '#f4f8ff'; c.fillRect(0, TH * 0.955, TW, TH * 0.045);
    var tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    var globe = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 }));
    scene.add(globe);
    var halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 48), new THREE.MeshBasicMaterial({ color: 0x6fb8ff, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }));
    scene.add(halo);
    (function stars() {
      var n = 700, p = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { var v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(160 + Math.random() * 60); p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z; }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6dc, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
    })();

    /* ---- towers ---- */
    var unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0);
    var capGeo = new THREE.BoxGeometry(1, 1, 1); capGeo.translate(0, 0.5, 0);
    var COL_TOP = new THREE.Color(0xf2b632).convertSRGBToLinear(), COL = new THREE.Color(0xe4572e).convertSRGBToLinear(),
      COL_LOW = new THREE.Color(0xc9773a).convertSRGBToLinear(), COL_SEL = new THREE.Color(0x1f8a7d).convertSRGBToLinear();
    var capMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.6 });
    var nnDist = 1e9, towers = {}, order = [], up = new THREE.Vector3(0, 1, 0), selected = null, maxN = 1, maxNcur = 1;

    function makeTower(p) {
      var m = new THREE.Mesh(unit, new THREE.MeshStandardMaterial({ color: COL.clone(), roughness: 0.6 }));
      var cap = new THREE.Mesh(capGeo, capMat);
      var g = new THREE.Group(); g.add(m); g.add(cap);
      var nrm = pos(p.lat, p.lon, 1); g.position.copy(nrm).multiplyScalar(R); g.quaternion.setFromUnitVectors(up, nrm);
      scene.add(g);
      var el = document.createElement('div'); el.className = 'pg-lb'; el.innerHTML = '<span><b></b><i></i></span>';
      el.querySelector('i').style.fontStyle = 'normal'; ov.appendChild(el);
      var t = { p: p, g: g, m: m, cap: cap, nrm: nrm, cur: 0, tgt: 0, el: el, w: 0, h: 0, shown: false };
      el.__pgTower = t;
      return t;
    }

    /* ---- camera: orbits the globe; flies to frame the current points ---- */
    var cam = { lat: 25, lon: 0, dist: R * 3.2 }, want = { lat: 25, lon: 0, dist: R * 3.2 };
    var W = 1, H = 1, aspect = 1, userUntil = 0, lastFrame = performance.now(), spin = true;
    function fovHalfMin() { var v = FOV / 2 * D2R; return aspect >= 1 ? v : Math.atan(Math.tan(v) * aspect); }
    function farDist() { return R / Math.sin(fovHalfMin()) * 1.12; }
    function fit(points) {
      if (!points.length) { want.dist = farDist(); return; }
      var s = new THREE.Vector3();
      points.forEach(function (p) { s.add(pos(p.lat, p.lon, 1).multiplyScalar(Math.sqrt(p.n))); });
      if (s.lengthSq() < 1e-9) s.set(0, 0, 1);
      s.normalize();
      var angs = points.map(function (p) { return Math.acos(clamp(pos(p.lat, p.lon, 1).dot(s), -1, 1)); }).sort(function (a, b) { return a - b; });
      var a = angs[Math.min(angs.length - 1, Math.floor(angs.length * 0.92))];
      var lat = Math.asin(clamp(s.y, -1, 1)) / D2R, lon = Math.atan2(s.z, -s.x) / D2R - 180;
      var spread = Math.max(a * 1.35, (points.length === 1 ? 0.03 : 0.012) * D2R);
      if (spread > 55 * D2R) { want.dist = farDist(); want.lat = clamp(lat, -35, 50); want.lon = lon; spin = true; return; }
      var h = R * spread / Math.tan(fovHalfMin()) * 1.05;
      want.dist = Math.min(farDist(), R + h); want.lat = lat; want.lon = lon; spin = false;
    }
    function zf() { return clamp((farDist() - cam.dist) / (farDist() - R * 1.08), 0, 1); }
    var look = new THREE.Vector3();
    function placeCamera() {
      var h = cam.dist - R, z = zf(), tilt = Math.min(0.75 * h / R, 0.55) * z;
      var la = cam.lat * D2R - tilt, lo = cam.lon;
      camera.position.copy(pos(la / D2R, lo, cam.dist));
      look.copy(pos(cam.lat, cam.lon, R * Math.min(1, z * 1.6)));
      camera.up.set(0, 1, 0); camera.lookAt(look);
      sun.position.copy(pos(cam.lat + 25, cam.lon - 30, 30)); sun.target.position.set(0, 0, 0);
    }

    function resize() {
      W = container.clientWidth || 1; H = container.clientHeight || 1; aspect = W / H;
      renderer.setSize(W, H, false); camera.aspect = aspect; camera.updateProjectionMatrix();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);
    resize();

    /* ---- input: drag to turn, wheel or pinch to zoom, click or tap a tower to select ---- */
    var ptrs = {}, dragMoved = 0, pinch0 = 0, dist0 = 0, ray = new THREE.Raycaster(), mv = new THREE.Vector2(), hover = null;
    function hit(ev) {
      var r = renderer.domElement.getBoundingClientRect();
      mv.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(mv, camera);
      var ms = order.filter(function (t) { return t.tgt > 0; }).map(function (t) { return t.m; });
      var hs = ray.intersectObjects(ms, false);
      if (!hs.length) return null;
      var gh = ray.intersectObject(globe, false);
      if (gh.length && gh[0].distance < hs[0].distance - 0.01) return null;
      for (var i = 0; i < order.length; i++) if (order[i].m === hs[0].object) return order[i];
      return null;
    }
    var downLabel = null;
    function down(ev) {
      downLabel = ev.target && ev.target.closest ? ev.target.closest('.pg-lb') : null;
      ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      try { container.setPointerCapture(ev.pointerId); } catch (e) {}
      dragMoved = 0; userUntil = performance.now() + 6000; want.lat = cam.lat; want.lon = cam.lon; want.dist = cam.dist;
      var ids = Object.keys(ptrs);
      if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.dist; }
    }
    function move(ev) {
      var p = ptrs[ev.pointerId];
      if (!p) {
        if (ev.pointerType === 'mouse') { var t = hit(ev); if (t !== hover) { hover = t; container.style.cursor = t ? 'pointer' : ''; } }
        return;
      }
      var dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
      var ids = Object.keys(ptrs);
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 0) { cam.dist = want.dist = clamp(R + (dist0 - R) * pinch0 / d, R * 1.0015, farDist() * 1.25); }
        dragMoved += 10; return;
      }
      dragMoved += Math.abs(dx) + Math.abs(dy);
      var k = (cam.dist - R) / R * 0.35 / Math.max(240, H) * 180;
      cam.lon = want.lon = cam.lon - dx * k; cam.lat = want.lat = clamp(cam.lat + dy * k, -80, 80);
      userUntil = performance.now() + 6000; spin = false;
    }
    function upEv(ev) {
      var wasTap = dragMoved < 6 && Object.keys(ptrs).length === 1;
      delete ptrs[ev.pointerId]; pinch0 = 0;
      if (wasTap) { var t = downLabel && downLabel.__pgTower ? downLabel.__pgTower : hit(ev); if (t && t.tgt > 0) onSelect(t.p); }
      downLabel = null;
    }
    function wheel(ev) {
      ev.preventDefault();
      var f = Math.exp(ev.deltaY * 0.0012);
      cam.dist = want.dist = clamp(R + (cam.dist - R) * f, R * 1.0015, farDist() * 1.25);
      userUntil = performance.now() + 6000; spin = false;
    }
    container.addEventListener('pointerdown', down);
    container.addEventListener('pointermove', move);
    container.addEventListener('pointerup', upEv);
    container.addEventListener('pointercancel', function (ev) { delete ptrs[ev.pointerId]; pinch0 = 0; });
    container.addEventListener('wheel', wheel, { passive: false });

    /* ---- per frame ---- */
    var pv = new THREE.Vector3(), cdir = new THREE.Vector3(), raf = 0, dead = false;
    function frame(now) {
      if (dead) return;
      var dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
      var userBusy = now < userUntil || Object.keys(ptrs).length;
      if (!userBusy) {
        var k = 1 - Math.exp(-dt * 2.2);
        cam.lat = ease(cam.lat, want.lat, k);
        cam.lon = cam.lon + wrap((want.lon - cam.lon) * D2R) / D2R * k;
        cam.dist = ease(cam.dist, want.dist, k);
        if (spin && zf() < 0.08) { want.lon += dt * 4; }
      }
      placeCamera();

      /* tower sizes follow the zoom so they read the same at any distance */
      var h = Math.max(0.002, cam.dist - R), V = h * Math.tan(fovHalfMin()), maxH = Math.min(R * 0.9, V * 0.55), wd = Math.max(0.00004, Math.min(V * (order.length > 60 ? 0.018 : 0.03), nnDist * 0.45));
      maxNcur = ease(maxNcur, maxN, 1 - Math.exp(-dt * 4));
      var kk = 1 - Math.exp(-dt * 5);
      cdir.copy(camera.position).normalize();
      for (var i = order.length - 1; i >= 0; i--) {
        var t = order[i];
        t.cur = ease(t.cur, t.tgt, kk);
        if (t.tgt === 0 && t.cur < maxNcur * 0.004) {
          scene.remove(t.g); t.m.material.dispose(); ov.removeChild(t.el); delete towers[t.p.id]; order.splice(i, 1); continue;
        }
        var ht = Math.max(0.0005, maxH * Math.sqrt(Math.max(0, t.cur) / Math.max(1, maxNcur)));
        var w = t.rank === 0 ? wd * 1.4 : wd;
        t.m.scale.set(w, ht, w);
        t.cap.scale.set(w * 1.18, wd * 0.25, w * 1.18); t.cap.position.y = ht;
        t.m.material.color.copy(t.p.id === selected ? COL_SEL : t.rank === 0 ? COL_TOP : t.rank < 3 ? COL : COL_LOW);
        t.tip = t.tip || new THREE.Vector3();
        t.tip.copy(t.nrm).multiplyScalar(R + ht + wd * 0.4);
      }

      /* labels: biggest first, skip any that would overlap one already placed or face away */
      var placed = [], shown = 0, ranked = order.slice().filter(function (t) { return t.tgt > 0; }).sort(function (a, b) { return b.p.n - a.p.n; });
      ranked.forEach(function (t) {
        var on = false;
        var facing = t.nrm.dot(cdir) - R / cam.dist;
        if (facing > 0.02 * (1 - R / cam.dist) && shown < 14) {
          pv.copy(t.tip).project(camera);
          var x = (pv.x * 0.5 + 0.5) * W, y = (-pv.y * 0.5 + 0.5) * H;
          if (!t.w) { t.w = t.el.offsetWidth || 80; t.h = t.el.offsetHeight || 22; }
          var box = [x - t.w / 2, y - t.h - 4, x + t.w / 2, y - 4];
          var clash = box[0] < 2 || box[2] > W - 2 || box[1] < 2 || placed.some(function (b) { return !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]); });
          if (!clash || t === hover || t.p.id === selected) {
            on = true; placed.push(box); shown++;
            t.el.style.transform = 'translate(' + (x - t.w / 2).toFixed(1) + 'px,' + (y - t.h - 4).toFixed(1) + 'px)';
          }
        }
        if (on !== t.shown) { t.shown = on; t.el.classList.toggle('on', on); }
        t.el.classList.toggle('sel', t.p.id === selected);
      });
      order.forEach(function (t) { if (t.tgt === 0 && t.shown) { t.shown = false; t.el.classList.remove('on'); } });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function update(points, o) {
      o = o || {};
      points = (points || []).filter(function (p) { return p && p.n > 0 && isFinite(p.lat) && isFinite(p.lon); });
      var seen = {};
      maxN = Math.max(1, points.reduce(function (m, p) { return Math.max(m, p.n); }, 0));
      points.slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (p, i) {
        seen[p.id] = 1;
        var t = towers[p.id];
        if (!t) { t = towers[p.id] = makeTower(p); order.push(t); }
        t.p = p; t.tgt = p.n; t.rank = i; t.w = 0;
        t.el.querySelector('b').textContent = p.n.toLocaleString('en-GB');
        t.el.querySelector('i').textContent = p.name;
        t.el.classList.toggle('top', i === 0);
      });
      order.forEach(function (t) { if (!seen[t.p.id]) t.tgt = 0; });
      /* keep towers thinner than the usual gap between neighbours, so close restaurants do not merge */
      var vs = points.map(function (p) { return pos(p.lat, p.lon, R); }), nn = [];
      for (var i = 0; i < vs.length; i++) { var best = 1e9; for (var j = 0; j < vs.length; j++) if (i !== j) { var d = vs[i].distanceTo(vs[j]); if (d > 1e-6 && d < best) best = d; } if (best < 1e9) nn.push(best); }
      nn.sort(function (a, b) { return a - b; }); nnDist = nn.length ? nn[Math.floor(nn.length * 0.35)] : 1e9;
      empty.classList.toggle('on', !points.length);
      if (o.fit !== false) { userUntil = 0; fit(points); }
    }

    function destroy() {
      dead = true; cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
      container.innerHTML = ''; container.classList.remove('pg');
    }

    return { update: update, highlight: function (id) { selected = id; }, destroy: destroy };
  }

  root.PlacesGlobe = { create: create };
})(typeof window !== 'undefined' ? window : this);

export const createPlacesGlobe = (container, opts) => window.PlacesGlobe.create(container, opts);
