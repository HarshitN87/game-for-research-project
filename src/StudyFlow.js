const STUDY_STORAGE_KEY = 'signal-run-three-fps-responses';
const ROUND_COUNT = 3;

const shirt = {
  name: 'Signal Run Crew Tee',
  logo: 'SIGNAL RUN',
  price: 300,
};

export default class StudyFlow {
  constructor(app) {
    this.app = app;
    this.condition = null;
    this.round = 1;
    this.roundSettings = [
      { label: 'Warm-up', health: 12, reward: 100, location: [10.8, 0.0, 22.0], totalEnemies: 3, maxSimultaneous: 2, spawnRate: 5.0 },
      { label: 'Signal Chase', health: 18, reward: 175, location: [14.37, 0.0, 10.45], totalEnemies: 5, maxSimultaneous: 3, spawnRate: 3.5 },
      { label: 'Final Signal', health: 24, reward: 250, location: [32.77, 0.0, 33.84], totalEnemies: 8, maxSimultaneous: 4, spawnRate: 2.0 },
    ];
    this.participantId = `P-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()}`;
    this.studyStart = new Date().toISOString();
    this.acquiredAt = null;
    this.gameStartedAt = null;
    this.gameplay = { shots: 0, hits: 0, targets: 0, score: 0 };
    this.events = [];
    this.gameActive = false;
    this.ready = false;

    this.overlay = document.getElementById('study_overlay');
    this.hud = document.getElementById('study_hud');
    window.addEventListener('fps-target-defeated', this.onTargetDefeated);
    window.addEventListener('fps-shot-fired', this.onShotFired);
  }

  record(event, details = {}) {
    this.events.push({ event, at: new Date().toISOString(), ...details });
  }

  showReady() {
    this.ready = true;
    this.record('assets_loaded');
    this.renderWelcome();
  }

  get forcedCondition() {
    const value = new URLSearchParams(window.location.search).get('condition');
    return ['effort', 'money'].includes(value) ? value : null;
  }

  assignCondition() {
    this.condition = this.forcedCondition || (crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0 ? 'effort' : 'money');
    this.record('condition_assigned', { condition: this.condition, forced: Boolean(this.forcedCondition) });
  }

  setOverlay(markup, className = '') {
    this.overlay.className = `study-overlay ${className}`;
    this.overlay.innerHTML = `<div class="study-card">${markup}</div>`;
  }

  renderWelcome() {
    this.hideHud();
    this.setOverlay(`
      <div class="study-brand"><span>✦</span> SIGNAL RUN</div>
      <span class="eyebrow">RESEARCH PROTOTYPE</span>
      <h1>Earn it, or choose it?</h1>
      <p class="lead">Play a short FPS challenge, receive limited-edition shirt merch, then answer a few research questions. No real money is used.</p>
      <div class="meta-row"><span>≈ 5 minutes</span><span>•</span><span>Desktop required</span><span>•</span><span>Anonymous session</span></div>
      <label class="consent-row"><input id="consent" type="checkbox"> <span>I understand that this is a research prototype and I agree to take part.</span></label>
      <button class="primary-button" id="continue" disabled>Begin study <b>→</b></button>
      <p class="fine-print">Research test routes: <code>?condition=effort</code> and <code>?condition=money</code>.</p>
    `, 'landing');
    const consent = document.getElementById('consent');
    const continueButton = document.getElementById('continue');
    consent.addEventListener('change', () => { continueButton.disabled = !consent.checked; });
    continueButton.addEventListener('click', () => {
      this.assignCondition();
      this.renderRoute();
    });
  }

