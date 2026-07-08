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

  };

  // Expose globally
  global.ScratchProfile = Profile;
  global.SCRATCH_COUNTRY_CONFIG = COUNTRY_CONFIG;

})(window);
