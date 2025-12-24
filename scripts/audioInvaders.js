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

let verbosityMode = 'original';
let runnerActive = false;
let runnerRef = null;
let runnerOsc = null;
let runnerGain = null;
let runnerPanner = null;
let runnerPulseInterval = null;

// --- ENERGY ALERT AUDIO (WARNING / DANGER) ---

let alertOsc = null;
let alertGain = null;
let alertInterval = null;
let energyAlertState = 'none'; // 'none' | 'warning' | 'danger'

//Runner Audio Setup

function initRunnerAudio() {
	if (!audio.ctx) return;

	runnerOsc = audio.ctx.createOscillator();
	runnerGain = audio.ctx.createGain();
	runnerPanner = audio.ctx.createStereoPanner();

	runnerOsc.type = 'sawtooth';
	runnerGain.gain.value = 0;
	runnerPanner.pan.value = 0;

	runnerOsc.connect(runnerGain);
	runnerGain.connect(runnerPanner);
	runnerPanner.connect(audio.masterGain);

	runnerOsc.start();
}

function startRunnerPresence() {
	if (!runnerOsc || !runnerGain || runnerPulseInterval) return;

	const pulseGain = 0.07;
	const pulseOnTime = 0.12;
	const pulseOffTime = 0.18;

	runnerPulseInterval = setInterval(() => {
		const now = audio.ctx.currentTime;

		runnerGain.gain.cancelScheduledValues(now);
		runnerGain.gain.setValueAtTime(0, now);
		runnerGain.gain.linearRampToValueAtTime(pulseGain, now + 0.015);
		runnerGain.gain.setValueAtTime(pulseGain, now + pulseOnTime);
		runnerGain.gain.linearRampToValueAtTime(0, now + pulseOnTime + 0.06);
	}, (pulseOnTime + pulseOffTime) * 1000);
}

function stopRunnerPresence() {
	if (runnerPulseInterval) {
		clearInterval(runnerPulseInterval);
		runnerPulseInterval = null;
	}

	if (!runnerGain || !audio.ctx) return;

	const now = audio.ctx.currentTime;
	runnerGain.gain.cancelScheduledValues(now);
	runnerGain.gain.setValueAtTime(0, now);
	if (runnerPanner) runnerPanner.pan.setValueAtTime(0, now);
}


function initEnergyAlertAudio() {
	if (!audio.ctx) return;

	alertOsc = audio.ctx.createOscillator();
	alertGain = audio.ctx.createGain();

	alertOsc.type = 'square';
	alertGain.gain.value = 0;

	alertOsc.connect(alertGain);
	alertGain.connect(audio.masterGain);

	alertOsc.start();
}

function stopEnergyAlert() {
	if (alertInterval) {
		clearInterval(alertInterval);
		alertInterval = null;
	}

	if (audio.ctx && alertOsc) {
		const now = audio.ctx.currentTime;
		alertOsc.frequency.cancelScheduledValues(now);
		alertOsc.frequency.setValueAtTime(0, now);
		alertOsc.detune.setValueAtTime(0, now);
	}

	if (alertGain && audio.ctx) {
		const now = audio.ctx.currentTime;
		alertGain.gain.cancelScheduledValues(now);
		alertGain.gain.linearRampToValueAtTime(0, now + 0.2);
	}

	energyAlertState = 'none';
}

function startWarningTone() {
	alertOsc.type = 'square';

	if (energyAlertState === 'warning') return;
	stopEnergyAlert();

	energyAlertState = 'warning';

	const baseFreq = 120;
	alertOsc.detune.setValueAtTime(-12, audio.ctx.currentTime);
	const onTime = 0.6;
	const offTime = 1.5;

alertInterval = setInterval(() => {
	const now = audio.ctx.currentTime;

	alertOsc.frequency.cancelScheduledValues(now);
	alertOsc.frequency.setValueAtTime(baseFreq, now);
	alertOsc.detune.setValueAtTime(-12, now);

	alertGain.gain.cancelScheduledValues(now);
	alertGain.gain.setValueAtTime(0, now);
	alertGain.gain.linearRampToValueAtTime(0.06, now + 0.02);
	alertGain.gain.setValueAtTime(0.06, now + onTime);
	alertGain.gain.linearRampToValueAtTime(0, now + onTime + 0.15);
}, (onTime + offTime) * 1000);

}

