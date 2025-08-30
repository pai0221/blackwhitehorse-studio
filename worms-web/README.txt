# Worms-like Web Game (with AI)
- Charge to shoot (hold Space, release to fire)
- Destructible random terrain
- Wind affects trajectory
- Ground friction & air drag so worms stop sliding after blast
- Blue team is AI: it searches angle/power to aim the nearest enemy and fires automatically

## Controls
- Move: Left/Right (limited distance per turn)
- Aim: Up/Down
- Charge & Fire: Hold Space to charge, release to fire (player turns only)
- Weapons: 1=Bazooka, 2=Grenade, 3=Holy Hand Grenade
- Skip turn: Enter
- Regenerate terrain: R

## How to run
Open with a local web server (recommended):
- Python: `python -m http.server 8000` then visit http://localhost:8000/
- VSCode: install "Live Server" and click Go Live

Opening via file:// may block module scripts.
