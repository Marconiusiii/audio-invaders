const API_URL_TEST = "api/testHighScores.php";
const API_URL_PROD = "/api/highScores.php";

const CURRENT_API_URL = API_URL_PROD; 

/* * AUDIO ENGINE 
* Handles stereo panning and synthesized sound effects
*/
class AudioEngine {
	constructor() {
		this.ctx = null;
		this.masterGain = null;
	}

	init() {
		if (!this.ctx) {
			const AudioContext = window.AudioContext || window.webkitAudioContext;
			this.ctx = new AudioContext();
			this.masterGain = this.ctx.createGain();
			this.masterGain.gain.value = 0.5; // Master volume
			this.masterGain.connect(this.ctx.destination);
		}
		if (this.ctx.state === 'suspended') {
			this.ctx.resume();
		}
	}

	// Play a beep at a specific X position (-1 to 1) and Y urgency
	playAlienBeep(panVal, yPercent, toneOffset = 0) {
		if (!this.ctx) return;

		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		const panner = this.ctx.createStereoPanner();

		// Base pitch from vertical position (0 -> 100)
		// 200Hz near the top up to ~600Hz near the bottom
		const baseFreq = 200 + (yPercent * 4);
		const freq = baseFreq + toneOffset;

		osc.type = 'square';
		osc.frequency.setValueAtTime(freq, t);

		// Detune a little for organic variation; range grows slightly
		// with the absolute toneOffset so later-round aliens feel more distinct.
		const detuneRange = 25 + (Math.abs(toneOffset) * 0.2);
		osc.detune.setValueAtTime((Math.random() * 2 - 1) * detuneRange, t);

		// Pan Logic: -1 (Left) to 1 (Right)
		panner.pan.value = Math.max(-1, Math.min(1, panVal));

		// Envelope: Short blip
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

		osc.connect(gain);
		gain.connect(panner);
		panner.connect(this.masterGain);

		osc.start(t);
		osc.stop(t + 0.15);
	}



	playAlienExplosion() {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;

		// --------- Easy tweak variables ----------
		const overallVolume = 0.20;	// overall loudness (connects to masterGain)
		const transientBoost = 0.30;	// immediate transient peak right after start
		const duration = 0.75;		// total length in seconds
		const startFreq = 145;		// bright initial "crack"
		const midFreq = 85;			// mid sweep
		const endFreq = 65;			// low boom finish
		const detuneAmount = 8;		// small detune for grit
		// ----------------------------------------

		// Body: two oscillators for punch + crunch
		const oscA = this.ctx.createOscillator();
		const oscB = this.ctx.createOscillator();
		oscA.type = 'square';	// crunchy, chip-like
		oscB.type = 'sawtooth';	// body to fill out spectrum

		// Slight detune for character
		oscA.detune.setValueAtTime(-detuneAmount, now);
		oscB.detune.setValueAtTime(+detuneAmount, now);

		// Per-sound gain node so we can scale without touching master
		const sfxGain = this.ctx.createGain();
		// Start at desired overall volume
		sfxGain.gain.setValueAtTime(overallVolume, now);
		// Quick transient boost then decay to final
		sfxGain.gain.exponentialRampToValueAtTime(transientBoost, now + 0.02);
		sfxGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

		// Pitch envelopes (multi-stage gives more crunch/character)
		oscA.frequency.setValueAtTime(startFreq, now);
		oscB.frequency.setValueAtTime(startFreq * 0.9, now); // slightly lower second osc

		// First fast drop to mid, then slower to low
		oscA.frequency.exponentialRampToValueAtTime(midFreq, now + duration * 0.35);
		oscA.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

		oscB.frequency.exponentialRampToValueAtTime(midFreq * 0.95, now + duration * 0.4);
		oscB.frequency.exponentialRampToValueAtTime(endFreq * 1.05, now + duration);

		// Routing: oscillators -> sfxGain -> masterGain
		oscA.connect(sfxGain);
		oscB.connect(sfxGain);
		sfxGain.connect(this.masterGain);

		// Start/stop
		oscA.start(now);
		oscB.start(now);

		const stopTime = now + duration + 0.04;
		oscA.stop(stopTime);
		oscB.stop(stopTime);

		// Cleanup after finished (disconnect nodes)
		setTimeout(() => {
			try {
				oscA.disconnect();
				oscB.disconnect();
				sfxGain.disconnect();
			} catch (e) {}
		}, (duration + 0.12) * 1000);
	}