  renderRoute() {
    const effort = this.condition === 'effort';
    this.setOverlay(`
      <div class="study-brand"><span>✦</span> SIGNAL RUN</div>
      <span class="route-chip ${effort ? 'effort' : 'credit'}">${effort ? 'EFFORT ROUTE' : 'CREDIT ROUTE'}</span>
      <h1>${effort ? 'Earn your crew tee.' : 'Choose your crew tee.'}</h1>
      <p class="lead">${effort
        ? `Clear all ${ROUND_COUNT} Signal Run rounds to unlock this shirt for your loadout.`
        : `Use ${shirt.price} experimental credits to add this shirt to your loadout before the exact same challenge.`}</p>
      ${this.shirtShowcase(effort ? 'Locked until you complete all rounds' : `${shirt.price} experimental credits`, effort ? 'locked' : 'equipped')}
      <button class="primary-button" id="route-action">${effort ? 'Start earning →' : 'Get the shirt →'}</button>
      <p class="fine-print">The shirt is cosmetic only. It does not change health, ammo, or target difficulty.</p>
    `, 'landing merch-landing');
    document.getElementById('route-action').addEventListener('click', () => {
      if (effort) {
        this.record('effort_route_started');
        this.renderBriefing();
      } else {
        this.acquiredAt = new Date().toISOString();
        this.record('merch_acquired', { method: 'experimental_credits', creditsSpent: shirt.price });
        window.game.loadout = { shirt: 'signal-run', pants: 'signal-run', head: 'signal-run' };
        this.renderAcquired();
      }
    });
  }

  shirtShowcase(status, mode) {
    return `
      <div class="shirt-showcase ${mode}">
        <div class="shirt-stage" aria-label="Signal Run Crew Tee merchandise preview">
          <div class="tee-shirt">
            <div class="tee-neck"></div>
            <div class="tee-logo"><span>SIGNAL</span><strong>RUN</strong><small>OWN THE RUN</small></div>
          </div>
          <div class="shirt-shadow"></div>
        </div>
        <div class="shirt-copy"><span class="eyebrow">LIMITED-EDITION MERCH</span><h2>${shirt.name}</h2><p>A bright cyan-and-violet shirt with the <strong>SIGNAL RUN</strong> chest logo.</p><span class="merch-status">${mode === 'equipped' ? '✓' : '◌'} ${status}</span></div>
      </div>`;
  }

  renderAcquired() {
    this.setOverlay(`
      <div class="success-mark">✓</div>
      <span class="eyebrow">MERCH ADDED TO LOADOUT</span>
      <h1>You got the tee.</h1>
      ${this.shirtShowcase('Equipped for every round', 'equipped')}
      <p class="lead center">Your Signal Run Crew Tee is now equipped. It is cosmetic only.</p>
      <button class="primary-button" id="briefing">Enter Signal Run →</button>
    `, 'landing acquired');
    document.getElementById('briefing').addEventListener('click', () => this.renderBriefing());
  }

