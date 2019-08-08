/* To generate dungeon-like levels. Best genParam value
 * seems to be X=3,Y=3
 */

import {Template, verifyTiles} from '../src/template';

export const Tiles3x3: any = {
    tiles: {},
    templates: {},
    Models: {}
};


Tiles3x3.tiles.basic = [

`
dir:NSEW
name:tile3x3_cross_floor
X=.
Y=.
W=#
Z=#

#XW
Y..
Z.#`,

`
dir:NSEW
name:tile3x3_hall_1
X=.
Y=.
W=.
Z=.

.XW
Y..
Z..`,

`
dir:NSEW
name:tile3x3_hall_center_wall
X=.
Y=.
W=.
Z=.

.XW
Y#.
Z..`,

`
dir:NSEW
name:tile3x3_hall_center_wall_genx
X=.
Y=.
W=.
Z=.

.XW
Y#.
Z..`,

`
dir:NSEW
name:tile3x3_hall_center_wall_genxy
X=.
Y=.
W=.
Z=.

.WX
Z#.
Y..`,

`
dir:NSEW
name:tile3x3_hall_center_wall_geny
X=.
Y=.
W=.
Z=.

.XW
Z#.
Y..`,

`
dir:NSEW
name:tile3x3_diag3
X=.
Y=.
W=.
Z=.

#XW
Y#.
Z.#`,

`
dir:NSEW
name:tile3x3_diag_2
X=.
Y=.
W=.
Z=.

#XW
Y#.
Z..`,

`
dir:NSEW
name:tile3x3_diag_2b
X=.
Y=.
W=.
Z=.

.XW
Y#.
Z.#`,

`
dir:NSEW
name:tiles3x3_X
X=.
Y=.
W=#
Z=#

#XW
Y#.
Z.#`,

`
dir:NSW
name:tile3x3_corridor_T
X=.
Y=.
W=#
Z=#

#XW
Y.#
Z.#`,

`
dir:S
name:tile3x3_term
X=#
Y=#
W=#
Z=#

#XW
Y?#
Z.#`,

`
dir:NS
name:tile3x3_corr_2way
X=.
Y=#
W=#
Z=#

#XW
Y.#
Z.#`,

`
dir:NW
name:tile3x3_corner
X=.
Y=.
W=#
Z=#

#XW
Y.#
Z##`,

`
dir:NEW
name:tile3x3_walls_T
X=.
Y=.
W=.
Z=#

.XW
Y#.
Z##`,

`
dir:NE
name:test_3x3_L
X=.
Y=#
W=.
Z=#

#XW
Y..
Z##`,

];

Tiles3x3.tiles.filler =
`
name:FILLER
X=#
Y=#
W=#
Z=#

#XW
Y##
Z##`
;

Tiles3x3.tiles.vault = [
`
dir:NEW
name:tile3x3_vault_exit
X=.
Y=.
W=.
Z=#

.XW
Y..
Z+#`,

`
dir:NW
name:tile3x3_vault_corner
X=.
Y=#
W=#
Z=#

.XW
Y.#
Z##`,

`
dir:NW
name:tile3x3_vault_corner2
X=.
Y=.
W=#
Z=#

.XW
Y.#
Z##`,

`
dir:NSEW
name:tile3x3_vault_center
X=.
Y=.
W=.
Z=.

.XW
Y..
Z..`,

];

Tiles3x3.Models.default = []
    .concat(Tiles3x3.tiles.basic);

Tiles3x3.Models.vault = []
    .concat(Tiles3x3.tiles.vault);

Tiles3x3.templates.all = Tiles3x3.Models.default.map(tile => (
    Template.createTemplate(tile)
));

Tiles3x3.templates.vault = Tiles3x3.Models.vault.map(tile => (
    Template.createTemplate(tile)
));

let transformed = Template.transformList(Tiles3x3.templates.all);
Tiles3x3.templates.all = Tiles3x3.templates.all.concat(transformed);

transformed = Template.transformList(Tiles3x3.templates.vault);
Tiles3x3.templates.vault = Tiles3x3.templates.vault.concat(transformed);

verifyTiles('tiles.diag.ts', 'Tiles3x3.templates.all',
    Tiles3x3.templates.all);