		playPowerUp() {
		if (!this.ctx) return;
		const now = this.ctx.currentTime;
		const duration = 1.0;

		// Two oscillators to make the sound richer
		const osc1 = this.ctx.createOscillator();
		const osc2 = this.ctx.createOscillator();
		osc1.type = 'sawtooth';
		osc2.type = 'sawtooth';

		// Slight detune for shimmer
		osc1.detune.setValueAtTime(-6, now);
		osc2.detune.setValueAtTime(+6, now);

		// Main quieter gain so it's not too loud
		const mainGain = this.ctx.createGain();
		mainGain.gain.setValueAtTime(0.10, now);
		mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

		// Vibrato (tremolo) via amplitude modulation
		const lfo = this.ctx.createOscillator();
		lfo.type = 'sine';
		lfo.frequency.setValueAtTime(16, now); // sharp/staccato start

		const lfoGain = this.ctx.createGain();
		lfoGain.gain.setValueAtTime(0.75, now); // strong vibrato at the start
		lfoGain.gain.exponentialRampToValueAtTime(0.05, now + duration * 0.85); // fade vibrato

		// Offset to keep modulation in positive range
		const constSource = this.ctx.createConstantSource();
		constSource.offset.setValueAtTime(0.5, now);

		// Tremolo gain node
		const tremolo = this.ctx.createGain();
		lfo.connect(lfoGain);
		lfoGain.connect(tremolo.gain);
		constSource.connect(tremolo.gain);

		// Route oscillators → tremolo
		osc1.connect(tremolo);
		osc2.connect(tremolo);

		// Rising pitch envelope
		const startFreq = 210;
		const midFreq = 480;
		const endFreq = 1100;

		osc1.frequency.setValueAtTime(startFreq, now);
		osc2.frequency.setValueAtTime(startFreq, now);

		osc1.frequency.exponentialRampToValueAtTime(midFreq, now + duration * 0.45);
		osc2.frequency.exponentialRampToValueAtTime(midFreq, now + duration * 0.45);

		osc1.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
		osc2.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

		// Final routing: tremolo → main gain → master gain
		tremolo.connect(mainGain);
		mainGain.connect(this.masterGain);

		// Start
		osc1.start(now);
		osc2.start(now);
		lfo.start(now);
		constSource.start(now);

		// Stop slightly after end
		const stopTime = now + duration + 0.05;
		osc1.stop(stopTime);
		osc2.stop(stopTime);
		lfo.stop(stopTime);
		constSource.stop(stopTime);

		// Cleanup
		setTimeout(() => {
			try {
				osc1.disconnect();
				osc2.disconnect();
				lfo.disconnect();
				lfoGain.disconnect();
				constSource.disconnect();
				tremolo.disconnect();
				mainGain.disconnect();
			} catch (e) {}
		}, (duration + 0.2) * 1000);
	}



	playShoot() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(800, t);
		osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);

		gain.gain.setValueAtTime(0.3, t);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(t);
		osc.stop(t + 0.2);
	}

	playHit() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		// Pleasant high ping
		osc.type = 'sine';
		osc.frequency.setValueAtTime(1200, t);
		osc.frequency.exponentialRampToValueAtTime(1500, t + 0.1);

		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(t);
		osc.stop(t + 0.3);
	}

	playMiss() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		// Low error buzz
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(150, t);
		osc.frequency.linearRampToValueAtTime(100, t + 0.2);

		gain.gain.setValueAtTime(0.3, t);
		gain.gain.linearRampToValueAtTime(0, t + 0.2);

		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(t);
		osc.stop(t + 0.2);
	}

	// The "Bell" for Zero Energy / Game Over
	playBell() {
		if (!this.ctx) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		// Deep bell sound with harmonics
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(220, t); // A3

		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(1, t + 0.05);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 3); // Long tail

		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(t);
		osc.stop(t + 3);
	}
}

/* * GAME LOGIC 
*/
const audio = new AudioEngine();
const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score-display');
const energyDisplay = document.getElementById('energy-display');
const roundDisplay = document.getElementById('round-display');
const ariaAnnouncer = document.getElementById('aria-announcer');
const cannonBtn = document.getElementById('cannon-btn');
const startOverlay = document.getElementById('start-overlay');
const footer = document.getElementById('footer');

