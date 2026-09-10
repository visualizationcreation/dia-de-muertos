/* A separate optional soundscape preserves the original narration and timing. */
(() => {
  'use strict';
  const voice = document.getElementById('audio');
  const panel = document.createElement('div');
  panel.className = 'soundscape-controls';
  panel.innerHTML = `<label class="soundscape-toggle"><input id="soundscape-enabled" type="checkbox"><span data-music-label="enable"></span></label><label class="soundscape-volume"><span data-music-label="volume"></span><input id="soundscape-volume" type="range" min="0" max="100" step="1"><output id="soundscape-level"></output></label><p class="soundscape-note"><span data-music-label="note"></span> <a href="music-credits.md" data-music-label="credits"></a></p><p id="soundscape-status" role="status"></p>`;
  voice.insertAdjacentElement('afterend', panel);
  const bed = document.createElement('audio');
  bed.id = 'soundscape'; bed.loop = true; bed.preload = 'none'; bed.hidden = true;
  bed.src = 'soundscape.mp3?v=music-1'; bed.volume = 0;
  panel.append(bed);
  const enabled = panel.querySelector('#soundscape-enabled');
  const volume = panel.querySelector('#soundscape-volume');
  const level = panel.querySelector('#soundscape-level');
  const status = panel.querySelector('#soundscape-status');
  const copy = {
    en: {enable:'Music & Mexican street ambience',volume:'Background volume',note:'Soft instrumental music with distant sounds recorded in Mexico.',credits:'Sound credits',error:'Background sound could not start. You can keep listening to the narration; switch music off and on to retry.'},
    es: {enable:'Música y ambiente de las calles de México',volume:'Volumen de fondo',note:'Música instrumental suave con sonidos lejanos grabados en México.',credits:'Créditos del sonido',error:'No se pudo iniciar el sonido de fondo. Puedes seguir escuchando la narración; desactiva y activa la música para volver a intentarlo.'}
  };
  let settings = {enabled:true, volume:18};
  try {
    const saved = JSON.parse(localStorage.getItem('orb-dia-soundscape') || 'null');
    if (saved && typeof saved.enabled === 'boolean' && Number.isFinite(saved.volume)) settings = {enabled:saved.enabled,volume:Math.max(0,Math.min(100,saved.volume))};
  } catch (_) { /* Offline/private contexts can deny storage. */ }
  enabled.checked = settings.enabled; volume.value = settings.volume;
  let frame = 0, generation = 0, failed = false, waiting = false;
  const language = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const wanted = () => enabled.checked && Number(volume.value)>0 && !voice.paused && !voice.ended && !voice.muted && voice.volume>0 && !waiting;
  function labels() {
    const strings = copy[language()];
    panel.querySelectorAll('[data-music-label]').forEach(el => el.textContent = strings[el.dataset.musicLabel]);
    volume.setAttribute('aria-label', strings.volume);
    level.textContent = `${volume.value}%`;
    status.textContent = failed ? strings.error : '';
  }
  function fade(target, duration, pauseWhenDone = false) {
    cancelAnimationFrame(frame);
    // Browsers suspend animation frames in hidden tabs. Apply the endpoint
    // immediately there so background music never outlives paused narration.
    if (document.hidden) { bed.volume=target; if(pauseWhenDone && !wanted()) bed.pause(); return; }
    const start = performance.now(), initial = bed.volume;
    function tick(now) {
      const progress = Math.min(1, (now-start)/duration);
      bed.volume = Math.max(0,Math.min(1, initial+(target-initial)*progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else if (pauseWhenDone && !wanted()) bed.pause();
    }
    frame = requestAnimationFrame(tick);
  }
  async function sync() {
    const request = ++generation;
    if (!wanted()) { fade(0,220,true); return; }
    try {
      await bed.play();
      if (request !== generation || !wanted()) { if (!wanted()) fade(0,220,true); return; }
      failed = false; labels();
      fade(Number(volume.value)/100*voice.volume,900);
    } catch (_) { if(request===generation && wanted()) { failed = true; labels(); } }
  }
  function save() {
    try { localStorage.setItem('orb-dia-soundscape',JSON.stringify({enabled:enabled.checked,volume:Number(volume.value)})); } catch (_) {}
    failed = false; labels(); sync();
  }
  enabled.addEventListener('change',save); volume.addEventListener('input',save);
  voice.addEventListener('play',()=>{waiting=false;sync();});
  voice.addEventListener('playing',()=>{waiting=false;sync();});
  voice.addEventListener('waiting',()=>{waiting=true;sync();});
  for (const event of ['pause','ended','emptied','error','volumechange']) voice.addEventListener(event,sync);
  bed.addEventListener('error',()=>{if(wanted()){failed=true;labels();}});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);generation++;bed.pause();bed.volume=0;});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pageshow',()=>{if(!voice.paused) sync();});
  new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  labels();
})();
