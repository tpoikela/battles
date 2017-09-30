[![Coverage Status](https://coveralls.io/repos/tpoikela/battles/badge.svg?branch=master)](https://coveralls.io/r/tpoikela/battles?branch=master)

# battles
Roguelike-game Battles in the North

You can play it here: (https://tpoikela.github.io/battles/)

The development browser is currently Chrome 59.0.3071.86 (Official Build)
(64-bit) on Fedora 25.  Also tested on Firefox 53.0.3 (64-bit), on Fedora 25.

The unit tests are being run on Node V8.0.0 using mocha and chai.expect.

If there are rendering problems with the game area, try reducing the viewport
size with buttons +/-X and +/-Y.

## How to play

You can access the game directly here: (https://tpoikela.github.io/battles/)

If you want to build it yourself, then:

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
    npm run build
    # OR if you want to develop
    gulp watch-dev
```

Finally, serve the static files:
```code
    python -m SimpleHTTPServer
    # OR
    npm run server
```

After this, you should be able to access the game on localhost:8000/index.html.

## Development
 
Clone it:
```code
    git clone https://github.com/tpoikela/battles.git
```

Setup:
```code
    npm install
    gulp watch-dev
    npm run start
``` 
 
 
