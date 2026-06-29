// Service Worker — The Scratch Project
// Version: 4.0 · 2026-06-26
// Cache: Standard (65+) + Pro (13 exclusive) + Elite (17+ exclusive) + EP-series (11) + Tools + Index pages = 113 items

const CACHE_NAME = 'scratch-project-v5-2';

const STATIC_FILES = [
  '/',
  // ── Core guides 01–49 ──────────────────────────────────────────────────
  '/01_putting_pro.html',
  '/02_shortgame_pro.html',
  '/03_longgame_pro.html',
  '/04_complete_golfer.html',
  '/05_pre_shot_routine.html',
  '/06_golf_fitness.html',
  '/07_golf_nutrition.html',
  '/08_pro_round_prep.html',
  '/09_golf_coach_ai.html',
  '/10_scratch_plan.html',
  '/11_shot_dispersion.html',
  '/12_rules_of_golf.html',
  '/13_injury_prevention.html',
  '/14_video_analysis.html',
  '/15_equipment_fitting.html',
  '/16_solo_pressure_round.html',
  '/17_progress_journal.html',
  '/18_training_aids_2.html',
  '/20_course_management.html',
  '/21_mental_game.html',
  '/22_wedge_distances.html',
  '/23_weather_conditions.html',
  '/24_competitive_strategy.html',
  '/25_speed_training.html',
  '/26_stats_interpretation.html',
  '/27_six_month_plan.html',
  '/28_months_7_12_plan.html',
  '/29_months_13_18_plan.html',
  '/30_months_19_24_plan.html',
  '/31_on_course_notes.html',
  '/32_putting_green_reading.html',
  '/33_competitive_pathway.html',
  '/34_coaching_relationship.html',
  '/35_links_travel_golf.html',
  '/36_playing_partners.html',
  '/37_approach_zone.html',
  '/38_practice_structure.html',
  '/39_ground_reaction_force.html',
  '/40_decision_architecture.html',
  '/41_plus_hcp_sg_targets.html',
  '/42_national_amateur_circuit.html',
  '/43_caddie_preparation.html',
  '/44_golfmetrics_deepdive.html',
  '/45_sportsbox_ai.html',
  '/46_county_team_golf.html',
  '/47_elite_performance_psychology.html',
  '/48_elite_physical_performance.html',
  '/49_advanced_game_construction.html',
  // ── Phase 2 Standard expansion guides (50–60) ─────────────────────────
  '/50_links_golf_strategy.html',
  '/51_gap_zone_mastery.html',
  '/52_matchplay_formats.html',
  '/53_aimpoint_express.html',
  '/54_ai_swing_analysis.html',
  '/55_launch_monitor_fitting.html',
  '/56_us_competitive_pathway.html',
  '/57_european_competitive_pathway.html',
  '/58_bunker_play.html',
  '/59_practice_green_protocol.html',
  '/60_100_ball_session.html',
  // ── Drop Batch 1–3 Standard guides (61–65) ────────────────────────────
  '/61_short_game_lies.html',
  '/62_grip_tension.html',
  '/63_tracking_choice.html',
  '/64_range_setup.html',
  '/65_slope_elevation.html',
  // ── Pro-exclusive guides (41p–50p) ────────────────────────────────────
  '/41p_hackmotion_protocols.html',
  '/42p_periodisation.html',
  '/43p_mevo_integration.html',
  '/44p_kinematic_chain.html',
  '/45p_pressure_practice.html',
  '/46p_club_gapping.html',
  '/47p_winter_training_pro.html',
  '/48p_approach_deepdive.html',
  '/49p_putting_metrics.html',
  '/50p_tournament_week.html',
  // ── Elite-exclusive guides (51e–58e) ──────────────────────────────────
  '/51e_matchplay_strategy.html',
  '/52e_sleep_hrv_recovery.html',
  '/53e_ball_fitting.html',
  '/54e_swing_robustness.html',
  '/55e_mature_competitor.html',
  '/56e_birdie_construction.html',
  '/57e_coaching_data_brief.html',
  '/58e_amateur_to_tour.html',
  // ── EP series (ep1–ep11) ──────────────────────────────────────────────
  '/ep1_season_decision_architecture.html',
  '/ep2_multiseason_sg_analytics.html',
  '/ep3_identity_mental_game.html',
  '/ep4_proximity_approach_mastery.html',
  '/ep5_movement_screening_fitness.html',
  '/ep6_dynamic_replanning.html',
  '/ep7_complete_wedge_system.html',
  '/ep8_arccos_air_mastery.html',
  '/ep9_winter_training_offseason.html',
  '/ep10_world_handicap_system.html',
  '/ep11_advanced_coaching_relationship.html',
  // ── Interactive tools ─────────────────────────────────────────────────
  '/dashboard.html',
  '/practice_session_planner.html',
  '/ev_calculator.html',
  '/wind_calculator.html',
  '/hcp_trajectory.html',
  '/playing_hcp_calculator.html',
  '/sg_diagnostic.html',
  '/swing_fault_finder.html',
  '/yardage_book_builder.html',
  '/tracking_app.html',
  '/tracking_app_v2.html',
  // ── Supplementary files ───────────────────────────────────────────────
  '/caddie_card.html',
  '/golf_analysis.html',
  '/golf_weekly_dashboard.html',
  '/hackmotion_playbook.html',
  '/mevo_gen2_playbook.html',
  '/practice_plan.html',
  '/swing_mechanics.html',
  '/motivation.html',
  '/on_course_reference_A5_8pp.html',
  // ── Index and system pages ────────────────────────────────────────────
  '/index.html',
  '/index_pro.html',
  '/index_elite.html',
  '/elite_tier_brief.html',
  '/quick_start.html',
  '/blueprint.html',
];

// Install: cache all static files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Installing v5.0 — caching', STATIC_FILES.length, 'files');
      return Promise.all(
        STATIC_FILES.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Failed to cache:', url, err);
          });
        })
      );
    }).then(function() {
      console.log('[SW] Install complete — v5.0');
      return self.skipWaiting();
    })
  );
});

// Activate: delete old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(function() {
      console.log('[SW] Activated — v5.0 is current cache');
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first with network fallback
self.addEventListener('fetch', function(event) {
  // Only handle GET requests for same-origin resources
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function(response) {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback — return index for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
