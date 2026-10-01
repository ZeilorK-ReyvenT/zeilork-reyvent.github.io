document.documentElement.classList.add('js');
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAL = {}, FULL = {};
  document.querySelectorAll('.thumb[data-gallery]').forEach(function(link){
    var g = link.dataset.gallery, items = GAL[g] || (GAL[g] = []), key = g + '-' + items.length;
    link.dataset.index = items.length;
    FULL[key] = link.getAttribute('href');
    items.push({ key: key, cap: link.closest('figure').querySelector('.cap b').textContent });
  });
  var TRACKS = {"lazos": {"src": "media/lazos-sinceros.mp4", "title": "Lazos sinceros", "sub": "Música de ambiente · tema original creado con IA", "loop": true, "vol": 0.45}, "victoria": {"src": "media/victoria-flameante.mp4", "title": "Victoria flameante", "sub": "Opening instrumental · muestra", "loop": false, "vol": 0.7}};

  /* Hero entrance */
  var hero = document.querySelector('.hero');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ hero.classList.add('ready'); }); });

  /* Atmosphere streaks (R1 recreated in code): two depth layers + occasional shooting streak that leaves a fading trail */
  function streaks(canvas, host, opts){
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), W = 0, H = 0, back = [], front = [], meteors = [], raf = null, last = 0, running = false, nextMeteor = 0, bandTop = true;
    var alphaMul = opts.alpha || 1;
    function col(){ var r = Math.random(); return r < .05 ? '240,70,90' : (r < .11 ? '110,150,255' : '215,226,244'); }
    function make(layer, fresh){
      var f = layer === 'front', y = Math.random(); y = .5 + (y - .5) * (Math.random() < .55 ? 1 : .55);
      return { x: fresh ? W + 50 : Math.random() * W, y: y * H, len: f ? 10 + Math.random() * 40 : 5 + Math.random() * 24,
        a: (f ? .22 + Math.random() * .42 : .07 + Math.random() * .18) * alphaMul, v: (f ? 11 + Math.random() * 12 : 4 + Math.random() * 5) * opts.speed, col: col(), w: f && Math.random() < .25 ? 1.6 : 1 };
    }
    function resize(){
      var w = canvas.clientWidth || host.clientWidth, h = canvas.clientHeight || host.clientHeight;
      if (w === W && h === H) return;                         /* nothing changed (e.g. the phone's address bar moved) */
      var rebuild = !W || Math.abs(w - W) > 1;                /* only a real width change redistributes the streaks */
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (rebuild){
        var n = Math.round(Math.min(150, Math.max(50, W * H / 9000)) * opts.density);
        back = []; front = [];
        for (var i = 0; i < n; i++) back.push(make('back', false));
        for (var j = 0; j < Math.round(n * .6); j++) front.push(make('front', false));
      }
      draw(0, 0);
    }
    function drawLayer(arr, layer, dt){
      for (var i = 0; i < arr.length; i++){
        var p = arr[i]; p.x -= p.v * dt;
        if (p.x + p.len < 0){ arr[i] = p = make(layer, true); }
        ctx.fillStyle = 'rgba(' + p.col + ',' + p.a + ')';
        ctx.fillRect(p.x, p.y, p.len, p.w);
      }
    }
    function spawnMeteor(){
      var y = bandTop ? H * (.06 + Math.random() * .17) : H * (.78 + Math.random() * .15); bandTop = !bandTop;
      meteors.push({ x: W + 30, x0: W + 30, y: y, v: 700 + Math.random() * 260, age: 0 });
    }
    function drawMeteors(dt, t){
      if (t > nextMeteor){ nextMeteor = t + 5000 + Math.random() * 3000; spawnMeteor(); }
      for (var k = meteors.length - 1; k >= 0; k--){
        var m = meteors[k]; m.age += dt; m.x -= m.v * dt;
        var a = Math.min(1, m.age / .3);                                   /* fade in */
        if (m.x < W * .22) a *= Math.max(0, m.x / (W * .22));             /* fade out near the end */
        var L = Math.min(m.v * .75, m.x0 - m.x), hx = m.x, tx = m.x + L, y = m.y;   /* tail = the path of the last .75 s */
        if (a > 0 && L > 1){
          var g1 = ctx.createLinearGradient(hx, 0, tx, 0);                 /* soft outer glow of the trail */
          g1.addColorStop(0, 'rgba(150,190,255,' + (.34 * a) + ')'); g1.addColorStop(1, 'rgba(150,190,255,0)');
          ctx.fillStyle = g1; ctx.beginPath(); ctx.moveTo(hx, y - 3.4); ctx.lineTo(tx, y - .4); ctx.lineTo(tx, y + .4); ctx.lineTo(hx, y + 3.4); ctx.closePath(); ctx.fill();
          var g2 = ctx.createLinearGradient(hx, 0, tx, 0);                 /* bright core that thins out */
          g2.addColorStop(0, 'rgba(255,255,255,' + (.95 * a) + ')'); g2.addColorStop(.3, 'rgba(215,230,255,' + (.55 * a) + ')'); g2.addColorStop(1, 'rgba(180,205,255,0)');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(hx, y - 1.3); ctx.lineTo(tx, y - .1); ctx.lineTo(tx, y + .1); ctx.lineTo(hx, y + 1.3); ctx.closePath(); ctx.fill();
        }
        if (a > 0){                                                         /* glowing head */
          ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(225,238,255,' + a + ')';
          ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.beginPath(); ctx.arc(hx, y, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (m.x <= 0) meteors.splice(k, 1);
      }
    }
    function draw(dt, t){
      ctx.clearRect(0, 0, W, H);
      drawLayer(back, 'back', dt); drawLayer(front, 'front', dt);
      if (opts.meteors && !reduced && t) drawMeteors(dt, t);
    }
    function loop(t){
      if (!running) return;
      var dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
      if (!nextMeteor) nextMeteor = t + 2500;
      draw(dt, t); raf = requestAnimationFrame(loop);
    }
    function start(){ if (running || reduced) return; running = true; last = 0; raf = requestAnimationFrame(loop); }
    function stop(){ running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
    function hostVisible(){ if (opts.always) return true; var r = host.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }
    resize();
    var tm; window.addEventListener('resize', function(){ clearTimeout(tm); tm = setTimeout(resize, 120); });
    if (!opts.always && 'IntersectionObserver' in window){
      new IntersectionObserver(function(es){ es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(host);
    } else { start(); }
    document.addEventListener('visibilitychange', function(){ document.hidden ? stop() : (hostVisible() && start()); });
  }
  streaks(document.getElementById('streaks-hero'), hero, { speed: 1.35, density: 1, meteors: true });
  var cierre = document.getElementById('contacto');
  streaks(document.getElementById('streaks-cierre'), cierre, { speed: .8, density: .7, meteors: false });
  streaks(document.getElementById('streaks-page'), document.documentElement, { speed: .45, density: .35, meteors: false, alpha: .55, always: true });

  /* Soft section glows drift a little with the scroll */
  var secs = document.querySelectorAll('.section'), ticking = false;
  function parallax(){
    ticking = false; var vh = window.innerHeight;
    secs.forEach(function(sec){ var r = sec.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
      var p = ((r.top + r.height / 2) - vh / 2) / vh; sec.style.setProperty('--py', (p * -40).toFixed(1) + 'px'); });
  }
  if (!reduced){ window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(parallax); } }, { passive: true }); parallax(); }

  /* Cursor tilt on the logo (desktop only, max ~3 degrees) */
  var wrap = document.getElementById('lockup-wrap');
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    hero.addEventListener('mousemove', function(e){
      var r = hero.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
      wrap.style.transform = 'rotateY(' + (dx * 6).toFixed(2) + 'deg) rotateX(' + (-dy * 6).toFixed(2) + 'deg)';
    });
    hero.addEventListener('mouseleave', function(){ wrap.style.transform = ''; });
  }

  /* Native section index: links work even without JavaScript. */
  var sectionMenu = document.getElementById('section-menu'), menuSummary = sectionMenu.querySelector('summary');
  sectionMenu.querySelectorAll('a').forEach(function(link){
    link.addEventListener('click', function(){
      sectionMenu.open = false;
      var target = document.querySelector(link.getAttribute('href'));
      if (target){ target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true}); }
    });
  });
  sectionMenu.addEventListener('keydown', function(e){
    if (e.key === 'Escape'){ sectionMenu.open = false; menuSummary.focus(); }
  });
  document.addEventListener('click', function(e){ if (!sectionMenu.contains(e.target)) sectionMenu.open = false; });
  sectionMenu.addEventListener('focusout', function(e){ if (!sectionMenu.contains(e.relatedTarget)) sectionMenu.open = false; });
  window.matchMedia('(min-width: 1001px)').addEventListener('change', function(e){ if (e.matches) sectionMenu.open = false; });

  /* Reveals */
  var targets = document.querySelectorAll('.rv, .steps');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .01, rootMargin: '0px 0px -32px 0px' });
    targets.forEach(function(t){ io.observe(t); });
  } else { targets.forEach(function(t){ t.classList.add('in'); }); }

  /* Music player: the round button only opens/closes the panel; music starts only when a song is chosen */
  var mp = document.getElementById('mp'), audio = document.getElementById('audio'),
      mpToggle = document.getElementById('mp-toggle'), mpPlay = document.getElementById('mp-play'), mpIcon = document.getElementById('mp-play-icon'),
      mpFill = document.getElementById('mp-fill'), mpTime = document.getElementById('mp-time'), mpSeek = document.getElementById('mp-seek'), mpKnob = document.getElementById('mp-knob'),
      mpRep = document.getElementById('mp-rep'), rows = document.querySelectorAll('.mp-track'), toastTimer = null, toasting = false,
      cur = null, dragging = false, repeatMode = 0, playRequest = 0;
  var mpStatus = document.getElementById('mp-status'), mpPanel = document.getElementById('mp-panel');
  var ICON_PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z', ICON_PLAY = 'M8 5v14l11-7z', ORDER = ['lazos', 'victoria'];
  var REP_LABELS = ['Sin repetir', 'Repetir ambas', 'Repetir esta'], REP_ARIA = ['sin repetir', 'las dos canciones en bucle', 'esta canción en bucle'];
  function setTimeText(t){ if (!toasting) mpTime.textContent = t; }
  function showToast(text){
    toasting = true; mpTime.textContent = text; mpTime.classList.add('toast'); clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toasting = false; mpTime.classList.remove('toast'); setTimeText(fmt(audio.currentTime) + ' / ' + fmt(audio.duration)); }, 1500);
  }
  function fmt(x){ x = Math.max(0, Math.floor(x || 0)); return Math.floor(x / 60) + ':' + ('0' + (x % 60)).slice(-2); }
  function setState(playing){
    mp.classList.toggle('playing', playing);
    mpIcon.setAttribute('d', playing ? ICON_PAUSE : ICON_PLAY); mpPlay.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    rows.forEach(function(r){ var on = r.dataset.track === cur; r.classList.toggle('active', on); r.classList.toggle('playing', on && playing); r.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function openPanel(){ mp.classList.add('open'); mpPanel.inert = false; mp.classList.remove('hint'); mpToggle.setAttribute('aria-expanded', 'true'); mpToggle.setAttribute('aria-label', 'Música original: cerrar el reproductor'); }
  function closePanel(restoreFocus){ if (restoreFocus) mpToggle.focus(); mpPanel.inert = true; mp.classList.remove('open'); mpToggle.setAttribute('aria-expanded', 'false'); mpToggle.setAttribute('aria-label', 'Música original: abrir el reproductor'); }
  function paint(ratio){
    var pc = (Math.max(0, Math.min(1, ratio)) * 100) + '%'; mpFill.style.width = pc; mpKnob.style.left = pc;
    var d = Number.isFinite(audio.duration) ? audio.duration : 0, c = ratio * d;
    mpSeek.setAttribute('aria-valuemax', Math.round(d)); mpSeek.setAttribute('aria-valuenow', Math.round(c)); mpSeek.setAttribute('aria-valuetext', fmt(c) + ' de ' + fmt(d));
  }
  function load(k){
    if (cur === k && !audio.error) return; var t = TRACKS[k]; cur = k;
    audio.src = t.src; audio.loop = false; try { audio.volume = t.vol; } catch(e){}
    mpPlay.disabled = false; paint(0); setTimeText('0:00 / 0:00');
  }
  function play(k){
    load(k); pauseVideos(); openPanel();
    mpStatus.hidden = true;
    var request = ++playRequest, p = audio.play();
    if (p && p.then) p.then(function(){ if (request === playRequest) setState(true); }).catch(function(err){
      if (request !== playRequest || err.name === 'AbortError') return;
      setState(false); mpStatus.textContent = 'No se pudo reproducir la canción. Pulsa reproducir para reintentarlo.'; mpStatus.hidden = false;
    }); else setState(true);
  }
  function pause(){ playRequest++; audio.pause(); setState(false); }
  function pauseVideos(){ document.querySelectorAll('video').forEach(function(v){ if (!v.paused) v.pause(); }); }
  function seekTo(ratio){
    var d = audio.duration; if (!d || !isFinite(d)) return;
    ratio = Math.max(0, Math.min(1, ratio)); audio.currentTime = ratio * d; paint(ratio); setTimeText(fmt(ratio * d) + ' / ' + fmt(d));
  }
  function ratioFromEvent(e){ var r = mpSeek.getBoundingClientRect(); return (e.clientX - r.left) / r.width; }
  mpToggle.addEventListener('click', function(){
    if (mp.classList.contains('open')) closePanel(true);
    else { openPanel(); requestAnimationFrame(function(){ rows[0].focus(); }); }
  });
  mp.addEventListener('keydown', function(e){ if (e.key === 'Escape' && mp.classList.contains('open')){ e.preventDefault(); closePanel(true); } });
  audio.addEventListener('error', function(){
    setState(false); mpStatus.textContent = 'No se pudo cargar la canción. Comprueba la conexión y pulsa reproducir para reintentar.'; mpStatus.hidden = false;
  });
  rows.forEach(function(r){ r.addEventListener('click', function(){ if (cur === r.dataset.track && !audio.paused) pause(); else play(r.dataset.track); }); });
  mpPlay.addEventListener('click', function(){ if (!cur) return; audio.paused ? play(cur) : pause(); });
  mpRep.addEventListener('click', function(){
    repeatMode = (repeatMode + 1) % 3; mpRep.dataset.mode = repeatMode;
    mpRep.title = REP_LABELS[repeatMode]; mpRep.setAttribute('aria-label', 'Repetición: ' + REP_ARIA[repeatMode] + '. Toca para cambiar el modo');
    showToast(REP_LABELS[repeatMode]);
  });
  audio.addEventListener('ended', function(){
    if (repeatMode === 2){ audio.currentTime = 0; play(cur); }
    else if (repeatMode === 1){ play(ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]); }
    else { setState(false); audio.currentTime = 0; paint(0); setTimeText('0:00 / ' + fmt(audio.duration)); }
  });
  audio.addEventListener('pause', function(){ if (!audio.ended) setState(false); });
  audio.addEventListener('play', function(){ setState(true); });
  audio.addEventListener('timeupdate', function(){
    if (dragging) return; var d = audio.duration || 0; paint(d ? audio.currentTime / d : 0);
    setTimeText(fmt(audio.currentTime) + ' / ' + fmt(d));
  });
  audio.addEventListener('durationchange', function(){ setTimeText(fmt(audio.currentTime) + ' / ' + fmt(audio.duration)); });
  mpSeek.addEventListener('pointerdown', function(e){
    if (!audio.duration) return; dragging = true; mpSeek.classList.add('drag');
    try { mpSeek.setPointerCapture(e.pointerId); } catch(err){}
    seekTo(ratioFromEvent(e));
  });
  mpSeek.addEventListener('pointermove', function(e){ if (dragging) seekTo(ratioFromEvent(e)); });
  function endDrag(){ dragging = false; mpSeek.classList.remove('drag'); }
  mpSeek.addEventListener('pointerup', endDrag); mpSeek.addEventListener('pointercancel', endDrag);
  mpSeek.addEventListener('keydown', function(e){
    var d = audio.duration; if (!d) return; var c = audio.currentTime;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp'){ e.preventDefault(); seekTo((c + 5) / d); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown'){ e.preventDefault(); seekTo((c - 5) / d); }
    else if (e.key === 'Home'){ e.preventDefault(); seekTo(0); }
    else if (e.key === 'End'){ e.preventDefault(); seekTo(.999); }
  });
  var sampleBtn = document.getElementById('btn-sample');
  if (sampleBtn) sampleBtn.addEventListener('click', function(){ play('victoria'); requestAnimationFrame(function(){ rows[1].focus(); }); });
  /* Hint label after the hero entrance */
  setTimeout(function(){ if (!mp.classList.contains('open')) mp.classList.add('hint'); }, 3800);
  setTimeout(function(){ mp.classList.remove('hint'); }, 9800);

  /* Videos keep native controls as the no-script fallback. */
  document.querySelectorAll('.vwrap').forEach(function(w){
    var v = w.querySelector('video'), b = w.querySelector('.vplay');
    var message = document.createElement('p'); message.className = 'media-status'; message.setAttribute('role', 'status'); message.hidden = true;
    w.parentNode.appendChild(message);
    v.controls = false;
    function failed(){ message.textContent = 'No se pudo reproducir el video. Puedes volver a intentarlo con el botón de reproducción.'; message.hidden = false; w.classList.remove('playing'); v.controls = false; }
    b.addEventListener('click', function(){
      message.hidden = true;
      if (v.error) v.load();
      v.controls = true; w.classList.add('playing');
      v.focus();
      var p = v.play(); if (p && p.catch) p.catch(function(err){ if (err.name !== 'AbortError') { failed(); b.focus(); } });
    });
    v.addEventListener('error', failed);
    v.querySelectorAll('source').forEach(function(s){ s.addEventListener('error', failed); });
    v.addEventListener('play', function(){
      if (!audio.paused) pause();
      closePanel(false);
      document.querySelectorAll('video').forEach(function(o){ if (o !== v && !o.paused) o.pause(); });
    });
    v.addEventListener('ended', function(){
      var hadFocus = document.activeElement === v;
      w.classList.remove('playing'); v.controls = false; v.currentTime = 0;
      if (hadFocus) b.focus();
    });
  });

  /* Lightbox */
  var lb = document.getElementById('lb'), img = document.getElementById('lb-img'),
      cap = document.getElementById('lb-cap'), cnt = document.getElementById('lb-count'),
      btnClose = lb.querySelector('.lb-close'), btnPrev = lb.querySelector('.lb-prev'), btnNext = lb.querySelector('.lb-next'),
      curLb = { g: null, i: 0 }, opener = null, closing = false;
  var originalLink = document.getElementById('lb-original'), lbStatus = document.getElementById('lb-status');
  var background = [document.getElementById('topbar'), document.querySelector('main'), document.querySelector('footer'), mp, document.querySelector('.skip')];
  img.addEventListener('error', function(){ lbStatus.textContent = 'No se pudo cargar la imagen. Prueba con el enlace a la imagen completa.'; lbStatus.hidden = false; });

  function thumbFor(g, i){ return document.querySelector('.thumb[data-gallery="' + g + '"][data-index="' + i + '"]'); }
  function setItem(g, i){
    var it = GAL[g][i]; curLb.g = g; curLb.i = i;
    lbStatus.hidden = true; originalLink.href = FULL[it.key];
    img.src = FULL[it.key]; img.alt = thumbFor(g, i).querySelector('img').alt;
    cap.textContent = it.cap; cnt.textContent = (i + 1) + ' de ' + GAL[g].length;
    var single = GAL[g].length < 2; btnPrev.hidden = single; btnNext.hidden = single;
  }
  function flipFrom(rect){
    var fr = img.getBoundingClientRect(); if (!fr.width) return;
    var sx = rect.width / fr.width, sy = rect.height / fr.height;
    img.style.transition = 'none';
    img.style.transform = 'translate(' + (rect.left - fr.left) + 'px,' + (rect.top - fr.top) + 'px) scale(' + sx + ',' + sy + ')';
    img.getBoundingClientRect();
    img.style.transition = 'transform .45s cubic-bezier(.2,.7,.2,1)';
    img.style.transform = 'none';
  }
  function open(g, i, btn){
    opener = btn; setItem(g, i);
    lb.hidden = false; background.forEach(function(el){ el.inert = true; }); document.body.classList.add('lb-open');
    var rect = btn.querySelector('img').getBoundingClientRect();
    var go = function(){ lb.classList.add('open'); if (!reduced) flipFrom(rect); btnClose.focus({ preventScroll: true }); };
    (img.decode ? img.decode().catch(function(){}) : Promise.resolve()).then(function(){ requestAnimationFrame(go); });
  }
  function close(){
    if (closing) return; closing = true;
    var t = opener, done = function(){
      lb.hidden = true; lb.classList.remove('open'); img.style.transform = ''; img.style.transition = ''; img.style.opacity = '';
      background.forEach(function(el){ el.inert = false; }); document.body.classList.remove('lb-open'); closing = false; if (t) t.focus({ preventScroll: true });
    };
    if (!reduced && t){
      var r = t.querySelector('img').getBoundingClientRect(), fr = img.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight && fr.width){
        img.style.transition = 'transform .38s cubic-bezier(.4,0,.6,1)';
        img.style.transform = 'translate(' + (r.left - fr.left) + 'px,' + (r.top - fr.top) + 'px) scale(' + (r.width / fr.width) + ',' + (r.height / fr.height) + ')';
      }
    }
    lb.classList.remove('open'); setTimeout(done, reduced ? 0 : 360);
  }
  function step(d){
    var n = GAL[curLb.g].length, i = (curLb.i + d + n) % n, dx = d > 0 ? 28 : -28;
    if (reduced){ setItem(curLb.g, i); return; }
    img.style.transition = 'opacity .16s ease, transform .16s ease';
    img.style.opacity = '0'; img.style.transform = 'translateX(' + (-dx) + 'px)';
    setTimeout(function(){
      setItem(curLb.g, i);
      img.style.transition = 'none'; img.style.transform = 'translateX(' + dx + 'px)'; img.getBoundingClientRect();
      img.style.transition = 'opacity .22s ease, transform .28s cubic-bezier(.2,.7,.2,1)';
      img.style.opacity = '1'; img.style.transform = 'none';
    }, 160);
  }
  document.querySelectorAll('.thumb').forEach(function(b){
    b.addEventListener('click', function(e){ if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); open(b.dataset.gallery, +b.dataset.index, b); });
  });
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function(){ step(-1); });
  btnNext.addEventListener('click', function(){ step(1); });
  lb.addEventListener('click', function(e){ if (e.target === lb) close(); });
  document.addEventListener('keydown', function(e){
    if (lb.hidden) return;
    if (e.key === 'Escape'){ e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight'){ e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft'){ e.preventDefault(); step(-1); }
    else if (e.key === 'Tab'){
      var f = Array.from(lb.querySelectorAll('a[href], button')).filter(function(x){ return !x.hidden; });
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl){ e.preventDefault(); first.focus(); }
    }
  });
  var tx = null, ty = null;
  lb.addEventListener('touchstart', function(e){ tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', function(e){
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = ty = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
