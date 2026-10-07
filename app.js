/**
 * AETHER ATELIER // AUTOMOTIVE BESPOKE CLIENT ENGINE
 * 30fps Sequential Frame Engine, Canvas High-DPI Renderer,
 * Apple-style Framer Motion Physics & Dynamic Pricing Calculator
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CONFIGURATION & STATE
  // =========================================================================
  const TOTAL_FRAMES = 240;
  const FRAME_PATH_PREFIX = 'images/herosection/ezgif-frame-';
  const FRAME_EXT = '.png';

  // Frame Cache
  const frames = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let isReadyForScrub = false;
  let targetFrame = 0;
  let currentFrame = 0;
  let lastDrawnFrame = -1;

  // DOM Elements
  const heroSection = document.getElementById('hero');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hudCounter = document.getElementById('hud-frame-counter');
  const hudSequence = document.getElementById('hud-sequence-name');
  const scrubFill = document.getElementById('scrub-fill');
  const globalProgress = document.getElementById('global-progress-bar');
  const preloaderHud = document.getElementById('preloader-hud');
  const preloaderFill = document.getElementById('preloader-bar-fill');
  const preloaderCount = document.getElementById('preloader-count');
  const preloaderPct = document.getElementById('preloader-pct');

  const chapter1 = document.getElementById('chapter-1');
  const chapter2 = document.getElementById('chapter-2');
  const chapter3 = document.getElementById('chapter-3');

  // =========================================================================
  // 2. FRAME PRELOADING ENGINE (MULTI-TIER PROGRESSIVE LOADING)
  // =========================================================================
  function getFrameUrl(index) {
    const padded = String(index + 1).padStart(3, '0');
    return `${FRAME_PATH_PREFIX}${padded}${FRAME_EXT}`;
  }

  function preloadSingleFrame(index, callback) {
    if (frames[index]) {
      if (callback) callback(frames[index]);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getFrameUrl(index);
    img.onload = () => {
      frames[index] = img;
      loadedCount++;
      updatePreloaderProgress();
      if (callback) callback(img);
    };
    img.onerror = () => {
      // Graceful fallback
      console.warn(`Failed loading frame ${index}`);
    };
  }

  function updatePreloaderProgress() {
    const pct = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (preloaderFill) preloaderFill.style.width = `${pct}%`;
    if (preloaderCount) preloaderCount.textContent = `${loadedCount} / ${TOTAL_FRAMES} FRAMES`;
    if (preloaderPct) preloaderPct.textContent = `${pct}%`;

    // Unlock interactive scrubbing early when first 15 frames or critical milestone frames are loaded
    if (!isReadyForScrub && (loadedCount >= 16 || frames[0])) {
      isReadyForScrub = true;
      drawFrame(0);
      if (preloaderHud && loadedCount >= 40) {
        preloaderHud.classList.add('fade-out');
      }
    }
    if (loadedCount >= TOTAL_FRAMES && preloaderHud) {
      preloaderHud.classList.add('fade-out');
    }
  }

  function initFrameLoadingPipeline() {
    // Stage 1: Load frame 0 immediately
    preloadSingleFrame(0, (img) => {
      drawFrame(0);
    });

    // Stage 2: Stride load key milestones (every 4th frame: 0, 4, 8... 236)
    const strideIndices = [];
    for (let i = 0; i < TOTAL_FRAMES; i += 4) {
      if (i !== 0) strideIndices.push(i);
    }

    strideIndices.forEach((idx, delayIdx) => {
      setTimeout(() => {
        preloadSingleFrame(idx);
      }, delayIdx * 15);
    });

    // Stage 3: Fill in all remaining intermediate frames in background
    setTimeout(() => {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (!frames[i]) {
          preloadSingleFrame(i);
        }
      }
    }, 400);
  }

  // Find nearest loaded frame if current target is pending
  function getBestAvailableFrame(index) {
    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
    if (frames[clamped]) return frames[clamped];

    // Search outwards for closest available frame
    for (let offset = 1; offset < 25; offset++) {
      if (clamped - offset >= 0 && frames[clamped - offset]) {
        return frames[clamped - offset];
      }
      if (clamped + offset < TOTAL_FRAMES && frames[clamped + offset]) {
        return frames[clamped + offset];
      }
    }
    return frames[0] || null;
  }

  // =========================================================================
  // 3. CANVAS HIGH-DPI SCALER & FRAME RENDERING
  // =========================================================================
  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (lastDrawnFrame >= 0) {
      drawFrame(lastDrawnFrame, true);
    }
  }

  function drawFrame(frameIdx, force = false) {
    const intIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameIdx)));
    if (intIdx === lastDrawnFrame && !force) return;

    const img = getBestAvailableFrame(intIdx);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Cover / contain fit calculation
    const imgRatio = iw / ih;
    const canvasRatio = cw / ch;

    let dw, dh, dx, dy;

    if (canvasRatio > imgRatio) {
      dw = cw;
      dh = cw / imgRatio;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * imgRatio;
      dx = (cw - dw) / 2;
      dy = 0;
    }

    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);

    lastDrawnFrame = intIdx;

    // Update Telemetry HUD
    if (hudCounter) {
      const padded = String(intIdx + 1).padStart(3, '0');
      hudCounter.textContent = `FRAME ${padded} / ${TOTAL_FRAMES}`;
    }

    if (hudSequence) {
      if (intIdx < 75) {
        hudSequence.textContent = 'V10_CORE_SCAN';
      } else if (intIdx < 150) {
        hudSequence.textContent = 'MONOCOQUE_CELL_FIT';
      } else {
        hudSequence.textContent = 'FULL_EXPLODED_SCHEMATIC';
      }
    }
  }

  // =========================================================================
  // 4. SCROLL ENGINE & NARRATIVE CHAPTER TRANSITIONS
  // =========================================================================
  const ANIMATION_COMPLETION_THRESHOLD = 0.80; // Animation reaches 100% completion at 80% of hero scroll

  function updateScrollProgress() {
    if (!heroSection) return;

    const heroRect = heroSection.getBoundingClientRect();
    const heroHeight = heroSection.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollDistance = heroHeight - viewportHeight;

    let progress = -heroRect.top / scrollDistance;
    progress = Math.max(0, Math.min(1, progress));

    // Animation progress reaches 1.0 (Frame 239) by the completion threshold (80% scroll),
    // ensuring the complete exploded schematic is fully displayed BEFORE the page transitions to the next section!
    const animProgress = Math.min(1, progress / ANIMATION_COMPLETION_THRESHOLD);
    targetFrame = animProgress * (TOTAL_FRAMES - 1);

    // If moving into next section or past hero, force lock to completed final frame
    if (progress >= 0.95 || heroRect.bottom <= viewportHeight + 10) {
      targetFrame = TOTAL_FRAMES - 1;
      currentFrame = TOTAL_FRAMES - 1;
      drawFrame(TOTAL_FRAMES - 1);
    }

    // Update scrub bar in hero (reflects animation completion)
    if (scrubFill) {
      scrubFill.style.width = `${(animProgress * 100).toFixed(1)}%`;
    }

    // Global page progress bar
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const globalProg = Math.max(0, Math.min(1, window.scrollY / docHeight));
    if (globalProgress) {
      globalProgress.style.width = `${(globalProg * 100).toFixed(1)}%`;
    }

    // Apple-style narrative layer transitions
    // Chapter 1: 0% to 28%
    // Chapter 2: 28% to 56%
    // Chapter 3: 56% to 90% (showcases completed exploded chassis)
    // 90% - 100%: Text fades gently as next section rises
    if (chapter1 && chapter2 && chapter3) {
      if (progress < 0.28) {
        chapter1.classList.add('active');
        chapter2.classList.remove('active');
        chapter3.classList.remove('active');
      } else if (progress >= 0.28 && progress < 0.56) {
        chapter1.classList.remove('active');
        chapter2.classList.add('active');
        chapter3.classList.remove('active');
      } else if (progress >= 0.56 && progress < 0.90) {
        chapter1.classList.remove('active');
        chapter2.classList.remove('active');
        chapter3.classList.add('active');
      } else {
        // Fade out as the next section smoothly takes over
        chapter1.classList.remove('active');
        chapter2.classList.remove('active');
        chapter3.classList.remove('active');
      }
    }

    // Header background tint on scroll
    const header = document.getElementById('header');
    if (header) {
      if (window.scrollY > 80) {
        header.style.background = 'rgba(5, 6, 8, 0.95)';
        header.style.borderBottomColor = 'rgba(255, 255, 255, 0.12)';
      } else {
        header.style.background = 'rgba(5, 6, 8, 0.8)';
        header.style.borderBottomColor = 'rgba(255, 255, 255, 0.07)';
      }
    }

    // Manifesto scroll word lighting
    updateManifestoScroll();
  }

  // Animation Loop with adaptive Lerp interpolation
  function animationTick() {
    const delta = targetFrame - currentFrame;
    if (Math.abs(delta) > 0.01) {
      // Faster, crisp response near the end of the hero sequence so it never lags behind
      let lerpSpeed = 0.22;
      const currentTargetProgress = targetFrame / (TOTAL_FRAMES - 1);
      if (currentTargetProgress > 0.70) {
        lerpSpeed = 0.38;
      }
      if (currentTargetProgress >= 0.90) {
        lerpSpeed = 0.65;
        if (Math.abs(delta) < 4) {
          currentFrame = targetFrame;
        }
      }

      currentFrame += delta * lerpSpeed;
      drawFrame(currentFrame);
    }

    requestAnimationFrame(animationTick);
  }

  // =========================================================================
  // 5. MANIFESTO WORD-BY-WORD SCROLL ILLUMINATION (APPLE STYLE)
  // =========================================================================
  function updateManifestoScroll() {
    const quote = document.getElementById('manifesto-quote');
    if (!quote) return;

    const words = quote.querySelectorAll('span');
    const rect = quote.getBoundingClientRect();
    const windowH = window.innerHeight;

    // Trigger illumination between 80% and 25% of viewport
    const startPoint = windowH * 0.85;
    const endPoint = windowH * 0.25;

    let progress = (startPoint - rect.top) / (startPoint - endPoint);
    progress = Math.max(0, Math.min(1, progress));

    const totalWords = words.length;
    const litCount = Math.floor(progress * totalWords);

    words.forEach((word, idx) => {
      if (idx <= litCount) {
        word.classList.add('lit');
      } else {
        word.classList.remove('lit');
      }
    });
  }

  // =========================================================================
  // 6. NUMERIC COUNTERS TICKER ANIMATION
  // =========================================================================
  function initMetricObservers() {
    const cards = document.querySelectorAll('.card-metric');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseFloat(el.getAttribute('data-target'));
            const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
            animateNumber(el, target, decimals);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );

    cards.forEach((card) => observer.observe(card));
  }

  function animateNumber(element, target, decimals) {
    const duration = 1800;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Apple ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = ease * target;

      element.textContent = current.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  // =========================================================================
  // 7. INTERACTIVE BLUEPRINT ANATOMY EXPLORER
  // =========================================================================
  const ANATOMY_PARTS = {
    powertrain: {
      code: 'SPEC CODE // APX-V10-CRG',
      title: '5.7L V10 Bespoke Atmospheric Powertrain',
      desc: 'Stripped down to the bare dry-sump magnesium block. Fitted with forged Carrillo titanium connecting rods, custom Mahle motorsport pistons, quad billet carbon intake plenums, and dual-throttle per cylinder induction. Hand-balanced to within 0.1 grams tolerance.',
      image: 'images/herosection/ezgif-frame-001.png',
      specs: [
        { key: 'Displacement', val: '5,733 cc (Atmospheric V10)' },
        { key: 'Valvetrain', val: '40 Titanium Valves // DLC Coated Followers' },
        { key: 'Specific Power', val: '118.6 BHP / Litre Naturally Aspirated' },
        { key: 'Redline Frequency', val: '9,400 RPM Peak Cutoff' },
        { key: 'Exhaust Metallurgy', val: 'Equal-Length Inconel 625 (0.65mm wall)' },
      ],
    },
    suspension: {
      code: 'SPEC CODE // APX-SUS-PUSHROD',
      title: 'Pushrod Inboard Double Wishbones & Öhlins TTX',
      desc: 'Motorsport horizontal pushrod architecture with bell-cranks machined from aerospace 7075-T6 billet aluminum. Paired with bespoke 4-way independently adjustable Öhlins TTX dampers and titanium coil springs with hydraulic front axle lift.',
      image: 'images/herosection/ezgif-frame-050.png',
      specs: [
        { key: 'Kinematic Layout', val: 'Horizontal Pushrod Actuation' },
        { key: 'Damper Spec', val: 'Öhlins TTX 4-Way Remote Reservoir' },
        { key: 'Wishbone Alloy', val: 'Forged Titanium Ti-6Al-4V' },
        { key: 'Anti-Roll Bars', val: 'Carbon-Composite Blade Adjustable' },
        { key: 'Front Axle Lift', val: '40mm Electro-Hydraulic Ride Height' },
      ],
    },
    chassis: {
      code: 'SPEC CODE // APX-CELL-T1000',
      title: 'Toray T1000 Carbon Monocoque Tub',
      desc: 'The passenger cell and engine subframe are reinforced with unidirectional Toray T1000 pre-preg carbon fiber tape, vacuum-consolidated and cured at 7 bars in high-pressure autoclaves. Torsional rigidity reaches an astonishing 42,000 Nm/degree.',
      image: 'images/herosection/ezgif-frame-150.png',
      specs: [
        { key: 'Composite Standard', val: 'Toray T1000 High-Modulus Carbon' },
        { key: 'Torsional Stiffness', val: '42,000 Nm / Degree (+42% over OEM)' },
        { key: 'Dry Tub Mass', val: '86 kg Total Monocoque Weight' },
        { key: 'Safety Standard', val: 'FIA Appendix J Crash Compliance' },
        { key: 'Fastener Hardware', val: 'Grade 5 Aerospace Titanium Flush Bolts' },
      ],
    },
    exhaust: {
      code: 'SPEC CODE // APX-INC-625',
      title: '3D-Printed Inconel 625 Acoustic Header System',
      desc: 'Additive-manufactured using selective laser melting (SLM) in Formula 1-grade Inconel 625 superalloy. Featuring ultra-thin 0.65mm wall thicknesses, equal-length 5-into-1 merge collectors, and ceramic thermal barrier coating.',
      image: 'images/herosection/ezgif-frame-070.png',
      specs: [
        { key: 'Superalloy Grade', val: 'Inconel 625 Nickel-Chromium' },
        { key: 'Wall Gauge', val: '0.65 mm Ultra-Lightweight (Saves 18 kg)' },
        { key: 'Manifold Design', val: 'Equal-Length 5-into-1 Merge Collectors' },
        { key: 'Thermal Barrier', val: 'Plasma-Sprayed Zirconia Ceramic' },
        { key: 'Acoustic Signature', val: 'High-Pitch F1 Harmonic Symphony' },
      ],
    },
    braking: {
      code: 'SPEC CODE // APX-BRK-CCM410',
      title: 'Carbon-Ceramic Matrix & Monoblock Calipers',
      desc: 'Silicon carbide carbon-ceramic composite brake discs measuring 410mm at the front and 390mm at the rear, gripped by monoblock 6-piston forged aluminum-lithium calipers with titanium cooling pistons.',
      image: 'images/herosection/ezgif-frame-240.png',
      specs: [
        { key: 'Front Rotor Spec', val: '410 x 36 mm Carbon-Ceramic Matrix' },
        { key: 'Rear Rotor Spec', val: '390 x 34 mm Carbon-Ceramic Matrix' },
        { key: 'Caliper Alloy', val: 'Al-Li Forged Monoblock 6-Piston' },
        { key: 'Braking G-Force', val: '1.45 G Peak Deceleration' },
        { key: 'Thermal Limit', val: 'Operating Range to 1,000° C' },
      ],
    },
    cockpit: {
      code: 'SPEC CODE // APX-CKP-BESPOKE',
      title: 'Bespoke Artisan Cockpit & Gated Shifter',
      desc: 'An obsessive sanctuary for the driving purist. Bridge of Weir Scottish semi-aniline leather, exposed carbon fiber monocoque floorboards, an exposed open-gate titanium manual shifter with mechanical linkage, and luminescent analogue instrumentation.',
      image: 'images/details/cockpit_interior.jpg',
      specs: [
        { key: 'Leather Tannery', val: 'Bridge of Weir Hand-Dyed Semi-Aniline' },
        { key: 'Seating Structure', val: 'Carbon Monocoque Bucket Seats (6.8 kg)' },
        { key: 'Shifter Architecture', val: 'Open Gated Titanium Manual Linkage' },
        { key: 'Instrumentation', val: 'Analogue 10K Tachometer // 3D Aluminum Dials' },
        { key: 'Sound Isolation', val: 'Lightweight Aerogel Acoustic Liners' },
      ],
    },
  };

  function initAnatomyExplorer() {
    const tabs = document.querySelectorAll('.anatomy-tab');
    const titleEl = document.getElementById('anatomy-title');
    const codeEl = document.getElementById('anatomy-code');
    const descEl = document.getElementById('anatomy-desc');
    const specsEl = document.getElementById('anatomy-specs');
    const imgEl = document.getElementById('anatomy-image');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const partKey = tab.getAttribute('data-part');
        const data = ANATOMY_PARTS[partKey];
        if (!data) return;

        // Animate transition
        const cardInfo = document.getElementById('anatomy-info');
        if (cardInfo) cardInfo.style.opacity = '0.3';
        if (imgEl) imgEl.style.transform = 'scale(0.97)';

        setTimeout(() => {
          if (titleEl) titleEl.textContent = data.title;
          if (codeEl) codeEl.textContent = data.code;
          if (descEl) descEl.textContent = data.desc;
          if (imgEl) {
            imgEl.src = data.image;
            imgEl.style.transform = 'scale(1)';
          }

          if (specsEl) {
            specsEl.innerHTML = data.specs
              .map(
                (s) => `
              <div class="data-row">
                <span class="data-key">${s.key}</span>
                <span class="data-val">${s.val}</span>
              </div>`
              )
              .join('');
          }

          if (cardInfo) cardInfo.style.opacity = '1';
        }, 200);
      });
    });
  }

  // =========================================================================
  // 8. INTERACTIVE CONFIGURATOR & DYNAMIC REAL-TIME PRICING ENGINE
  // =========================================================================
  const CONFIG_STATE = {
    platformPrice: 380000,
    platformHours: 950,
    enginePrice: 0,
    engineHours: 240,
    enginePower: 650,
    engineName: 'Stage I Blueprint',
    aeroPrice: 0,
    aeroHours: 180,
    aeroName: 'Pure GT Carbon',
    cockpitPrice: 0,
    cockpitHours: 120,
    cockpitName: 'Carbon Purist',
  };

  function calculateConfigurator() {
    const total =
      CONFIG_STATE.platformPrice +
      CONFIG_STATE.enginePrice +
      CONFIG_STATE.aeroPrice +
      CONFIG_STATE.cockpitPrice;

    const totalHours =
      CONFIG_STATE.platformHours +
      CONFIG_STATE.engineHours +
      CONFIG_STATE.aeroHours +
      CONFIG_STATE.cockpitHours;

    // Estimate timeline: ~120-150 hours per month
    const months = Math.ceil(totalHours / 140);

    // Update DOM
    const priceDisplay = document.getElementById('calc-total-price');
    if (priceDisplay) {
      animatePrice(priceDisplay, total);
    }

    const hoursDisplay = document.getElementById('calc-hours');
    if (hoursDisplay) hoursDisplay.textContent = `${totalHours} HRS`;

    const powerDisplay = document.getElementById('calc-power');
    if (powerDisplay) powerDisplay.textContent = `${CONFIG_STATE.enginePower} BHP`;

    const timelineDisplay = document.getElementById('calc-timeline');
    if (timelineDisplay) timelineDisplay.textContent = `${months} MONTHS`;

    // Itemized rows
    const itemChassis = document.getElementById('item-chassis-val');
    if (itemChassis) itemChassis.textContent = `$${CONFIG_STATE.platformPrice.toLocaleString()}`;

    const itemEngineVal = document.getElementById('item-engine-val');
    const itemEngineLbl = document.getElementById('item-engine-lbl');
    if (itemEngineVal)
      itemEngineVal.textContent =
        CONFIG_STATE.enginePrice === 0 ? '$0 (Base)' : `+$${CONFIG_STATE.enginePrice.toLocaleString()}`;
    if (itemEngineLbl) itemEngineLbl.textContent = `Powertrain: ${CONFIG_STATE.engineName}`;

    const itemAeroVal = document.getElementById('item-aero-val');
    const itemAeroLbl = document.getElementById('item-aero-lbl');
    if (itemAeroVal)
      itemAeroVal.textContent =
        CONFIG_STATE.aeroPrice === 0 ? '$0 (Base)' : `+$${CONFIG_STATE.aeroPrice.toLocaleString()}`;
    if (itemAeroLbl) itemAeroLbl.textContent = `Aerodynamics: ${CONFIG_STATE.aeroName}`;

    const itemCockpitVal = document.getElementById('item-cockpit-val');
    const itemCockpitLbl = document.getElementById('item-cockpit-lbl');
    if (itemCockpitVal)
      itemCockpitVal.textContent =
        CONFIG_STATE.cockpitPrice === 0 ? '$0 (Base)' : `+$${CONFIG_STATE.cockpitPrice.toLocaleString()}`;
    if (itemCockpitLbl) itemCockpitLbl.textContent = `Cockpit: ${CONFIG_STATE.cockpitName}`;
  }

  let priceAnimId = null;
  function animatePrice(element, target) {
    const current = parseInt(element.textContent.replace(/,/g, ''), 10) || 380000;
    const duration = 600;
    const startTime = performance.now();

    if (priceAnimId) cancelAnimationFrame(priceAnimId);

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(current + (target - current) * ease);

      element.textContent = val.toLocaleString();

      if (progress < 1) {
        priceAnimId = requestAnimationFrame(step);
      }
    }
    priceAnimId = requestAnimationFrame(step);
  }

  function initConfigurator() {
    const radioInputs = document.querySelectorAll('.config-option input[type="radio"]');

    radioInputs.forEach((input) => {
      input.addEventListener('change', () => {
        // Update active class on labels in this group
        const groupList = input.closest('.config-options-list');
        if (groupList) {
          groupList.querySelectorAll('.config-option').forEach((opt) => opt.classList.remove('active'));
          input.closest('.config-option').classList.add('active');
        }

        const category = groupList ? groupList.getAttribute('data-category') : null;
        const price = parseInt(input.getAttribute('data-price') || '0', 10);
        const hours = parseInt(input.getAttribute('data-hours') || '0', 10);

        if (category === 'platform') {
          CONFIG_STATE.platformPrice = price;
          CONFIG_STATE.platformHours = hours;
        } else if (category === 'engine') {
          CONFIG_STATE.enginePrice = price;
          CONFIG_STATE.engineHours = hours;
          if (input.value === 'stage1_blueprint') {
            CONFIG_STATE.enginePower = 650;
            CONFIG_STATE.engineName = 'Stage I Blueprint';
          } else if (input.value === 'stage2_speciale') {
            CONFIG_STATE.enginePower = 710;
            CONFIG_STATE.engineName = 'Stage II 9.4K High-Cam';
          } else {
            CONFIG_STATE.enginePower = 860;
            CONFIG_STATE.engineName = 'Stage III Twin-Chamber';
          }
        } else if (category === 'aero') {
          CONFIG_STATE.aeroPrice = price;
          CONFIG_STATE.aeroHours = hours;
          if (input.value === 'pure_touring') {
            CONFIG_STATE.aeroName = 'Pure GT Carbon';
          } else if (input.value === 'clubsport_downforce') {
            CONFIG_STATE.aeroName = 'Clubsport Downforce';
          } else {
            CONFIG_STATE.aeroName = 'GTE Active DRS Aerofoil';
          }
        } else if (category === 'cockpit') {
          CONFIG_STATE.cockpitPrice = price;
          CONFIG_STATE.cockpitHours = hours;
          if (input.value === 'carbon_purist') {
            CONFIG_STATE.cockpitName = 'Carbon Purist';
          } else if (input.value === 'bespoke_leather') {
            CONFIG_STATE.cockpitName = 'Semi-Aniline Cognac Leather';
          } else {
            CONFIG_STATE.cockpitName = '1-of-1 Tartan & Titanium';
          }
        }

        calculateConfigurator();
      });
    });

    calculateConfigurator();
  }

  // =========================================================================
  // 9. ACOUSTIC FREQUENCY LAB // LIVE RPM OSCILLOSCOPE & SYNTHESIS
  // =========================================================================
  let audioCtx = null;
  let synthOsc = null;
  let synthGain = null;
  let isSynthPlaying = false;

  function initAcousticLab() {
    const slider = document.getElementById('rpm-slider');
    const rpmDisplay = document.getElementById('rpm-display');
    const freqDisplay = document.getElementById('wt-freq');
    const dbDisplay = document.getElementById('wt-db');
    const exhaustStatus = document.getElementById('wt-exhaust-status');
    const waveCanvas = document.getElementById('acoustic-canvas');
    const soundToggle = document.getElementById('btn-sound-toggle');
    const soundBtnText = document.getElementById('sound-btn-text');

    if (!waveCanvas) return;
    const wCtx = waveCanvas.getContext('2d');

    let currentRPM = 850;
    let wavePhase = 0;

    function renderWaveform() {
      const w = waveCanvas.width;
      const h = waveCanvas.height;

      wCtx.fillStyle = '#06070a';
      wCtx.fillRect(0, 0, w, h);

      // Grid lines
      wCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      wCtx.lineWidth = 1;
      for (let y = 0; y < h; y += 30) {
        wCtx.beginPath();
        wCtx.moveTo(0, y);
        wCtx.lineTo(w, y);
        wCtx.stroke();
      }
      for (let x = 0; x < w; x += 50) {
        wCtx.beginPath();
        wCtx.moveTo(x, 0);
        wCtx.lineTo(x, h);
        wCtx.stroke();
      }

      // Draw acoustic wave
      wCtx.beginPath();
      wCtx.strokeStyle = currentRPM > 8000 ? '#ef4444' : currentRPM > 5000 ? '#fbbf24' : '#38bdf8';
      wCtx.lineWidth = 2.5;
      wCtx.shadowBlur = 14;
      wCtx.shadowColor = wCtx.strokeStyle;

      const freqNorm = currentRPM / 9400;
      const waveFreq = 0.015 + freqNorm * 0.06;
      const amplitude = 30 + freqNorm * 65;

      for (let x = 0; x < w; x++) {
        // Fundamental V10 wave + 2nd harmonic
        const y =
          h / 2 +
          Math.sin(x * waveFreq + wavePhase) * amplitude +
          Math.sin(x * waveFreq * 2.5 + wavePhase * 1.5) * (amplitude * 0.35);
        if (x === 0) {
          wCtx.moveTo(x, y);
        } else {
          wCtx.lineTo(x, y);
        }
      }
      wCtx.stroke();
      wCtx.shadowBlur = 0;

      wavePhase += 0.05 + freqNorm * 0.25;
      requestAnimationFrame(renderWaveform);
    }

    renderWaveform();

    // Slider listener
    if (slider) {
      slider.addEventListener('input', (e) => {
        currentRPM = parseInt(e.target.value, 10);
        if (rpmDisplay) rpmDisplay.textContent = currentRPM.toLocaleString();

        // Calculate V10 10-cylinder 4-stroke firing frequency: (RPM / 60) * 5
        const hz = Math.round((currentRPM / 60) * 5);
        if (freqDisplay) freqDisplay.textContent = `${hz} Hz`;

        // Calculate dBA sound pressure level
        const dba = Math.round(74 + ((currentRPM - 850) / (9400 - 850)) * 52);
        if (dbDisplay) dbDisplay.textContent = `${dba} dBA`;

        if (exhaustStatus) {
          if (currentRPM < 2500) exhaustStatus.textContent = 'VALVES CLOSED // LOW-PULSE IDLE';
          else if (currentRPM < 6000) exhaustStatus.textContent = 'VALVES ACTIVE // SCRAMBLE FLOW';
          else exhaustStatus.textContent = 'VALVES WIDE-OPEN // INCONEL SCREAM';
        }

        // Update synthesized pitch if playing
        if (synthOsc && isSynthPlaying) {
          synthOsc.frequency.setTargetAtTime(hz, audioCtx.currentTime, 0.05);
        }
      });
    }

    // Sound toggle
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        if (!isSynthPlaying) {
          startSynthesizer(currentRPM);
          isSynthPlaying = true;
          if (soundBtnText) soundBtnText.textContent = 'MUTE V10 SYNTHESIZER';
          soundToggle.style.background = 'var(--accent-amber)';
          soundToggle.style.color = '#000';
        } else {
          stopSynthesizer();
          isSynthPlaying = false;
          if (soundBtnText) soundBtnText.textContent = 'START SYNTHESIZED ENGINE AUDIO';
          soundToggle.style.background = 'rgba(245, 158, 11, 0.15)';
          soundToggle.style.color = 'var(--text-primary)';
        }
      });
    }

    function startSynthesizer(rpm) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const hz = (rpm / 60) * 5;

        synthOsc = audioCtx.createOscillator();
        synthOsc.type = 'sawtooth';
        synthOsc.frequency.setValueAtTime(hz, audioCtx.currentTime);

        synthGain = audioCtx.createGain();
        synthGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

        // Lowpass filter for warm throatiness
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, audioCtx.currentTime);

        synthOsc.connect(filter);
        filter.connect(synthGain);
        synthGain.connect(audioCtx.destination);

        synthOsc.start();
      } catch (err) {
        console.warn('AudioContext not allowed or supported', err);
      }
    }

    function stopSynthesizer() {
      if (synthGain && audioCtx) {
        synthGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        setTimeout(() => {
          if (synthOsc) {
            synthOsc.stop();
            synthOsc.disconnect();
            synthOsc = null;
          }
        }, 150);
      }
    }
  }

  // =========================================================================
  // 10. FLOATING AMBIENT AUDIO PILL
  // =========================================================================
  function initAmbientAudioPill() {
    const pill = document.getElementById('ambient-audio-control');
    if (!pill) return;

    let isPillActive = false;
    let ambientOsc = null;
    let ambientGain = null;
    let ambientCtx = null;

    pill.addEventListener('click', () => {
      isPillActive = !isPillActive;
      pill.classList.toggle('active', isPillActive);

      const label = pill.querySelector('.audio-label');
      if (isPillActive) {
        if (label) label.textContent = 'ACOUSTIC RUN: ACTIVE';
        playAmbientHum();
      } else {
        if (label) label.textContent = 'ACOUSTIC RUN: OFF';
        stopAmbientHum();
      }
    });

    function playAmbientHum() {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!ambientCtx) ambientCtx = new AudioContextClass();
        if (ambientCtx.state === 'suspended') ambientCtx.resume();

        ambientOsc = ambientCtx.createOscillator();
        ambientOsc.type = 'triangle';
        ambientOsc.frequency.setValueAtTime(55, ambientCtx.currentTime); // Deep V10 idle rumble

        ambientGain = ambientCtx.createGain();
        ambientGain.gain.setValueAtTime(0.04, ambientCtx.currentTime);

        ambientOsc.connect(ambientGain);
        ambientGain.connect(ambientCtx.destination);
        ambientOsc.start();
      } catch (e) {
        console.warn(e);
      }
    }

    function stopAmbientHum() {
      if (ambientGain && ambientCtx) {
        ambientGain.gain.setTargetAtTime(0, ambientCtx.currentTime, 0.1);
        setTimeout(() => {
          if (ambientOsc) {
            ambientOsc.stop();
            ambientOsc.disconnect();
            ambientOsc = null;
          }
        }, 120);
      }
    }
  }

  // =========================================================================
  // 11. COMMISSION INQUIRY FORM SUBMISSION
  // =========================================================================
  window.handleFormSubmit = function () {
    const banner = document.getElementById('form-success');
    const btn = document.getElementById('btn-submit-inquiry');

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.querySelector('span').textContent = 'ENCRYPTING & TRANSMITTING...';
    }

    setTimeout(() => {
      if (banner) {
        banner.style.display = 'flex';
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (btn) {
        btn.querySelector('span').textContent = 'DOSSIER TRANSMITTED ✓';
        btn.style.background = '#10b981';
      }
    }, 900);
  };

  // =========================================================================
  // 12. INITIALIZATION
  // =========================================================================
  function init() {
    initFrameLoadingPipeline();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    initMetricObservers();
    initAnatomyExplorer();
    initConfigurator();
    initAcousticLab();
    initAmbientAudioPill();

    // Anchor link handling to ensure completion if jumping past hero
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId && targetId !== '#hero') {
          targetFrame = TOTAL_FRAMES - 1;
          currentFrame = TOTAL_FRAMES - 1;
          drawFrame(TOTAL_FRAMES - 1, true);
        }
      });
    });

    // Trigger initial scroll calculation
    updateScrollProgress();

    // Start render animation tick
    requestAnimationFrame(animationTick);
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
