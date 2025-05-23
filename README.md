[![Code Coverage](https://github.com/herveDarritchon/foundryvtt-swerpg/actions/workflows/test.yml/badge.svg?branch=main)](https://herdev.hervedarritchon.fr/foundryvtt-swerpg/index.html)

# The Swerpg Game System

![Swerpg Logo](https://raw.githubusercontent.com/foundryvtt/swerpg/master/ui/banner.webp)

Swerpg is an innovative and modern tabletop role-playing game system built exclusively for Foundry Virtual Tabletop as a
digital platform. From the ground up, Swerpg is designed to leverage the unique capabilities of Foundry VTT to provide
gamemasters with a powerful toolset and effortless layers of automation, allowing gamemasters and players to focus on
what matters most: telling a compelling story.

See https://foundryvtt.com/packages/swerpg

# Local Development Process

```
cd {FOUNDRY_VTT_DATA_DIR}/systems
git clone https://github.com/foundryvtt/swerpg.git
cd swerpg
npm install
npm run compilePacks
npm run compileCSS
```

# Contribution Policy

The Swerpg game system is in early development and does not offer an open-source license or contribution policy at this
time. Such a policy will be added as the system progresses.

## Activate Hook display

To activate the hook display, you need to set the `debug` flag in the devtools console. You can do this by opening the
devtools console (F12) and entering the following command:

```
CONFIG.debug.hooks = true;
```