let state = {
	isActive: false,
	score: 0,
	energy: 100,
	round: 1,
	aliens: [],
	lastFrameTime: 0,
	spawnTimer: 0
};

const GAME_WIDTH = 600;
const GAME_HEIGHT = 600;
const HIT_ZONE_WIDTH = 120; // Width of center area
const HIT_THRESHOLD = HIT_ZONE_WIDTH / 2;

// Calculate hit zone boundaries relative to center
const CENTER_X = GAME_WIDTH / 2;

function announce(text) {
	ariaAnnouncer.textContent = text;
}

function updateStats() {
	scoreDisplay.textContent = state.score;
	energyDisplay.textContent = state.energy;
	roundDisplay.textContent = state.round;
}

function spawnAlien() {
	const id = Date.now() + Math.random();

	// Random Start Side (Left=0 or Right=GAME_WIDTH)
	// Actually, let's have them sweep across.
	// Spawn either far left or far right
	const startLeft = Math.random() > 0.5;
	
	// Base horizontal speed (sign applied before jitter)
	const baseSpeedX = (startLeft ? 1 : -1) * (100 + (state.round * 20));
	
	// Jitter ramp: start at round 7, complete by round 12
	// ramp goes 0.0 (round 6 and below) -> 1.0 (round 12+)
	let ramp = 0;
	if (state.round >= 7) {
		ramp = Math.min((state.round - 7) / 5, 1);
	}

	// jitterFactor ranges from 1.0 -> 2.0 as ramp goes 0 -> 1
	const jitterFactor = 1 + Math.random() * ramp;
	const finalSpeedX = baseSpeedX * jitterFactor;

	
	// Tone jitter for this alien's beep pitch: subtle early, more distinct in later rounds
	const toneBaseJitter = 10;
	const toneMaxJitter = 80;
	const toneRamp = Math.min(Math.max((state.round - 4) / 8, 0), 1);
	const toneJitterRange = toneBaseJitter + (toneMaxJitter - toneBaseJitter) * toneRamp;
	const toneOffset = (Math.random() * 2 - 1) * toneJitterRange;

	
	const alien = {
		id: id,
		x: startLeft ? 0 : GAME_WIDTH,
		y: 0,
		toneOffset: toneOffset,
		// Speed increases with round, with jitter applied between rounds 7-12
		speedX: finalSpeedX, 
		speedY: 15 + (state.round * 5), // Slowly falls
		nextBeep: 0,
		el: document.createElement('div')
	};

	alien.el.className = 'alien';
	gameBoard.appendChild(alien.el);
	state.aliens.push(alien);
}

function gameOver() {
	state.isActive = false;
	audio.playBell(); // Ring bell at zero/end
	announce(`Game over, man, game over! Final Score ${state.score}.`);

	setTimeout(() => {
		const hud = document.getElementById('hud');
		const cannon = document.getElementById('cannon-btn');
		if (hud) {
			hud.setAttribute('inert', '');
		}
		if (cannon) {
			cannon.setAttribute('inert', '');
		}
		if (hsDiv) {
			hsDiv.removeAttribute('inert');
		}
		if (footer) {
			footer.removeAttribute('inert');
		}

		startOverlay.style.display = 'flex';
		startOverlay.querySelector('h1').textContent = "Game Over, man, game over!";
	}, 1200);

	startBtnFocusTimeoutId = setTimeout(() => {
		document.getElementById('start-btn').focus();
	}, 5000);


}