function startDangerTone() {
	alertOsc.type = 'square';
	alertOsc.detune.setValueAtTime(0, audio.ctx.currentTime);

	if (energyAlertState === 'danger') return;
	stopEnergyAlert();

	alertOsc.detune.setValueAtTime(0, audio.ctx.currentTime);

	energyAlertState = 'danger';

	const lowFreq = 220;
	const highFreq = 440;
	const riseTime = 0.7;
	const pauseTime = 0.6;

	alertInterval = setInterval(() => {
		const now = audio.ctx.currentTime;

		alertOsc.frequency.cancelScheduledValues(now);
		alertGain.gain.cancelScheduledValues(now);

		alertOsc.frequency.setValueAtTime(lowFreq, now);
		alertOsc.frequency.linearRampToValueAtTime(highFreq, now + riseTime);

		alertGain.gain.setValueAtTime(0, now);
alertGain.gain.linearRampToValueAtTime(0.045, now + 0.05);
alertGain.gain.setValueAtTime(0.045, now + riseTime - 0.1);

		alertGain.gain.linearRampToValueAtTime(0, now + riseTime);
	}, (riseTime + pauseTime) * 1000);
}

function updateEnergyAlert() {
	if (!state.isActive) return;

	if (state.energy <= 10) {
		startDangerTone();
		return;
	}

	if (state.energy <= 25) {
		startWarningTone();
		return;
	}

	if (energyAlertState !== 'none') {
		stopEnergyAlert();
	}
}

const gameBoard = document.getElementById('game-board');
let hud = null;
let scoreDisplay = null;
let energyDisplay = null;
let roundDisplay = null;


const ariaAnnouncer = document.getElementById('aria-announcer');



let lastFireTimeMs = 0;

function playRunnerExplosion() {
	if (!audio.ctx) return;

	const now = audio.ctx.currentTime;

	// Sub-bass impact (mass)
	const thumpOsc = audio.ctx.createOscillator();
	const thumpGain = audio.ctx.createGain();

	thumpOsc.type = 'sine';
	thumpOsc.frequency.setValueAtTime(50, now);
	thumpOsc.frequency.exponentialRampToValueAtTime(28, now + 0.18);

	thumpGain.gain.setValueAtTime(0.28, now);
	thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

	thumpOsc.connect(thumpGain);
	thumpGain.connect(audio.masterGain);

	thumpOsc.start(now);
	thumpOsc.stop(now + 0.24);

	// Explosion body (grit and spread)
	const bodyOsc = audio.ctx.createOscillator();
	const bodyGain = audio.ctx.createGain();

	bodyOsc.type = 'sawtooth';
	bodyOsc.frequency.setValueAtTime(180, now);
	bodyOsc.frequency.exponentialRampToValueAtTime(65, now + 0.45);

	bodyGain.gain.setValueAtTime(0.16, now);
	bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

	bodyOsc.connect(bodyGain);
	bodyGain.connect(audio.masterGain);

	bodyOsc.start(now);
	bodyOsc.stop(now + 0.55);
}


function attemptFire(source) {
	if (!state.isActive) return;

	const nowMs = performance.now();

	// De-dupe: prevents double-fire when AT triggers click plus a key event
	if (nowMs - lastFireTimeMs < 80) return;

	lastFireTimeMs = nowMs;

	fireCannon();

	// Visual press effect (safe everywhere)
	cannonBtn.style.transform = "scale(0.95)";
	setTimeout(() => {
		cannonBtn.style.transform = "scale(1)";
	}, 100);
}

const cannonBtn = document.getElementById('cannon-btn');
const startOverlay = document.getElementById('start-overlay');
const hsDiv = document.getElementById('high-scores');
const footer = document.getElementById('footer');
const verbosityRadios = document.querySelectorAll('input[name="verbosity"]');

verbosityRadios.forEach((radio) => {
	radio.addEventListener('change', () => {
		verbosityMode = radio.value;
	});
});


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

