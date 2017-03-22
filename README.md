[![Coverage Status](https://coveralls.io/repos/tpoikela/battles/badge.svg?branch=master)](https://coveralls.io/r/tpoikela/battles?branch=master)

# battles
Roguelike-game Battles in the North

The development browser is Firefox 38.0.5, on Fedora 20.
Quickly tested also on Chrome 52.0.2743.116, on Fedora 20.

The unit tests are being run on Node V4.2.1, using mocha and chai.expect mostly.

If there are rendering problems with the game area, try reducing the viewport
size with buttons +/-X and +/-Y.

## How to play

Clone it:
```code
    git clone https://github.com/tpoikela/battles.git
```

Compile .scss to .css:
```code
    sass style.scss style.css
```

Once I have some time, a proper makefile will be added.

Open 'index.html' with your browser. The game should start with a pop-up screen.

To run the game in Chrome, first start a HTTP server in the project folder:

```code
    python -m SimpleHTTPServer
```

After this, you should be able to access the game on address 0.0.0.0:8000.