function gameLoop(timestamp) {
	if (!state.isActive) return;

	const dt = (timestamp - state.lastFrameTime) / 1000;
	state.lastFrameTime = timestamp;

	// Spawning Logic
	state.spawnTimer -= dt;
	if (state.spawnTimer <= 0) {
		// After round 5, spawn multiple. Before that, usually one at a time.
		const maxAliens = state.round >= 5 ? Math.min(3, Math.floor(state.round / 2)) : 1;
		
		if (state.aliens.length < maxAliens) {
			spawnAlien();
		}
		state.spawnTimer = 2.0; // Wait before checking spawn again
	}

	// Update Aliens
	state.aliens.forEach((alien, index) => {
		// Movement
		alien.x += alien.speedX * dt;
		alien.y += alien.speedY * dt;

		// Bounce off walls
		if (alien.x <= 0 || alien.x >= GAME_WIDTH) {
			alien.speedX *= -1;
			alien.x = Math.max(0, Math.min(GAME_WIDTH, alien.x));
		}

		// Visual Update
		alien.el.style.left = (alien.x / GAME_WIDTH * 100) + '%';
		alien.el.style.top = (alien.y / GAME_HEIGHT * 100) + '%';

		// Audio Logic (Beeping)
		if (timestamp > alien.nextBeep) {
			// Pan Value: -1 (Left) to 1 (Right)
			const pan = ((alien.x / GAME_WIDTH) * 2) - 1;
			const yPercent = (alien.y / GAME_HEIGHT) * 100;
			
			audio.playAlienBeep(pan, yPercent, alien.toneOffset);

			// Calculate next interval
			// Closer to bottom = faster, and later rounds / more aliens
			// also tighten the timing so chaos feels dense but readable.
			const baseInterval = 1000 - (alien.y / GAME_HEIGHT * 850);
			
			// Difficulty factor: more rounds + more simultaneous aliens
			const roundFactor = Math.max(0, state.round - 1);
			const densityFactor = Math.max(0, state.aliens.length - 1);
			const difficulty = 1 + (roundFactor * 0.15) + (densityFactor * 0.1);
			
			// Compress the interval by difficulty, but never below ~120ms
			const adjustedInterval = Math.max(120, baseInterval / difficulty);
			
			// Arrhythmic Jitter: +/- 30% randomness around the adjusted interval
			const jitter = adjustedInterval * 0.3 * (Math.random() - 0.5);
			
			alien.nextBeep = timestamp + (adjustedInterval + jitter);
		}

		// Fail Condition (Reaches Bottom)
		if (alien.y >= GAME_HEIGHT) {
			state.aliens.splice(index, 1);
			alien.el.remove();
			state.energy -= 20;
			audio.playAlienExplosion();
			announce("Kaboom! Energy lost.");
			updateStats();
			
			if (state.energy <= 0) gameOver();
		}
	});

	// Round Progression (Simple time based or score based)
	// Let's increase difficulty every 500 points
	const expectedRound = Math.floor(state.score / 500) + 1;
	if (expectedRound > state.round) {
		state.round = expectedRound;
		announce(`Round ${state.round}`);
		updateStats();
	}


	requestAnimationFrame(gameLoop);
}

let streak = 0;

function showLaserBeam(alienY) {
	const gameRect = gameBoard.getBoundingClientRect();

	// Create beam
	const beam = document.createElement('div');
	beam.className = 'laser-beam';

	// Determine height of beam visually inside the game board
	const cannonBottom = gameRect.height; // Cannon fires from bottom edge
	const targetYpx = (alienY / GAME_HEIGHT) * gameRect.height;
	const beamHeight = cannonBottom - targetYpx;

	beam.style.height = `${beamHeight}px`;

	// Append and remove after animation
	gameBoard.appendChild(beam);

	setTimeout(() => {
		beam.remove();
	}, 150);
}

function showAlienExplosion(x, y) {
	const explosion = document.createElement('div');
	explosion.className = 'alien-explode';

	// Position in px coordinates
	explosion.style.left = (x / GAME_WIDTH * 100) + '%';
	explosion.style.top = (y / GAME_HEIGHT * 100) + '%';

	gameBoard.appendChild(explosion);

	setTimeout(() => explosion.remove(), 500);
}

function fireCannon() {
	if (!state.isActive) return;
	
	audio.playShoot();

	// Hit Detection
	// We need to find if ANY alien is currently in the center zone
	// Center X is GAME_WIDTH / 2.
	// Tolerance is HIT_THRESHOLD.

	let hitIndex = -1;
	
	// Filter for aliens in the zone
	const targets = state.aliens.filter(a => Math.abs(a.x - CENTER_X) < HIT_THRESHOLD);


	if (targets.length > 0) {
		// Hit the lowest one (closest threat)
		targets.sort((a, b) => b.y - a.y);
		const target = targets[0]; // The one closest to bottom

		// Find index in main array
		hitIndex = state.aliens.indexOf(target);

		if (state.round >= 5) {
			streak += 1;
		}

		// Success!
// Visual: laser beam to alien
showLaserBeam(target.y);

// Visual: alien explosion
showAlienExplosion(target.x, target.y);

// Remove alien
state.aliens.splice(hitIndex, 1);
target.el.remove();

state.score += 100;
		if (state.round <= 5) {
			state.energy = Math.min(100, state.energy + 10);
		} else {
			state.energy = Math.min(160, state.energy+10);
		};
		if (streak === 3) {
			state.energy += 15;
			audio.playPowerUp();
			streak = 0;
			announce('+15 Energy Bonus!');
		} else {
			audio.playHit();
			announce(`Hit! ${state.score}`);
		};


	} else {
		// Miss
		state.energy -= 5;
		streak = 0;
		audio.playMiss();
		announce("Miss!");
		
		// Visual feedback on button
		cannonBtn.classList.add('misfire');
		setTimeout(() => cannonBtn.classList.remove('misfire'), 200);

		if (state.energy <= 0) gameOver();
	}

	updateStats();
}