function createHud() {
	if (hud) return;

	hud = document.createElement('div');
	hud.id = 'hud';
	hud.className = 'hud';

	const energyBox = document.createElement('div');
	energyBox.className = 'stat-box';

	const energyText = document.createElement('div');
	energyText.setAttribute('role', 'text');

	const energyLabel = document.createElement('span');
	energyLabel.className = 'stat-label';
	energyLabel.textContent = 'ENERGY';

	energyDisplay = document.createElement('span');
	energyDisplay.id = 'energy-display';
	energyDisplay.textContent = state.energy;

	energyText.appendChild(energyLabel);
	energyText.appendChild(energyDisplay);
	energyBox.appendChild(energyText);

	const scoreBox = document.createElement('div');
	scoreBox.className = 'stat-box';

	const scoreText = document.createElement('div');
	scoreText.setAttribute('role', 'text');

	const scoreLabel = document.createElement('span');
	scoreLabel.className = 'stat-label';
	scoreLabel.textContent = 'SCORE';

	scoreDisplay = document.createElement('span');
	scoreDisplay.id = 'score-display';
	scoreDisplay.textContent = state.score;

	scoreText.appendChild(scoreLabel);
	scoreText.appendChild(scoreDisplay);
	scoreBox.appendChild(scoreText);

	const roundBox = document.createElement('div');
	roundBox.className = 'stat-box';

	const roundText = document.createElement('div');
	roundText.setAttribute('role', 'text');

	const roundLabel = document.createElement('span');
	roundLabel.className = 'stat-label';
	roundLabel.textContent = 'ROUND';

	roundDisplay = document.createElement('span');
	roundDisplay.id = 'round-display';
	roundDisplay.textContent = state.round;

	roundText.appendChild(roundLabel);
	roundText.appendChild(roundDisplay);
	roundBox.appendChild(roundText);

	hud.appendChild(energyBox);
	hud.appendChild(scoreBox);
	hud.appendChild(roundBox);

	// Insert HUD before game board
	gameBoard.parentNode.insertBefore(hud, gameBoard);
}

function destroyHud() {
	if (!hud) return;

	hud.remove();
	hud = null;
	scoreDisplay = null;
	energyDisplay = null;
	roundDisplay = null;
}

function announceGameEvent(type, originalMessage, lowMessage = '') {
	if (verbosityMode === 'off') {
		return;
	}

	if (verbosityMode === 'low') {
		if (type !== 'round' && type !== 'score') {
			return;
		}

		if (lowMessage) {
			announce(lowMessage);
			return;
		}
	}

	announce(originalMessage);
}


function announce(text) {
	ariaAnnouncer.textContent = text;
}

function replaceHudValue(el, value) {
	if (!el) return;

	const nextValue = String(value);

	// If value didn't change, do nothing (keeps DOM calmer).
	if (el.textContent === nextValue) return;


	const replacement = el.cloneNode(false);
	replacement.textContent = nextValue;

	// Preserve id (cloneNode(false) keeps attributes, but be explicit).
	replacement.id = el.id;

	el.replaceWith(replacement);

	// Update our references so future updates hit the current node.
	if (replacement.id === 'score-display') {
		scoreDisplay = replacement;
	} else if (replacement.id === 'energy-display') {
		energyDisplay = replacement;
	} else if (replacement.id === 'round-display') {
		roundDisplay = replacement;
	}
}

let lastHudAnnounceTime = 0;

function isMacOSSafari() {
	const ua = navigator.userAgent;
	const isSafari = ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
	const isMac = ua.includes('Macintosh');
	return isSafari && isMac;
}

function updateStats() {
	if (scoreDisplay) {
		scoreDisplay.textContent = state.score;
	}
	if (energyDisplay) {
		energyDisplay.textContent = state.energy;
	}
	if (roundDisplay) {
		roundDisplay.textContent = state.round;
	}
}

function spawnAlien() {
	const id = Date.now() + Math.random();

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
		speedX: finalSpeedX,
		speedY: 15 + (state.round * 5),
		nextBeep: 0,
		type: 'normal',
		el: document.createElement('div')
	};

	alien.el.className = 'alien';
	gameBoard.appendChild(alien.el);
	state.aliens.push(alien);
}

