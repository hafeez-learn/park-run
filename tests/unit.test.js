/**
 * Unit tests for pure JS helpers — distance, formatting, lap detection.
 * Run: node tests/unit.test.js
 */

// ─── Inline helpers (mirrors index.html logic) ─────────────────────────────

function getDistanceM(coord1, coord2) {
  const R = 6371000;
  const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1[1] * Math.PI / 180) *
      Math.cos(coord2[1] * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatPace(paceSecondsPerKm) {
  if (!paceSecondsPerKm || !isFinite(paceSecondsPerKm)) return '--';
  const m = Math.floor(paceSecondsPerKm / 60);
  const s = Math.round(paceSecondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function computeTurnIndices(coords) {
  const TURNS_THRESHOLD_DEG = 25;
  const turns = [];
  for (let i = 1; i < coords.length - 1; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const next = coords[i + 1];
    const a1 = Math.atan2(curr[1] - prev[1], curr[0] - prev[0]);
    const a2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
    let diff = Math.abs(a2 - a1) * (180 / Math.PI);
    if (diff > 180) diff = 360 - diff;
    if (diff > TURNS_THRESHOLD_DEG) turns.push(i);
  }
  return turns;
}

// Simulates checkAutoLap logic from index.html
function simulateAutoLap(coords, parkCenter, parkRadiusM) {
  const laps = [];
  let currentLap = { outside: true, distance: 0, coords: [] };

  for (const pt of coords) {
    const dist = getDistanceM([pt[0], pt[1]], parkCenter); // [lon, lat]
    const wasOutside = currentLap.outside;
    currentLap.outside = dist > parkRadiusM;
    currentLap.coords.push(pt);

    if (wasOutside && !currentLap.outside && currentLap.coords.length > 10) {
      if (currentLap.distance > 200) {
        laps.push({ distance: currentLap.distance, coords: [...currentLap.coords] });
      }
      currentLap = { outside: false, distance: 0, coords: [] };
    }
    // accumulate distance
    if (currentLap.coords.length > 1) {
      const prev = currentLap.coords[currentLap.coords.length - 2];
      currentLap.distance += getDistanceM([prev[0], prev[1]], [pt[0], pt[1]]);
    }
  }
  return laps;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function assertClose(actual, expected, tolerance, msg) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg} — got ${actual.toFixed(4)}, expected ${expected} ±${tolerance}`);
    failed++;
  }
}

// ─── getDistanceM ──────────────────────────────────────────────────────────
console.log('\ngetDistanceM:');
// Known test: equator附近 two points 1 degree apart
assertClose(
  getDistanceM([0, 0], [0, 1]),
  111195, 500,
  '1 degree latitude ≈ 111km'
);
assertClose(
  getDistanceM([103.8, 1.3], [103.9, 1.3]),
  11132, 200,
  '0.1 degree longitude at lat 1.3 ≈ 11km'
);
// Same point → zero
assertClose(
  getDistanceM([103.89848, 1.37707], [103.89848, 1.37707]),
  0, 0.01,
  'same point = 0'
);
// Punggol Park center to edge (420m)
const _PARK_R_M = 420;
// Punggol Park center to edge (420m)
// 420m in degrees: 420 / 111320 ≈ 0.003775 degrees longitude
const edge = [103.89848 + 420 / 111320, 1.37707];
assertClose(
  getDistanceM([103.89848, 1.37707], edge),
  _PARK_R_M, 5,
  'park edge 420m east = 420m'
);

// ─── formatTime ───────────────────────────────────────────────────────────
console.log('\nformatTime:');
assert(formatTime(0) === '0:00', '0 sec → 0:00');
assert(formatTime(59) === '0:59', '59 sec → 0:59');
assert(formatTime(60) === '1:00', '60 sec → 1:00');
assert(formatTime(90) === '1:30', '90 sec → 1:30');
assert(formatTime(3600) === '1:00:00', '3600 sec → 1:00:00');
assert(formatTime(3661) === '1:01:01', '3661 sec → 1:01:01');
assert(formatTime(7200) === '2:00:00', '2 hours → 2:00:00');

// ─── formatPace ────────────────────────────────────────────────────────────
console.log('\nformatPace:');
assert(formatPace(0) === '--', '0 → --');
assert(formatPace(Infinity) === '--', 'Infinity → --');
assert(formatPace(NaN) === '--', 'NaN → --');
assert(formatPace(300) === '5:00', '300s/km = 5:00');
assert(formatPace(360) === '6:00', '360s/km = 6:00');
assert(formatPace(367) === '6:07', '367s/km = 6:07');
assert(formatPace(420) === '7:00', '420s/km = 7:00');
assert(formatPace(150) === '2:30', '150s/km = 2:30');

// ─── computeTurnIndices ─────────────────────────────────────────────────────
console.log('\ncomputeTurnIndices:');
// Straight line — no turns
const straight = [[0, 0], [0, 1], [0, 2], [0, 3]];
assert(computeTurnIndices(straight).length === 0, 'straight line → no turns');

// 90-degree right turn
const rightTurn = [
  [0, 0], [0, 1],           // north
  [1, 1], [2, 1], [3, 1],   // east (90° right)
];
const turns = computeTurnIndices(rightTurn);
// angle from [0,0]→[0,1] (north) to [0,1]→[1,1] (east) = 90°
assert(turns.length >= 1, `90° right turn → detected (${turns.length} turns found)`);
assert(turns[0] === 1, `turn at index 1, got ${turns[0]}`);

// 90-degree left turn
const leftTurn = [
  [0, 0], [0, 1],
  [-1, 1], [-2, 1], [-3, 1], // west (90° left)
];
const lturns = computeTurnIndices(leftTurn);
assert(lturns.length >= 1, `90° left turn → detected`);

// ─── Auto-lap simulation ───────────────────────────────────────────────────
console.log('\nsimulateAutoLap:');
const PARK_CENTER = [103.89848, 1.37707];
const PARK_RADIUS_M = 420;
const RADIUS_M = PARK_RADIUS_M;

// Route: start outside park, walk in, complete loop, walk out
// Simulate a path: outside → inside (entry = lap 1 start)
// To keep test deterministic: simulate crossing boundary twice

// Build a circular path just inside the park
const insidePath = [];
for (let i = 0; i <= 12; i++) {
  const angle = (i / 12) * 2 * Math.PI;
  insidePath.push([
    PARK_CENTER[0] + (RADIUS_M * 0.5 / 111320) * Math.cos(angle),  // lon
    PARK_CENTER[1] + (RADIUS_M * 0.5 / 111320) * Math.sin(angle),  // lat
  ]);
}

const result = simulateAutoLap(insidePath, PARK_CENTER, PARK_RADIUS_M);
// All points inside — no lap boundary crossing
assert(result.length === 0, 'all inside → no lap');

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
else { console.log('All tests passed ✓'); process.exit(0); }