  renderLoadoutCustomizer() {
    const isUnlocked = this.acquiredAt !== null || this.round > ROUND_COUNT;
    window.game.loadout = window.game.loadout || { shirt: 'default', pants: 'default', head: 'default' };
    
    return `
      <div class="loadout-customizer">
        <span class="eyebrow" style="margin-bottom: 8px;">CUSTOMIZE OUTFIT</span>
        <div class="customizer-grid">
          <div class="customizer-item">
            <span class="item-label">Torso</span>
            <select id="select-shirt">
              <option value="default" ${window.game.loadout.shirt === 'default' ? 'selected' : ''}>Default Grey Tee</option>
              <option value="stealth" ${window.game.loadout.shirt === 'stealth' ? 'selected' : ''}>Stealth Cyber Hoodie</option>
              <option value="medic" ${window.game.loadout.shirt === 'medic' ? 'selected' : ''}>Medic Tactical Vest</option>
              <option value="signal-run" ${window.game.loadout.shirt === 'signal-run' ? 'selected' : ''} ${!isUnlocked ? 'disabled' : ''}>
                Signal Run Tee ${!isUnlocked ? '🔒' : '✓'}
              </option>
            </select>
          </div>
          <div class="customizer-item">
            <span class="item-label">Legs</span>
            <select id="select-pants">
              <option value="default" ${window.game.loadout.pants === 'default' ? 'selected' : ''}>Default Slate Jeans</option>
              <option value="cargo" ${window.game.loadout.pants === 'cargo' ? 'selected' : ''}>Cargo Combat Pants</option>
              <option value="greaves" ${window.game.loadout.pants === 'greaves' ? 'selected' : ''}>Cyber Armor Greaves</option>
              <option value="signal-run" ${window.game.loadout.pants === 'signal-run' ? 'selected' : ''} ${!isUnlocked ? 'disabled' : ''}>
                Signal Run Joggers ${!isUnlocked ? '🔒' : '✓'}
              </option>
            </select>
          </div>
          <div class="customizer-item">
            <span class="item-label">Head</span>
            <select id="select-head">
              <option value="default" ${window.game.loadout.head === 'default' ? 'selected' : ''}>Default Head</option>
              <option value="nvg" ${window.game.loadout.head === 'nvg' ? 'selected' : ''}>Night-Vision Goggles</option>
              <option value="ninja" ${window.game.loadout.head === 'ninja' ? 'selected' : ''}>Ninja Face Mask</option>
              <option value="signal-run" ${window.game.loadout.head === 'signal-run' ? 'selected' : ''} ${!isUnlocked ? 'disabled' : ''}>
                Cyber Helmet ${!isUnlocked ? '🔒' : '✓'}
              </option>
            </select>
          </div>
        </div>
        ${!isUnlocked ? `<div class="customizer-lock-hint">🔒 Signal Run items unlock via ${this.condition === 'effort' ? 'effort (clear all 3 rounds)' : 'credits (acquire on landing page)'}.</div>` : ''}
      </div>
    `;
  }

  renderBriefing() {
    const settings = this.roundSettings[this.round - 1];
    this.setOverlay(`
      <div class="study-brand"><span>✦</span> SIGNAL RUN</div>
      <span class="eyebrow">ROUND ${this.round} OF ${ROUND_COUNT}</span>
      <h1>${settings.label}</h1>
      <div class="brief-grid">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Move</span></div>
        <div><kbd>Mouse</kbd><span>Look and fire</span></div>
        <div><kbd>R</kbd><span>Reload</span></div>
      </div>
      
      ${this.renderLoadoutCustomizer()}
      
      <p class="lead">Tag the arena target. This round is worth <strong>${settings.reward} Signal</strong>. ${this.condition === 'effort' && this.acquiredAt === null ? 'Your custom set unlocks after round 3.' : 'Your customized loadout is equipped for the run.'}</p>
      <button class="primary-button" id="start-round">Start round ${this.round} →</button>
    `, 'landing briefing');

    const shirtSel = document.getElementById('select-shirt');
    const pantsSel = document.getElementById('select-pants');
    const headSel = document.getElementById('select-head');
    
    const updateLoadout = () => {
      window.game.loadout = {
        shirt: shirtSel.value,
        pants: pantsSel.value,
        head: headSel.value
      };
    };
    
    shirtSel.addEventListener('change', updateLoadout);
    pantsSel.addEventListener('change', updateLoadout);
    headSel.addEventListener('change', updateLoadout);

    document.getElementById('start-round').addEventListener('click', () => this.startRound());
  }

  startRound() {
    this.gameStartedAt ||= new Date().toISOString();
    this.gameActive = true;
    this.record('round_started', { round: this.round });
    this.overlay.className = 'study-overlay hidden';
    this.showHud();
    this.app.StartGame();
  }

  getTargetHealth() {
    return this.roundSettings[this.round - 1].health;
  }

  getTargetLocation() {
    return this.roundSettings[this.round - 1].location;
  }