// --- EVENT LISTENERS ---

document.getElementById('start-btn').addEventListener('click', () => {
	audio.init();
	document.getElementById('hud').removeAttribute('inert');
	document.getElementById('cannon-btn').removeAttribute('inert');
	document.getElementById('cannon-btn').focus();
	if (hsDiv) {
		hsDiv.setAttribute('inert', '');
	}
	if (footer) {
		footer.setAttribute('inert', '');
	}

	
	// Reset Game State
	state.score = 0;
	state.energy = 100;
	state.round = 1;
	state.isActive = true;
	state.lastFrameTime = performance.now();
	state.spawnTimer = 0;

	// Clear old aliens
	state.aliens.forEach(a => a.el.remove());
	state.aliens = [];

	startOverlay.style.display = 'none';
	announce("Game Started. Listen for the beeps.");
	updateStats();
	
	requestAnimationFrame(gameLoop);
});

cannonBtn.addEventListener('mousedown', fireCannon);

// Keyboard support (Space or Enter to fire)
window.addEventListener('keydown', (e) => {
	if (e.code === 'Space' || e.code === 'Enter') {
		if (state.isActive) {
			fireCannon();
			// Visual press effect
			cannonBtn.style.transform = "scale(0.95)";
			setTimeout(() => cannonBtn.style.transform = "scale(1)", 100);
		}
	}
});
// --- Shared High Score Logic (server-based) ---
//
// These expect matching elements in the HTML:
// <ol id="highscore-list">...</ol>
// <form id="highscore-form"> with
//   <input id="hs-initials">
//   <p id="hs-error" aria-live="polite">...</p>
//   <button id="hs-cancel-btn" type="button">Cancel</button>

// MUST MATCH the secret token in highScores.php
const HS_TOKEN = "h4ckingIsBadMkay?!";

// Path to PHP script
const HIGH_SCORES_URL = CURRENT_API_URL;
const hsDiv = document.getElementById('high-scores');

const MAX_HIGH_SCORES = 10;

const highScoreListEl = document.getElementById('highscore-list');
const hsForm = document.getElementById('highscore-form');
const hsInitialsInput = document.getElementById('hs-initials');
const hsErrorEl = document.getElementById('hs-error');
const hsCancelBtn = document.getElementById('hs-cancel-btn');

let latestHighScores = [];
let pendingScore = null;
let startBtnFocusTimeoutId = null;


// Render the scores into the <ol>
function renderHighScores(scores) {
	if (!highScoreListEl) return;

	highScoreListEl.innerHTML = '';

	if (!scores || !scores.length) {
		const li = document.createElement('li');
		li.textContent = 'No high scores yet.';
		highScoreListEl.appendChild(li);
		return;
	}

	scores.forEach((entry) => {
		const li = document.createElement('li');

		const wrapper = document.createElement('div');
		wrapper.setAttribute('role', 'text');

		const initialsSpan = document.createElement('span');
		const scoreSpan = document.createElement('span');

		initialsSpan.textContent = entry.initials;
		scoreSpan.textContent = entry.score;

		// "MBS, 9800"
		wrapper.appendChild(initialsSpan);
		wrapper.appendChild(document.createTextNode(', '));
		wrapper.appendChild(scoreSpan);

		li.appendChild(wrapper);
		highScoreListEl.appendChild(li);
	});
}


// Fetch scores from server and update list
function loadHighScoresFromServer() {
	if (!HIGH_SCORES_URL) return Promise.resolve([]);

	return fetch(HIGH_SCORES_URL, {
		method: 'GET',
		headers: {
			'Accept': 'application/json'
		}
	})
		.then((response) => response.json())
		.then((data) => {
			if (!Array.isArray(data)) {
				latestHighScores = [];
			} else {
				latestHighScores = data.slice().sort((a, b) => b.score - a.score);
			}
			renderHighScores(latestHighScores);
			return latestHighScores;
		})
		.catch(() => {
			// If we can't reach the server, keep whatever is currently shown
			if (!latestHighScores.length) {
				renderHighScores([]);
			}
			return latestHighScores;
		});
}

