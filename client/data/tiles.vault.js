
/* Generic tiles for building vaults inside levels. Note that vaults don't have
 * their exit directions specified. This guarantees they are excluded from
 * ordinary room placement.
 * When creating a vault, one tile with exit
 * directions must be connected to the exit of the vault. */

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

Vault.func = {};

/* Creates a medium vault to the given location. */
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

module.exports = Vault;