  getShirtStatus() {
    const isUnlocked = this.acquiredAt !== null || this.round > ROUND_COUNT;
    const shirtEquipped = window.game && window.game.loadout && window.game.loadout.shirt === 'signal-run';
    if (shirtEquipped) return '✓ Equipped';
    if (isUnlocked) return '◌ Unequipped';
    const roundsLeft = ROUND_COUNT - this.round + 1;
    return `Locked (${roundsLeft} round${roundsLeft === 1 ? '' : 's'} left)`;
  }

  showHud() {
    const shirtEquipped = window.game && window.game.loadout && window.game.loadout.shirt === 'signal-run';
    const status = this.getShirtStatus();
    const settings = this.roundSettings[this.round - 1];
    const totalEnemies = settings.totalEnemies || 1;
    this.hud.innerHTML = `
      <div class="mission-card"><span class="eyebrow">ROUND ${this.round} / ${ROUND_COUNT}</span><strong>${settings.label}</strong><span id="target-status">${totalEnemies} target${totalEnemies !== 1 ? 's' : ''} remaining · ${settings.reward} Signal</span></div>
      <div class="live-merch-card"><span class="eyebrow">YOUR MERCH</span><div class="hud-shirt ${shirtEquipped ? '' : 'default'}"><span>SIGNAL</span><strong>RUN</strong></div><strong>Signal Run Crew Tee</strong><small>${status}</small></div>
      <div class="score-card"><span>SIGNAL</span><strong id="signal-score">${this.gameplay.score}</strong></div>
      <div class="play-tip">WASD move · mouse aim/fire · R reload</div>
    `;
    this.hud.className = 'study-hud';
  }

  hideHud() {
    this.hud.className = 'study-hud hidden';
    this.hud.innerHTML = '';
  }

  onShotFired = () => {
    if (this.gameActive) this.gameplay.shots += 1;
  }

  onTargetDefeated = () => {
    if (!this.gameActive) return;
    this.gameActive = false;
    this.gameplay.hits += 1;
    this.gameplay.targets += 1;
    const reward = this.roundSettings[this.round - 1].reward;
    this.gameplay.score += reward;
    this.record('round_completed', { round: this.round, reward, score: this.gameplay.score });
    document.exitPointerLock?.();
    this.hideHud();
    
    // Hide game_hud as well!
    const gameHud = document.getElementById("game_hud");
    if (gameHud) {
      gameHud.style.visibility = 'hidden';
    }

    if (this.round < ROUND_COUNT) {
      this.round += 1;
      this.renderRoundClear(reward);
    } else {
      if (this.condition === 'effort') {
        this.acquiredAt = new Date().toISOString();
        this.record('merch_acquired', { method: 'completed_rounds', rounds: ROUND_COUNT });
        window.game.loadout = { shirt: 'signal-run', pants: 'signal-run', head: 'signal-run' };
      }
      this.renderFinish(reward);
    }
  }

  renderRoundClear(reward) {
    this.setOverlay(`
      <div class="success-mark">+${reward}</div>
      <span class="eyebrow">ROUND CLEARED</span>
      <h1>Signal secured.</h1>
      <p class="lead center">You have <strong>${this.gameplay.score} Signal</strong>. One new target is waiting in round ${this.round}.</p>
      ${this.condition === 'effort' ? this.shirtShowcase(`Progress: ${this.round - 1} of ${ROUND_COUNT} rounds cleared`, 'locked') : ''}
      <button class="primary-button" id="next-round">Continue to round ${this.round} →</button>
    `, 'landing round-clear');
    document.getElementById('next-round').addEventListener('click', () => this.renderBriefing());
  }

