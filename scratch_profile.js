/**
 * scratch_profile.js — The Scratch Project personalisation engine
 * Stored in localStorage under key 'scratch_profile'
 * Read by any guide that wants to surface personalised data
 */

(function(global) {
  'use strict';

  const STORAGE_KEY = 'scratch_profile';

  // ── Month names for date calculation ────────────────────────────────────────
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun',
                       'Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_FULL  = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  // ── HCP milestone trajectory (base: 10 HCP → scratch over 24 months) ───────
  const BASE_MILESTONES = {
    1: 10.0, 2: 9.0, 3: 8.5, 4: 8.0, 6: 7.0,
    9: 5.0, 12: 4.0, 18: 2.0, 24: 0.0
  };

  // ── Country → regional config ────────────────────────────────────────────────
  const COUNTRY_CONFIG = {
    uk: {
      label: 'United Kingdom',
      hcpBody: 'England/Scotland/Wales/Ireland Golf — Golf Genius / USEBALLS',
      season: 'northern',
      winterMonths: [11, 12, 1, 2],  // 0-indexed months where course may be difficult
      currency: '£',
      competitive: 'uk',
      flag: '🇬🇧'
    },
    ireland: {
      label: 'Ireland',
      hcpBody: 'Golf Ireland — GUI system',
      season: 'northern',
      winterMonths: [11, 12, 1, 2],
      currency: '€',
      competitive: 'uk',
      flag: '🇮🇪'
    },
    us: {
      label: 'United States',
      hcpBody: 'USGA — GHIN system (ghin.com)',
      season: 'northern',
      winterMonths: [],  // varies massively by region
      currency: '$',
      competitive: 'us',
      flag: '🇺🇸'
    },
    eu: {
      label: 'Europe (non-UK)',
      hcpBody: 'EGA — national federation (e.g. FFG, DGV, RFEG)',
      season: 'northern',
      winterMonths: [11, 12, 1, 2],
      currency: '€',
      competitive: 'eu',
      flag: '🇪🇺'
    },
    australia: {
      label: 'Australia',
      hcpBody: 'Golf Australia — GA Handicap system',
      season: 'southern',
      winterMonths: [5, 6, 7],  // Jun/Jul/Aug = southern winter
      currency: 'A$',
      competitive: 'au',
      flag: '🇦🇺'
    },
    nz: {
      label: 'New Zealand',
      hcpBody: 'New Zealand Golf — NZG system',
      season: 'southern',
      winterMonths: [5, 6, 7],
      currency: 'NZ$',
      competitive: 'au',
      flag: '🇳🇿'
    },
    canada: {
      label: 'Canada',
      hcpBody: 'Golf Canada — GolfCanada.ca',
      season: 'northern',
      winterMonths: [11, 12, 1, 2, 3],
      currency: 'CA$',
      competitive: 'us',
      flag: '🇨🇦'
    },
    other: {
      label: 'Other / Not specified',
      hcpBody: 'Your national golf federation (WHS-affiliated)',
      season: 'northern',
      winterMonths: [],
      currency: '',
      competitive: 'eu',
      flag: '🌍'
    }
  };

  // ── Phase definitions (time-based, not HCP-based) ────────────────────────────
  const PHASES = [
    { id: 1, months: [1,2],     name: 'Stop the Bleeding',       guide: '27_six_month_plan.html' },
    { id: 2, months: [3,4],     name: 'Build the Foundation',    guide: '27_six_month_plan.html' },
    { id: 3, months: [5,6],     name: 'Build the Attack',        guide: '27_six_month_plan.html' },
    { id: 3, months: [7,8,9,10,11,12], name: 'Build the Attack (main)', guide: '28_months_7_12_plan.html' },
    { id: 4, months: [13,14,15,16,17,18], name: 'Elite Execution', guide: '29_months_13_18_plan.html' },
    { id: 5, months: [19,20,21,22,23,24], name: 'Defend the Standard', guide: '30_months_19_24_plan.html' },
  ];

  // ── Core API ─────────────────────────────────────────────────────────────────

  // ── Distance reference (shared by every benchmark-table guide) ───────────────
  // Driver swing-speed anchors (mph) and the human/skill label for each band.
  const SPEED_ANCHORS = [70, 80, 90, 100, 110];
  const SPEED_BAND_LABEL = {
    70:  'Rec. women · senior men',
    80:  'Mid-hcp women · higher-hcp men',
    90:  'Low-hcp women · avg club men',
    100: 'Elite-am women / LPGA · low-hcp men',
    110: 'Long hitters · scratch/tour men'
  };
  const GENDER_DEFAULT_SPEED = { f: 80, m: 93 };
  // Typical carry (yds) per club at each SPEED_ANCHORS point — illustrative reference,
  // overwritten by the player's own launch-monitor numbers where available.
  const CARRY_REF = {
    'Driver (total)': [150, 175, 210, 245, 280],
    '3-wood':         [130, 150, 180, 210, 240],
    'Hybrid / 5-wood':[115, 135, 160, 185, 210],
    '5-iron':         [100, 120, 145, 165, 185],
    '6-iron':         [ 92, 110, 135, 152, 172],
    '7-iron':         [ 85, 100, 125, 140, 160],
    '8-iron':         [ 75,  90, 115, 130, 148],
    '9-iron':         [ 67,  80, 103, 117, 135],
    'PW':             [ 58,  70,  92, 105, 122],
    'GW':             [ 50,  60,  78,  90, 105],
    'SW':             [ 42,  50,  66,  78,  92]
  };

  const Profile = {

    /** Read profile from localStorage. Returns null if not set. */
    get() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    },

    /** Save profile to localStorage. */
    save(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch(e) { return false; }
    },

    /** Clear profile. */
    clear() {
      localStorage.removeItem(STORAGE_KEY);
    },

    /** Returns true if a valid profile exists. */
    isSet() {
      const p = this.get();
      return p && typeof p.startHcp === 'number' && p.startDate && p.country;
    },

    // ── Date helpers ────────────────────────────────────────────────────────────

    /** Convert Month-N (1-indexed) to a real calendar month label. */
    monthToDate(monthN, profile) {
      if (!profile || !profile.startDate) return `Month ${monthN}`;
      const [year, mon, day] = profile.startDate.split('-').map(Number);
      const d = new Date(year, mon - 1 + (monthN - 1), 1);
      return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    },

    /** Convert Month-N to a full date label like "June 2026". */
    monthToDateFull(monthN, profile) {
      if (!profile || !profile.startDate) return `Month ${monthN}`;
      const [year, mon] = profile.startDate.split('-').map(Number);
      const d = new Date(year, mon - 1 + (monthN - 1), 1);
      return `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
    },

    /** Convert month range to date range string. */
    monthRangeToDate(startMonth, endMonth, profile) {
      const s = this.monthToDate(startMonth, profile);
      const e = this.monthToDate(endMonth, profile);
      if (s === e) return s;
      // If same year, compress: "Jun–Aug 2026"
      const sparts = s.split(' ');
      const eparts = e.split(' ');
      if (sparts[1] === eparts[1]) return `${sparts[0]}–${eparts[0]} ${eparts[1]}`;
      return `${s}–${e}`;
    },

    /** Get what month of the programme the user is currently in. */
    currentMonth(profile) {
      if (!profile || !profile.startDate) return null;
      const start = new Date(profile.startDate);
      const now = new Date();
      const diffMs = now - start;
      const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      return Math.max(1, Math.min(24, diffMonths + 1));
    },

    // ── HCP milestone helpers ───────────────────────────────────────────────────

    /** Calculate scaled HCP milestones for a given start/goal. */
    calcMilestones(startHcp, goalHcp) {
      goalHcp = goalHcp === undefined ? 0 : goalHcp;
      const gap = startHcp - goalHcp;
      const baseGap = 10.0;
      const scale = gap / baseGap;
      const result = {};
      for (const [month, baseHcp] of Object.entries(BASE_MILESTONES)) {
        const improvement = 10.0 - baseHcp;
        result[month] = Math.round((startHcp - improvement * scale) * 10) / 10;
      }
      return result;
    },

    /** Get the HCP target for a specific month. */
    hcpAtMonth(monthN, profile) {
      if (!profile) return null;
      const milestones = this.calcMilestones(profile.startHcp, profile.goalHcp || 0);
      // Find the two surrounding milestone months and interpolate
      const months = Object.keys(milestones).map(Number).sort((a,b)=>a-b);
      for (let i = 0; i < months.length - 1; i++) {
        const m1 = months[i], m2 = months[i+1];
        if (monthN >= m1 && monthN <= m2) {
          const t = (monthN - m1) / (m2 - m1);
          const hcp = milestones[m1] + t * (milestones[m2] - milestones[m1]);
          return Math.round(hcp * 10) / 10;
        }
      }
      return milestones[months[months.length - 1]];
    },

    /** Get which phase a given month falls in. */
    phaseForMonth(monthN) {
      for (const phase of PHASES) {
        if (phase.months.includes(monthN)) return phase;
      }
      return null;
    },

    // ── Country helpers ─────────────────────────────────────────────────────────

    /** Get country config for profile's country code. */
    countryConfig(profile) {
      if (!profile || !profile.country) return COUNTRY_CONFIG.other;
      return COUNTRY_CONFIG[profile.country] || COUNTRY_CONFIG.other;
    },

    /** Get season label adjusted for hemisphere. */
    seasonLabel(calendarMonth0, profile) {
      // calendarMonth0: 0=Jan, 11=Dec
      const cc = this.countryConfig(profile);
      const northern = ['Winter','Winter','Spring','Spring','Spring',
                        'Summer','Summer','Summer','Autumn','Autumn','Autumn','Winter'];
      const southern = ['Summer','Summer','Autumn','Autumn','Autumn',
                        'Winter','Winter','Winter','Spring','Spring','Spring','Summer'];
      return cc.season === 'southern' ? southern[calendarMonth0] : northern[calendarMonth0];
    },

    // ── UI render helpers ───────────────────────────────────────────────────────

    /** 
     * Inject a personalised banner into any guide.
     * Call after DOM ready. targetSelector = where to prepend the banner.
     */
    injectBanner(targetSelector) {
      const profile = this.get();
      if (!profile) return;

      const cc = this.countryConfig(profile);
      const curMonth = this.currentMonth(profile);
      const curHcp = curMonth ? this.hcpAtMonth(curMonth, profile) : null;
      const phase = curMonth ? this.phaseForMonth(curMonth) : null;
      const startLabel = this.monthToDate(1, profile);

      const banner = document.createElement('div');
      banner.className = 'sp-profile-banner';
      banner.style.cssText = [
        'background:rgba(0,0,0,0.25)',
        'border:1px solid rgba(255,255,255,0.1)',
        'border-radius:8px',
        'padding:14px 18px',
        'margin:0 0 20px',
        'display:flex',
        'flex-wrap:wrap',
        'gap:16px',
        'align-items:center',
        'font-size:12px',
        'font-family:inherit',
      ].join(';');

      const items = [
        { label: 'Started', value: startLabel },
        { label: 'Starting HCP', value: profile.startHcp.toFixed(1) },
        { label: 'Goal', value: profile.goalHcp !== undefined ? `HCP ${profile.goalHcp}` : 'Scratch' },
        { label: 'Country', value: `${cc.flag} ${cc.label}` },
      ];
      if (curMonth) {
        items.push({ label: 'You are in', value: `Month ${curMonth}` });
        if (curHcp !== null) items.push({ label: 'HCP target now', value: `~${curHcp}` });
        if (phase) items.push({ label: 'Phase', value: phase.name });
      }

      banner.innerHTML = items.map(i =>
        `<span><span style="opacity:0.5;margin-right:4px;">${i.label}:</span><strong>${i.value}</strong></span>`
      ).join('');

      const target = document.querySelector(targetSelector);
      if (target) target.prepend(banner);
    },

    /**
     * Replace all Month-N text nodes in the document with real date equivalents.
     * Only replaces standalone "Month N" or "Months N–M" patterns, not mid-word.
     */
    injectDates(profile) {
      if (!profile || !profile.startDate) return;
      const self = this;

      function walkText(node) {
        if (node.nodeType === 3) {
          // Text node
          let text = node.textContent;
          // Replace "Month N" or "Month N–M" or "Months N–M"
          const replaced = text
            .replace(/\bMonths?\s+(\d+)–(\d+)\b/g, (m, a, b) => {
              const sa = self.monthToDate(parseInt(a), profile);
              const ea = self.monthToDate(parseInt(b), profile);
              const sparts = sa.split(' '), eparts = ea.split(' ');
              if (sparts[1] === eparts[1]) return `${sparts[0]}–${eparts[0]} ${eparts[1]}`;
              return `${sa}–${ea}`;
            })
            .replace(/\bMonth\s+(\d+)\b/g, (m, n) => self.monthToDate(parseInt(n), profile));
          if (replaced !== text) node.textContent = replaced;
        } else if (node.nodeType === 1 &&
                   !['SCRIPT','STYLE','CODE','PRE'].includes(node.tagName)) {
          Array.from(node.childNodes).forEach(walkText);
        }
      }
      walkText(document.body);
    },

    /**
     * Personalise the HCP milestone table in guide 10.
     * Looks for elements with data-milestone="N" attribute.
     */
    injectMilestones(profile) {
      if (!profile) return;
      const milestones = this.calcMilestones(profile.startHcp, profile.goalHcp || 0);
      document.querySelectorAll('[data-milestone]').forEach(el => {
        const month = parseInt(el.dataset.milestone);
        if (milestones[month] !== undefined) {
          el.textContent = `HCP ~${milestones[month].toFixed(1)}`;
        }
      });
    },

    // ── Distance-profile helpers (gender + driver speed) ─────────────────────────
    /** Effective driver speed: explicit profile value, else gender default, else 80. */
    driverSpeed(profile) {
      if (profile && typeof profile.driverSpeed === 'number') return profile.driverSpeed;
      if (profile && profile.gender && GENDER_DEFAULT_SPEED[profile.gender] !== undefined)
        return GENDER_DEFAULT_SPEED[profile.gender];
      return 80;
    },

    /** Index of the nearest speed band for a driver speed. */
    speedBandIndex(speed) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < SPEED_ANCHORS.length; i++) {
        const d = Math.abs(SPEED_ANCHORS[i] - speed);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    },

    /** Nearest-band human label for a driver speed. */
    speedBandLabel(speed) {
      return SPEED_BAND_LABEL[SPEED_ANCHORS[this.speedBandIndex(speed)]];
    },

    /** Interpolate one club's carry (its CARRY_REF row) at an exact speed. */
    carryFor(vals, speed) {
      if (speed <= SPEED_ANCHORS[0]) return vals[0];
      if (speed >= SPEED_ANCHORS[SPEED_ANCHORS.length - 1]) return vals[vals.length - 1];
      for (let i = 0; i < SPEED_ANCHORS.length - 1; i++) {
        if (speed >= SPEED_ANCHORS[i] && speed <= SPEED_ANCHORS[i + 1]) {
          const t = (speed - SPEED_ANCHORS[i]) / (SPEED_ANCHORS[i + 1] - SPEED_ANCHORS[i]);
          return Math.round(vals[i] + t * (vals[i + 1] - vals[i]));
        }
      }
      return vals[vals.length - 1];
    },

    /** Estimated carry for every club at an exact speed -> { club: yds }. */
    estimatedCarries(speed) {
      const out = {};
      for (const k in CARRY_REF) out[k] = this.carryFor(CARRY_REF[k], speed);
      return out;
    },

    /** Merge gender / driverSpeed into the stored profile (creates one if none). */
    setDistanceProfile(gender, driverSpeed) {
      const p = this.get() || {};
      if (gender) p.gender = gender;
      if (typeof driverSpeed === 'number') p.driverSpeed = driverSpeed;
      this.save(p);
      return p;
    },

  };

  // Expose globally
  global.ScratchProfile = Profile;
  global.SCRATCH_COUNTRY_CONFIG = COUNTRY_CONFIG;
  global.SCRATCH_SPEED_ANCHORS = SPEED_ANCHORS;
  global.SCRATCH_SPEED_BAND_LABEL = SPEED_BAND_LABEL;
  global.SCRATCH_CARRY_REF = CARRY_REF;

  // ── Reusable carry-table widget ──────────────────────────────────────────────
  // Auto-mounts into every <div data-scratch-carry data-clubs="A,B,C" data-zone="X">.
  // Guides only supply the placeholder + a wrapping card; all CSS/JS lives here.
  function scInjectCSS(){
    if (typeof document === 'undefined' || document.getElementById('sc-carry-css')) return;
    var st = document.createElement('style'); st.id = 'sc-carry-css';
    st.textContent = `
    .sc-carry .sc-panel{display:flex;flex-wrap:wrap;gap:18px;align-items:center;background:#182818;border:1px solid rgba(160,200,80,.16);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
    .sc-carry .sc-lab{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:#e0b840;margin-bottom:6px;display:block;}
    .sc-carry .sc-seg{display:inline-flex;border:1px solid rgba(160,200,80,.36);border-radius:20px;overflow:hidden;}
    .sc-carry .sc-seg button{background:none;border:none;color:rgba(232,240,216,.55);font-family:'JetBrains Mono',monospace;font-size:12px;padding:7px 16px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
    .sc-carry .sc-seg button.on{background:rgba(224,184,64,.12);color:#e0b840;font-weight:700;}
    .sc-carry .sc-spd{flex:1;min-width:200px;}
    .sc-carry .sc-spdval{font-family:'JetBrains Mono',monospace;font-size:1.3rem;font-weight:700;color:#e0b840;}
    .sc-carry .sc-spdval small{font-size:.75rem;color:rgba(232,240,216,.55);font-weight:400;}
    .sc-carry input[type=range]{width:100%;accent-color:#e0b840;height:4px;margin-top:6px;}
    .sc-carry .sc-you{font-size:12.5px;color:#e8f0d8;line-height:1.7;margin-bottom:12px;padding:10px 12px;background:rgba(224,184,64,.1);border-radius:6px;border:1px solid rgba(160,200,80,.16);}
    .sc-carry .sc-you strong{color:#e0b840;}
    .sc-carry table.sc-tbl td.hl,.sc-carry table.sc-tbl th.hl{background:rgba(224,184,64,.16);color:#e8f0d8;}
    .sc-carry table.sc-tbl th.hl{color:#e0b840;}
    .sc-carry table.sc-tbl td.yc,.sc-carry table.sc-tbl th.yc{color:#a0c850;font-weight:700;border-left:2px solid rgba(160,200,80,.36);}
    .sc-carry .sc-sub{display:block;font-size:8px;color:rgba(232,240,216,.5);font-weight:400;margin-top:2px;line-height:1.3;text-transform:none;letter-spacing:0;}
    .sc-carry .sc-note{font-size:11px;color:rgba(232,240,216,.5);margin-top:8px;line-height:1.6;}
    .sc-carry .sc-note b{color:#a0c850;font-weight:700;}`;
    document.head.appendChild(st);
  }
  function scMountOne(el){
    var clubsAttr = el.getAttribute('data-clubs');
    var clubs = (clubsAttr ? clubsAttr.split(',').map(function(x){return x.trim();}) : Object.keys(CARRY_REF))
                .filter(function(c){return CARRY_REF[c];});
    if(!clubs.length) return;
    var zone = el.getAttribute('data-zone') || '';
    el.innerHTML = '<div class="sc-carry">'
      + '<div class="sc-panel"><div><span class="sc-lab">Gender</span>'
      + '<div class="sc-seg sc-gen"><button type="button" data-g="f">♀ Female</button><button type="button" data-g="m">♂ Male</button></div></div>'
      + '<div class="sc-spd"><span class="sc-lab">Driver Swing Speed</span>'
      + '<div class="sc-spdval"><span class="sc-out">80</span> <small>mph</small></div>'
      + '<input type="range" class="sc-range" min="60" max="115" step="1" value="80"></div></div>'
      + '<div class="sc-you"></div>'
      + '<div style="overflow-x:auto;"><table class="tbl sc-tbl"></table></div>'
      + '<p class="sc-note">Carry in yards, illustrative reference — replace <b>Your carry</b> with your own launch-monitor numbers. Tour-level strike adds distance beyond speed alone.</p>'
      + '</div>';
    var prof = Profile.get() || {};
    var gender = prof.gender || 'f';
    var speed = Profile.driverSpeed(prof);
    var touched = (typeof prof.driverSpeed === 'number');
    var tbl = el.querySelector('.sc-tbl'), you = el.querySelector('.sc-you');
    var out = el.querySelector('.sc-out'), range = el.querySelector('.sc-range');
    var gbtns = el.querySelectorAll('.sc-gen button');
    range.value = speed; out.textContent = speed;
    function markG(){ for(var i=0;i<gbtns.length;i++){ gbtns[i].classList.toggle('on', gbtns[i].getAttribute('data-g')===gender); } }
    function render(){
      var hi = Profile.speedBandIndex(speed), h = '<tr><th>Club</th>', i;
      for(i=0;i<SPEED_ANCHORS.length;i++){ h += '<th class="'+(i===hi?'hl':'')+'">'+SPEED_ANCHORS[i]+' mph<span class="sc-sub">'+SPEED_BAND_LABEL[SPEED_ANCHORS[i]]+'</span></th>'; }
      h += '<th class="yc">Your carry</th></tr>';
      var lo = Infinity, hg = -Infinity;
      clubs.forEach(function(c){
        h += '<tr><td>'+c+'</td>';
        for(i=0;i<SPEED_ANCHORS.length;i++){ h += '<td class="'+(i===hi?'hl':'')+'">'+CARRY_REF[c][i]+'</td>'; }
        var yc = Profile.carryFor(CARRY_REF[c], speed);
        if(yc<lo)lo=yc; if(yc>hg)hg=yc;
        h += '<td class="yc">'+yc+'</td></tr>';
      });
      tbl.innerHTML = h;
      var msg = 'Your profile: <strong>'+(gender==='f'?'♀ Female':'♂ Male')+' · '+speed+' mph</strong> ('+Profile.speedBandLabel(speed)+').';
      if(zone){ msg += ' At your speed, this guide’s '+zone+' zone is really your <strong>'+lo+'–'+hg+' yard</strong> range — same clubs, same method, only the numbers move.'; }
      you.innerHTML = msg;
    }
    range.addEventListener('input', function(e){ speed=+e.target.value; touched=true; out.textContent=speed; Profile.setDistanceProfile(null, speed); render(); });
    for(var j=0;j<gbtns.length;j++){ gbtns[j].addEventListener('click', function(e){
      gender = e.currentTarget.getAttribute('data-g'); markG(); Profile.setDistanceProfile(gender, undefined);
      if(!touched){ speed = Profile.driverSpeed({gender:gender}); range.value=speed; out.textContent=speed; }
      render();
    }); }
    markG(); render();
  }
  Profile.mountCarryWidgets = function(){
    if (typeof document === 'undefined') return;
    var els = document.querySelectorAll('[data-scratch-carry]');
    if(!els.length) return;
    scInjectCSS();
    for(var i=0;i<els.length;i++){ scMountOne(els[i]); }
  };

  // ── Female performance baselines (sourced — see female_sg_baselines.md) ───────
  const LPGA_TIER = {
    caption: 'LPGA Tour 2024 by ranking tier (LPGA.com via Shot Scope). “Scratch am.” = mixed amateur reference. Highlighted column ≈ female-scratch benchmark.',
    cols: ['Metric','LPGA #1','#10','#50','#100','Scratch am.'],
    highlightCol: 4,
    rows: [
      ['Scoring average','69.0','70.2','71.3','72.4','71.4'],
      ['Driving distance (yds)','291','274','261','254','260'],
      ['Driving accuracy %','85.9','79.9','74.3','68.9','49.9'],
      ['Greens in regulation %','78','75','71','68','62'],
      ['Putts per GIR','1.71','1.76','1.81','1.84','1.82'],
      ['Sand save %','63','57','47','40','44'],
      ['Birdies per round','4.1','3.8','3.7','3.1','2.7'],
      ['% rounds under par','80','65','50','37','27']
    ]
  };
  const FEMALE_AMATEUR = {
    caption: 'Female amateurs by handicap — Shot Scope women-specific data, 2025 (outliers removed). Fairway % exceeds the male equivalent at every level.',
    cols: ['Handicap','Driver (yds)','3-wood (yds)','Fairways %'],
    rows: [
      ['Scratch+','252','232','60'],
      ['1–5','235','224','54'],
      ['6–10','226','212','55'],
      ['11–15','199','183','56'],
      ['16–20','188','173','58'],
      ['21–25','178','166','59'],
      ['26+','166','155','56']
    ]
  };
  const LPGA_VS_AVG = {
    caption: 'Shot Scope 2024. “Avg male” = 15 hcp, “avg female” = 25 hcp. † derived from stated multiples (approximate).',
    cols: ['Metric','LPGA','Avg male (15)','Avg female (25)'],
    rows: [
      ['Driving distance (yds)','~290','202','141'],
      ['GIR per round','~14','~4 †','~2 †'],
      ['Up-and-down %','~67','~33 †','~24 †'],
      ['Three-putt (holes per 3-putt)','~53','~10','~7']
    ]
  };
  const LPGA_SG = {
    caption: 'LPGA Tour 2025 strokes gained per round vs the LPGA field (field average = 0), by category. Source: LPGA.com / KPMG Performance Insights, retrieved 2026-07-08. Top-10 / Top-25 are tier averages of that year\'s field.',
    cols: ['SG Category','LPGA #1','Top-10 avg','Top-25 avg'],
    highlightCol: 2,
    rows: [
      ['SG: Total','+3.04','+1.96','+1.57'],
      ['SG: Off-the-Tee','+0.56','+0.48','+0.34'],
      ['SG: Approach','+0.91','+0.53','+0.54'],
      ['SG: Around-the-Green','+0.26','+0.13','+0.14'],
      ['SG: Putting','+1.09','+0.66','+0.40']
    ]
  };
  const BENCHMARK_SETS = { 'lpga-tier': LPGA_TIER, 'female-amateur': FEMALE_AMATEUR, 'lpga-vs-avg': LPGA_VS_AVG, 'lpga-sg': LPGA_SG };

  function scInjectBenchCSS(){
    if (typeof document === 'undefined' || document.getElementById('sc-bench-css')) return;
    var st = document.createElement('style'); st.id = 'sc-bench-css';
    st.textContent = `
    .sc-bench table.sc-btbl td.hlc,.sc-bench table.sc-btbl th.hlc{background:rgba(224,168,64,.14);color:#e8f0d8;}
    .sc-bench table.sc-btbl th.hlc{color:#e0b840;}
    .sc-bench .sc-bcap{font-size:10.5px;color:rgba(232,240,216,.5);line-height:1.55;margin-top:8px;font-style:italic;}`;
    document.head.appendChild(st);
  }
  function scMountBench(el){
    var d = BENCHMARK_SETS[el.getAttribute('data-scratch-benchmark')];
    if(!d) return;
    var hc = (typeof d.highlightCol === 'number') ? d.highlightCol : -1;
    var h = '<div class="sc-bench"><div style="overflow-x:auto;"><table class="tbl sc-btbl"><tr>';
    d.cols.forEach(function(c,i){ h += '<th class="'+(i===hc?'hlc':'')+'">'+c+'</th>'; });
    h += '</tr>';
    d.rows.forEach(function(r){ h += '<tr>'; r.forEach(function(v,i){ h += '<td class="'+(i===hc?'hlc':'')+'">'+v+'</td>'; }); h += '</tr>'; });
    h += '</table></div><p class="sc-bcap">'+d.caption+'</p></div>';
    el.innerHTML = h;
  }
  Profile.mountBenchmarkTables = function(){
    if (typeof document === 'undefined') return;
    var els = document.querySelectorAll('[data-scratch-benchmark]');
    if(!els.length) return;
    scInjectBenchCSS();
    for(var i=0;i<els.length;i++){ scMountBench(els[i]); }
  };

  function scMountAll(){ Profile.mountCarryWidgets(); Profile.mountBenchmarkTables(); }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scMountAll);
    else scMountAll();
  }
})(window);