function maybeSpawnRunner() {
	if (runnerActive) return;
	if (state.round < 1) return;

	let spawnChance = 0.05;

	if (state.round >= 14) {
		spawnChance = 0.08;
	}
	if (state.round >= 18) {
		spawnChance = 0.12;
	}

	if (Math.random() > spawnChance) return;

	const startLeft = Math.random() > 0.5;
	const baseSpeedX = (startLeft ? 1 : -1) * (140 + (state.round * 20));

	const runner = {
		id: Date.now() + Math.random(),
		x: startLeft ? 0 : GAME_WIDTH,
		y: 0,
		toneOffset: 0,
		speedX: baseSpeedX,
		speedY: 20 + (state.round * 6),
		nextBeep: 0,
		type: 'runner',
		el: document.createElement('div')
	};

	runner.el.className = 'alien runner';
	gameBoard.appendChild(runner.el);
	state.aliens.push(runner);
	runnerActive = true;
	startRunnerPresence();

	runnerRef = runner;
}


function gameOver() {
	state.isActive = false;
	runnerActive = false;
	runnerRef = null;
	stopRunnerPresence();

	stopEnergyAlert();
	audio.playBell(); // Ring bell at zero/end
	announce(`Game over, man, game over! Final Score ${state.score}.`);

	setTimeout(() => {
		const cannon = document.getElementById('cannon-btn');
		if (cannon) {
			cannon.setAttribute('inert', '');
		}
		if (hsDiv) {
			hsDiv.removeAttribute('inert');
		}
		if (footer) {
			footer.removeAttribute('inert');
		}
	destroyHud();

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
		const maxAliens = state.round >= 5 ? Math.min(3, Math.floor(state.round / 2)) : 1;

		const normalAlienCount = state.aliens.filter(a => a.type !== 'runner').length;

		if (normalAlienCount < maxAliens) {
			spawnAlien();
		}

		maybeSpawnRunner();

		state.spawnTimer = 2.0;
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
		// Audio Logic (Beeping / Runner Presence)
		if (alien.type === 'runner') {
			// Keep runnerRef aligned to the live runner object
			runnerRef = alien;

			// Runner audio updates (pan + pitch)
			if (runnerPanner && runnerOsc && audio.ctx) {
				const panVal = ((alien.x / GAME_WIDTH) * 2) - 1;
				const yRatio = Math.min(1, alien.y / GAME_HEIGHT);
				const freq = 110 + (yRatio * 260);

				runnerPanner.pan.setValueAtTime(panVal, audio.ctx.currentTime);
				runnerOsc.frequency.setValueAtTime(freq, audio.ctx.currentTime);
			}

			// No beeps for runner (pulse interval is its pattern)
		} else {
			// Normal alien beep
			const panVal = ((alien.x / GAME_WIDTH) * 2) - 1;
			const yPercent = Math.max(0, Math.min(100, (alien.y / GAME_HEIGHT) * 100));

			if (timestamp >= alien.nextBeep) {
				audio.playAlienBeep(panVal, yPercent, alien.toneOffset);

				const baseInterval = 1000 - (alien.y / GAME_HEIGHT * 850);

				const roundFactor = Math.max(0, state.round - 1);
				const densityFactor = Math.max(0, state.aliens.length - 1);
				const difficulty = 1 + (roundFactor * 0.15) + (densityFactor * 0.1);

				const adjustedInterval = Math.max(120, baseInterval / difficulty);
				const jitter = adjustedInterval * 0.3 * (Math.random() - 0.5);

				alien.nextBeep = timestamp + (adjustedInterval + jitter);
			}
		}

		// Fail Condition (Reaches Bottom)
		if (alien.y >= GAME_HEIGHT) {
			state.aliens.splice(index, 1);
			alien.el.remove();

			if (alien.type === 'runner') {
				state.energy -= 30;
				runnerActive = false;
				runnerRef = null;
				stopRunnerPresence();

				// audio.playRunnerImpact();
			} else {
				state.energy -= 20;
				audio.playAlienExplosion();
				announceGameEvent('other', 'Kaboom! Energy lost.');
			}

			updateStats();
			updateEnergyAlert();

			if (state.energy <= 0) gameOver();
		}

	});

	// Round Progression (Simple time based or score based)
	// Let's increase difficulty every 500 points
	const expectedRound = Math.floor(state.score / 500) + 1;
	if (expectedRound > state.round) {
		state.round = expectedRound;
		announceGameEvent('round', `Round ${state.round}`);
		updateStats();
		updateEnergyAlert();

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
	


	// Filter for aliens in the zone
	const targets = state.aliens.filter(a => Math.abs(a.x - CENTER_X) < HIT_THRESHOLD);


	if (targets.length === 0) {
		// Miss
		state.energy -= 5;
		streak = 0;
		audio.playMiss();
		announceGameEvent('other', 'Miss!');

		cannonBtn.classList.add('misfire');
		setTimeout(() => cannonBtn.classList.remove('misfire'), 200);

		if (state.energy <= 0) gameOver();

		updateStats();
		updateEnergyAlert();
		return;
	}

	// Hit path
	targets.sort((a, b) => b.y - a.y);
	const target = targets[0];
	const hitIndex = state.aliens.indexOf(target);

	if (state.round >= 5) {
		streak += 1;
	}

	showLaserBeam(target.y);
	showAlienExplosion(target.x, target.y);

	state.aliens.splice(hitIndex, 1);
	target.el.remove();

	if (target.type === 'runner') {
		state.score += 200;

		if (state.energy <= 155) {
			state.energy += 20;
		} else {
			state.energy = 175;
		}

		runnerActive = false;
		runnerRef = null;
		stopRunnerPresence();

			playRunnerExplosion();
		announceGameEvent('score', `Runner destroyed! Score: ${state.score}`, `${state.score}`);

	} else {
		state.score += 100;

		if (state.round <= 5) {
			state.energy = Math.min(100, state.energy + 10);
			audio.playHit();
			announceGameEvent('score', `Hit! Score: ${state.score}`, `${state.score}`);
		} else {
			state.energy = Math.min(175, state.energy + 10);

			if (streak === 3) {
				if (state.energy <= 160) {
					state.energy = Math.min(175, state.energy + 15);
					announceGameEvent('other', '+15 Energy Boost!');
				} else {
					state.energy = 175;
					announceGameEvent('other', 'Max Energy!');
				}

				audio.playPowerUp();
				streak = 0;
			} else {
				audio.playHit();
				announceGameEvent('score', `Hit! Score: ${state.score}`, `${state.score}`);
			}
		}
	}

	updateStats();
	updateEnergyAlert();

}

// --- EVENT LISTENERS ---

document.getElementById('start-btn').addEventListener('click', () => {
	audio.init();
	initEnergyAlertAudio();
	initRunnerAudio();

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
	announceGameEvent('other', "Game Started, listen for the beeps!");
	createHud();
	updateStats();
	updateEnergyAlert();

	requestAnimationFrame(gameLoop);
});

cannonBtn.addEventListener('click', (e) => {
	e.preventDefault();
	attemptFire('click');
});

cannonBtn.addEventListener('pointerdown', () => {
	cannonBtn.style.transform = "scale(0.95)";
});

cannonBtn.addEventListener('pointercancel', () => {
	cannonBtn.style.transform = "scale(1)";
});


//Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
	// Don’t steal keys when the user is typing in a form field (high score initials, etc.)
	const activeEl = document.activeElement;
	const activeTag = activeEl ? activeEl.tagName.toLowerCase() : '';
	const isTypingField = activeTag === 'input' || activeTag === 'textarea' || activeEl?.isContentEditable;

	if (isTypingField) {
		return;
	}

	// Stat hotkeys (only during active gameplay)
	if (state.isActive) {
		const key = (e.key || '').toLowerCase();

		if (key === 's') {
			e.preventDefault();
			announce(`Score: ${state.score}`);
			return;
		}

		if (key === 'e') {
			e.preventDefault();
			announce(`Energy: ${state.energy}`);
			return;
		}

		if (key === 'r') {
			e.preventDefault();
			announce(`Round ${state.round}`);
			return;
		}
	}

// Fire controls (keyboard only)
if (e.code === 'Space' || e.code === 'Enter') {
	if (!state.isActive) return;

	// If the Fire button itself is focused, let pointer activation handle it
	if (document.activeElement === cannonBtn) {
		return;
	}

	e.preventDefault();
	attemptFire('key');


	// Visual press effect
	cannonBtn.style.transform = "scale(0.95)";
	setTimeout(() => cannonBtn.style.transform = "scale(1)", 100);
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

function footerYear() {
	const yearEl = document.getElementById('copyrightYear');
	if (yearEl) {
		yearEl.textContent = new Date().getFullYear();
	}
}

footerYear();