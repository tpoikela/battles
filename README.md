[![Coverage Status](https://coveralls.io/repos/github/tpoikela/battles/badge.svg?branch=master)](https://coveralls.io/github/tpoikela/battles?branch=master)

# battles
Roguelike-game Battles in the North

You can play it here: (https://tpoikela.github.io/battles/)

The development browser is currently Chrome Version 73.0.3683.103 (Official Build) (64-bit)
on Linux Fedora 28. The game is playable also on Firefox Quantum 66.0.2
(64-bit).

The unit tests are being run on Node V9.3.0 using mocha and chai.expect.

If there are rendering problems with the game area, try reducing the viewport
size with buttons +/-X and +/-Y.

## Help Wanted

The game has been written using TypeScript and ReactJS.

If you are interested in developing the game, there are many parts which could
use some help:

  - Content development (spells, items, actors etc)
    - Manually designing content OR
    - Procedurally generating content
  - Procedural name generation for actors/places
  - Goal-based AI development (not GOAP though)
  - Somewhat realistic AI for simulating a player, for testing the game
  - Build pipeline optimisation, code coverage collection for unit/integration tests
  - Development of a bug reporting system
  - Manual playtesting and bug reporting
  - It has mountains, dungeons, castles, crypts, cities as regions to explore.
    If you would like to contribute any other type of region which fits the theme of the game, that would be great.
  - Many other areas, let me know if you are interested in any particular feature
  - Game design and mechanics (economics, world simulation mechanics)
  - GUI improvements (re-vamp/re-design)
  - Developing scripts to simulate actors/items for (fine-)tuning the game balance

## How to play

You can access the game directly here: (https://tpoikela.github.io/battles/)

If you want to build (but not develop) it yourself and run locally, then:

Clone it:
```code
    git clone https://github.com/tpoikela/battles.git
```

Install dependencies:
```code
    npm install
```

Build the project using npm/gulp:
```code
    npm run build:production
```

Finally, serve the static files:
```code
    npm run start
```

After this, you should be able to access the game on localhost:8000/index.html
with your browser.

## Development
 
Clone it:
```code
    git clone https://github.com/tpoikela/battles.git
```

Setup:
```code
    npm install
    npm run build:sass
    npm run dev
``` 
 
Then follow webpack instructions to open the game in your browser. Usually it
should be at http://localhost:3030/.
 