  renderFinish(reward) {
    const earned = this.condition === 'effort';
    this.setOverlay(`
      <div class="success-mark">${earned ? '✦' : '✓'}</div>
      <span class="eyebrow">${earned ? 'MERCH UNLOCKED' : 'RUN COMPLETE'}</span>
      <h1>${earned ? 'You earned the tee.' : 'Challenge complete.'}</h1>
      ${this.shirtShowcase(earned ? '✓ Unlocked through gameplay' : '✓ Equipped through experimental credits', 'equipped')}
      <div class="final-score"><span>FINAL SIGNAL</span><strong>${this.gameplay.score}</strong></div>
      <button class="primary-button" id="survey">Continue to questions →</button>
    `, 'landing finish');
    document.getElementById('survey').addEventListener('click', () => this.renderSurvey());
  }

  likert(name, question) {
    return `<fieldset class="question"><legend>${question}</legend><div class="likert"><span>Strongly disagree</span>${[1, 2, 3, 4, 5, 6, 7].map((value) => `<label><input required type="radio" name="${name}" value="${value}"><b>${value}</b></label>`).join('')}<span>Strongly agree</span></div></fieldset>`;
  }

  renderSurvey() {
    this.record('survey_opened');
    this.setOverlay(`
      <div class="study-brand"><span>✦</span> SIGNAL RUN</div>
      <span class="eyebrow">POST-PLAY QUESTIONS</span>
      <h1>How did the merch feel?</h1>
      <p class="lead">Choose the response closest to how you feel about the Signal Run Crew Tee now.</p>
      <form id="survey-form">
        ${this.likert('value', 'This shirt feels valuable to me.')}
        ${this.likert('ownership', 'I feel that this shirt is mine.')}
        ${this.likert('pride', 'I feel proud to use this shirt.')}
        ${this.likert('preference', 'I would choose this shirt over a default shirt.')}
        <fieldset class="question"><legend>How did you receive the shirt in this study?</legend><label class="radio-row"><input required type="radio" name="method_check" value="completed gameplay"> By completing gameplay</label><label class="radio-row"><input type="radio" name="method_check" value="experimental credits"> By using experimental credits</label><label class="radio-row"><input type="radio" name="method_check" value="not sure"> I’m not sure</label></fieldset>
        <label class="question"><span>What, if anything, influenced how you felt about the shirt?</span><textarea name="comment" maxlength="600" rows="3" placeholder="Optional"></textarea></label>
        <button class="primary-button" type="submit">Submit responses →</button>
      </form>
    `, 'landing survey');
    document.getElementById('survey-form').addEventListener('submit', (event) => this.submitSurvey(event));
  }

  submitSurvey(event) {
    event.preventDefault();
    const response = {
      schemaVersion: 1,
      participantId: this.participantId,
      condition: this.condition,
      shirt: shirt.name,
      acquisition: this.condition === 'effort' ? 'completed_rounds' : 'experimental_credits',
      startedAt: this.studyStart,
      acquiredAt: this.acquiredAt,
      gameplay: {
        startedAt: this.gameStartedAt,
        roundsCompleted: this.round,
        targetsTagged: this.gameplay.targets,
        shots: this.gameplay.shots,
        score: this.gameplay.score,
      },
      survey: Object.fromEntries(new FormData(event.currentTarget)),
      events: this.events,
      completedAt: new Date().toISOString(),
    };
    const saved = JSON.parse(localStorage.getItem(STUDY_STORAGE_KEY) || '[]');
    saved.push(response);
    localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(saved));
    this.record('survey_submitted');
    this.renderComplete(response);
  }

  renderComplete(response) {
    this.setOverlay(`
      <div class="success-mark">✓</div>
      <span class="eyebrow">RESPONSE RECORDED</span>
      <h1>Thank you for playing.</h1>
      <p class="lead center">Your anonymous response was saved on this device as <strong>${this.participantId}</strong>.</p>
      <button class="secondary-button" id="download">Download this response</button>
      <button class="text-button" id="restart">Start another test session</button>
    `, 'landing complete');
    document.getElementById('download').addEventListener('click', () => this.download(response));
    document.getElementById('restart').addEventListener('click', () => window.location.reload());
  }

  download(response) {
    const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `signal-run-${response.participantId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