// Decide if a score qualifies for the list
function qualifiesForHighScore(score, scores) {
	const list = (scores && scores.length ? scores : latestHighScores)
		.slice()
		.sort((a, b) => b.score - a.score);

	if (!list.length) return true;
	if (list.length < MAX_HIGH_SCORES) return true;

	const lowest = list[list.length - 1].score;
	return score > lowest;
}

// Put the start overlay into "enter your initials" mode
function enterHighScorePrompt(score) {
	if (!hsForm) return;

	pendingScore = score;

	// Ensure overlay is visible
	if (startOverlay) {
		startOverlay.style.display = 'flex';
	}

	// If there's a heading, update it
	const titleEl = document.getElementById('hTitle') || (startOverlay && startOverlay.querySelector('h1'));
	if (titleEl) {
		titleEl.textContent = 'Game Over \u2013 New High Score!';
	}

	hsForm.hidden = false;

	if (hsErrorEl) {
		hsErrorEl.textContent = '';
	}

	if (hsInitialsInput) {
		hsInitialsInput.value = '';
		hsInitialsInput.focus();
	}
}

// Restore overlay to normal "Game Over" state
function exitHighScorePrompt() {
	pendingScore = null;

	if (hsForm) {
		hsForm.hidden = true;
	}

	const titleEl = document.getElementById('hTitle') || (startOverlay && startOverlay.querySelector('h1'));
	if (titleEl) {
		titleEl.textContent = 'Game Over, man, game over!';
	}

	const startBtn = document.getElementById('start-btn');
	if (startBtn) {
		startBtn.focus();
	}
	if (hsDiv) {
			hsDiv.removeAttribute('inert');
		}
	if (footer) {
			footer.removeAttribute('inert');
	}
}

// Initial load of scores when script runs
loadHighScoresFromServer();

// Wire up the high score form submit / cancel
if (hsForm) {
	hsForm.addEventListener('submit', (event) => {
		event.preventDefault();

		if (pendingScore === null) {
			exitHighScorePrompt();
			return;
		}

		const raw = hsInitialsInput ? hsInitialsInput.value.trim().toUpperCase() : '';
		const isValid = /^[A-Z]{2,3}$/.test(raw);

		if (!isValid) {
			if (hsErrorEl) {
				hsErrorEl.textContent = 'Please enter 2 or 3 letters.';
			}
			if (hsInitialsInput) {
				hsInitialsInput.setAttribute('aria-invalid', 'true');
				hsInitialsInput.focus();
			}
			return;
		} else {
			if (hsInitialsInput) {
				hsInitialsInput.removeAttribute('aria-invalid');
			}
			if (hsErrorEl) {
				hsErrorEl.textContent = '';
			}
		}

const payload = {
	initials: raw,
	score: pendingScore,
	token: HS_TOKEN
};

		fetch(HIGH_SCORES_URL, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
		'X-API-TOKEN': HS_TOKEN
	},
	body: JSON.stringify(payload)
}).then((response) => response.json()).then((data) => {
				if (Array.isArray(data)) {
					latestHighScores = data.slice().sort((a, b) => b.score - a.score);
					renderHighScores(latestHighScores);
					announce('High score saved.');
				}
			})
			.catch(() => {
				announce('Unable to save high score at this time.');
			})
			.finally(() => {
				exitHighScorePrompt();
			});
	});
}

if (hsCancelBtn) {
	hsCancelBtn.addEventListener('click', () => {
		exitHighScorePrompt();
	});
}

// Wrap the original gameOver to add high score handling
if (typeof gameOver === 'function') {
    const _originalGameOver = gameOver;
    gameOver = function () {
        _originalGameOver();

        loadHighScoresFromServer().then((scores) => {
            if (qualifiesForHighScore(state.score, scores)) {
                if (startBtnFocusTimeoutId !== null) {
                    clearTimeout(startBtnFocusTimeoutId);
                    startBtnFocusTimeoutId = null;
                }
                enterHighScorePrompt(state.score);
            }
        });
    };
}
