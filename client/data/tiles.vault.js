
/* Generic tiles for building vaults inside levels. Note that vaults don't have
 * their exit directions specified. This guarantees they are excluded from
 * ordinary room placement.
 * When creating a vault, one tile with exit
 * directions must be connected to the exit of the vault. */
const RG = require('../src/rg');

const Vault = {};
Vault.tiles = {};

Vault.tiles.vault = [
`
name:vault_small_s
X=#
Y=#

#X###X#
#..?..#
Y.....#
#.....#
#.....#
Y.....#
###.###`,

`
name:vault_small_n
X=#
Y=#

#X#.#X#
Y.....#
#.....#
#.....#
Y.....#
#..?..#
#######`,

`
name:vault_small_e
X=#
Y=#

##X##X#
Y.....#
#.....#
#?.....
#.....#
Y.....#
#######`,

`
name:vault_small_w
X=#
Y=#

#X##X##
Y.....#
#.....#
.....?#
#.....#
Y.....#
#######`,

`
name:vault_medium_s
X=#
Y=#

#X...X#
Y.....#
#.....#
#.....#
#.....#
Y.....#
###.###`,

`
name:vault_medium_n
X=#
Y=#

#X###X#
#..?..#
Y.....#
#.....#
#.....#
Y..#..#
##...##`
];

Vault.tiles.corner = [
`
name:vault_nw_corner
X=#
Y=#

#X###X#
Y......
#......
#......
#......
Y......
#......`,

`
name:vault_ne_corner
X=#
Y=.

#X###X#
Y.....#
......#
......#
......#
Y.....#
......#`,

`
name:vault_sw_corner
X=.
Y=#

#X...X.
Y......
#......
#......
#......
Y......
###.###`,

`
name:vault_se_corner
X=.
Y=.

.X...X#
Y.....#
......#
......#
......#
Y.....#
#######`
];

Vault.tiles.wall = [
`
name:vault_n_wall
X=#
Y=.

#X###X#
Y......
.......
.......
.......
Y......
.......`,
`
name:vault_e_wall
X=.
Y=.

.X...X#
Y.....#
......#
......#
......#
Y.....#
......#`,
`
name:vault_w_wall
X=.
Y=#

#X...X.
Y......
#......
#......
#......
Y......
#......`,
`
name:vault_s_wall
X=.
Y=.

.X...X.
Y......
.......
.......
.......
Y......
##...##`
];

Vault.tiles.center = [
`
name:vault_center1
X=.
Y=.

.X...X.
Y......
.......
.......
.......
Y......
.......`,

`
name:vault_center2
X=.
Y=.

.X...X.
Y..#...
...#...
.#####.
...#...
Y..#...
.......`,
`
name:vault_center3
X=#
Y=#

.X...X.
Y..#..#
...#...
.#####.
...#...
Y..#..#
.#...#.`
];


Vault.func = {};

/* Creates a medium vault to the given location. If connecting tile is given,
* it's added below the vault. */
Vault.func.createMediumVault = (x, y, templLevel, connTile) => {
  const vaultN = templLevel.findTemplate({name: 'vault_medium_n'});
  const vaultS = templLevel.findTemplate({name: 'vault_medium_s'});

  templLevel.addRoom(vaultN, x, y);
  templLevel.addRoom(vaultS, x, y + 1);
  if (connTile) {
    templLevel.addRoom(connTile, x, y + 2);
  }
};

/* Creates a large vault to the given location. */
Vault.func.createLargeVault = (x, y, templLevel, connTile) => {
  const vaultNW = templLevel.findTemplate({name: 'vault_nw_corner'});
  const vaultNE = templLevel.findTemplate({name: 'vault_ne_corner'});
  const vaultSW = templLevel.findTemplate({name: 'vault_sw_corner'});
  const vaultSE = templLevel.findTemplate({name: 'vault_se_corner'});

  templLevel.addRoom(vaultNW, x, y);
  templLevel.addRoom(vaultNE, x + 1, y);
  templLevel.addRoom(vaultSW, x, y + 1);
  templLevel.addRoom(vaultSE, x + 1, y + 1);

  if (connTile) {
    templLevel.addRoom(connTile, x, y + 2);
  }

};

Vault.func.createHugeVault = (x, y, templLevel, centerName, connTile) => {
  // Add vault corners first
  const vaultNW = templLevel.findTemplate({name: 'vault_nw_corner'});
  const vaultNE = templLevel.findTemplate({name: 'vault_ne_corner'});
  const vaultSW = templLevel.findTemplate({name: 'vault_sw_corner'});
  const vaultSE = templLevel.findTemplate({name: 'vault_se_corner'});

  if (RG.isNullOrUndef([vaultNW, vaultNE, vaultSW, vaultSE])) {
      RG.err('Vault.func', 'createHugeVault',
          'Corner templates cannot be null. Check they are loaded');
  }
  console.log(x, y, vaultNW);

  templLevel.addRoom(vaultNW, x, y);
  templLevel.addRoom(vaultNE, x + 2, y);
  templLevel.addRoom(vaultSW, x, y + 2);
  templLevel.addRoom(vaultSE, x + 2, y + 2);

  // Vault center is picked using the given string
  const vaultCenter = templLevel.findTemplate({name: centerName});
  templLevel.addRoom(vaultCenter, x + 1, y + 1);

  // Finally, add vault walls
  const vaultWallN = templLevel.findTemplate({name: 'vault_n_wall'});
  const vaultWallE = templLevel.findTemplate({name: 'vault_e_wall'});
  const vaultWallW = templLevel.findTemplate({name: 'vault_w_wall'});
  const vaultWallS = templLevel.findTemplate({name: 'vault_s_wall'});

  templLevel.addRoom(vaultWallN, x + 1, y);
  templLevel.addRoom(vaultWallE, x + 2, y + 1);
  templLevel.addRoom(vaultWallW, x, y + 1);
  templLevel.addRoom(vaultWallS, x + 1, y + 2);

  if (connTile) {
    let tile = connTile;
    if (typeof connTile === 'string') {
        tile = templLevel.findTemplate({name: connTile});
    }
    templLevel.addRoom(tile, x + 1, y + 3);
  }

};

Vault.Models = {};

Vault.Models.default = []
    .concat(Vault.tiles.center)
    .concat(Vault.tiles.corner)
    .concat(Vault.tiles.wall)
    .concat(Vault.tiles.vault);

Vault.templates = {};
Vault.templates.all = Vault.Models.default.map(tile => (
    RG.Template.createTemplate(tile)
));
const transformed = RG.Template.transformList(Vault.templates.all);
Vault.templates.all = Vault.templates.all.concat(transformed);

module.exports = Vault;

