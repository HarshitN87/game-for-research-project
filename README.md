# Signal Run — shirt merch acquisition study

An effort-versus-credit research prototype built by adapting the MIT-licensed [`mohsenheydari/three-fps`](https://github.com/mohsenheydari/three-fps) FPS source project.

## What participants experience

1. They consent and are randomly assigned to an **Effort Route** or a **Credit Route**.
2. They are shown a large, readable preview of the **Signal Run Crew Tee** merchandise: a cyan-and-violet shirt carrying the `SIGNAL RUN` and `OWN THE RUN` chest logo.
3. The effort group unlocks the shirt after clearing three escalating FPS rounds. The credit group spends 300 **experimental credits** before playing the exact same rounds with the shirt already equipped.
4. During every round, the shirt remains clearly visible in the upper-right merch panel. The game tracks completed rounds, shots, targets, and Signal score.
5. Participants complete a post-play 1–7 scale survey. Their anonymised response can be downloaded as JSON and is also saved locally in that browser.

This prototype does not process payment, transmit data, or collect names/contact details.

## Run locally

```powershell
cd C:\Users\negih\Downloads\gme\three-fps-source
npm install
npm start
```

Open the URL printed by Webpack (normally `http://localhost:8080`). For a production build:

```powershell
npm run build
```

The npm scripts include the legacy OpenSSL compatibility setting required by this older Webpack source on current Node.js releases.

## Test the study conditions

- `http://localhost:8080/?condition=effort`
- `http://localhost:8080/?condition=money`

Without a parameter, assignment uses the browser's cryptographic random number generator.

## Research deployment notes

Browser local storage is appropriate for prototype testing only. Before fielding a real study, replace it with an approved study backend and have your research team validate consent wording, participant withdrawal, data retention, eligibility, randomisation, debriefing, and all ethics/IRB requirements.

## Attribution and licence

The original FPS code is © 2021 Mohsen Heydari and remains under the [MIT License](LICENSE). Its original bundled assets retain their separate source licences/attribution requirements:

- AK47 model by kursat_sokmen — CC BY 4.0
- Metal Ammo Box model by TheoClarke — CC BY 4.0
- Mutant model/animations from Mixamo
- Veld Fire sky environment by Greg Zaal — CC0

The added Signal Run research flow and CSS-rendered Crew Tee design are original prototype work. They do not use Fortnite characters, logos, or artwork.
