# Audio Invaders

Audio Invaders is an accessible, audio-driven browser game inspired by the original Space Invaders arcade game. Created by Chancey Fleet with additional engineering and accessibility improvements by Marco Salsiccia.

The game is played primarily through stereo audio, with subtle visual effects and cues for sighted players. The game itself is fully keybaord and screen reader accessible, playable on mobile, and follows WCAG 2.2 AA standards.

This repository does not include the server-side PHP or JSON files needed for high score storage.

[Play Audio Invaders here](https://marconius.com/fun/audioInvaders/)

## Features

### Audio-first game design
- Unique beeps for each alien using Web Audio API synthesis
- Stereo panning conveys horizontal movement
- Pitch conveys vertical distance
- Sound effects include explosions, shots, hits, misses, and power-ups

### Accessibility
- WCAG 2.2 AA compliant interface
- Live region announcements for game events
- All controls are keyboard accessible
- Non-game UI becomes inert during gameplay to reduce navigation noise

### Visual Enhancements
- High contrast neon green retro theme
- Animated laser beam from the cannon
- Animated alien explosions
- Responsive HUD and scoreboard

### High Score System
The high score system communicates with a secure PHP endpoint and JSON data file, which are not included in this repository. The JavaScript includes:
- GET and POST communication
- Secret token required for writes
- Score sorting and rendering

You may implement your own server components.

## Setup and Usage

1. Clone the repository  
   git clone https://github.com/your-username/audio-invaders.git

2. Open index.html in a modern browser.

3. If you want high scores to work, install the matching PHP and JSON files on your server.

4. Edit CURRENT_API_URL inside audioInvaders.js if you are using test or production endpoints.

## Accessibility Notes

This game was designed to:
- Maintain predictable screen reader flow
- Avoid forced focus jumps
- Provide timely, clear audio feedback
- Never rely on visuals alone
- Keep controls simple and consistent

Stereo headphones are recommended for best gameplay.

## License

This project uses the MIT License. See the LICENSE file included in this repository.

© 2025 Chancey Fleet and Marco Salsiccia
