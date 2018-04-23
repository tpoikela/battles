
const Keys = require('../src/keymap.js');

const {KEY, getChar} = Keys;

const marked = require('marked');

const Manual = {};

const moveTable = `
<p>To move around, use:</p>
<table className='table table-large mov-buttons-table'>
  <thead />
  <tbody>
    <tr>
      <td>${'\u2B09'} q</td>
      <td>${'\u2B06'} w</td>
      <td>${'\u2B08'} e</td>
    </tr>
    <tr>
      <td>${'\u2B05'} a</td>
      <td>Rest: s</td>
      <td>${'\u27A1'} d</td>
    </tr>
    <tr>
      <td>${'\u2B0B'} z</td>
      <td>${'\u2B07'} x</td>
      <td>${'\u2B0A'} c</td>
    </tr>
  </tbody>
</table>
`;

const keyControls = `
Use ${getChar(KEY.CHAT)} for chatting.
Use ${getChar(KEY.DOOR)} for opening the door.

Table below shows some controls:

| key    | Command description                        |
| ------ | ------------------------------------------ |
| ,      | Pick up an item.                           |
| < or > | Use stairs/passage.                        |
| H      | Show/hide help.                            |
| M      | Show overworld map.                        |
| f      | Change fight mode.                         |
| h      | See next item in the cell.                 |
| i      | Show inventory.                            |
| l      | Look around.                               |
| m      | Toggle the map or player view.             |
| n      | Next target (target-look).                 |
| o      | Open or close door.                        |
| p      | Use your powers.                           |
| r      | Toggle run mode (1.5 x speed).             |
| s      | Rest (takes less energy than moving).      |
| t      | Enter targeting mode. Press again to fire. |
| u      | Use an item.                               |
`;

//------------------------------
// Full manual start here
// Translated to HTML via marked
//-------------------------------

const fullManualMarkdown = `
Battles manual
==============

This a test to check if the manual works.

Mouse controls
--------------

You can move to an explored cell (not necessarily visible) by left-clicking that
cell. If an enemy is seen before, the movement will stop.

Right-clicking a cell will bring up a context menu, from which you can choose an
available action.

Key controls
------------

${keyControls}

Movement
--------

${moveTable}

Firing missiles
---------------

First, you need to have a missile or ammo + missile weapon equipped. Then, press
${getChar(KEY.TARGET)} to select a target. You can switch between targets using
next key ${getChar(KEY.NEXT)} or previous key ${getChar(KEY.PREV)}. If the
target
is red, it is out of range. If it's yellow, then press ${getChar(KEY.TARGET)}
again to fire.

Casting spells
---------------

Press ${getChar(KEY.POWER)} to view list of spells. Press corresponding key to
cast that spell or any other key to quit.

Using items
-----------

There are 2 ways to use items:

  1. When you enter inventory, you can use the items on yourself only.
  2. If you want to use item on something else, you can do the following:
    * Open inventory and select an item.
    * Close inventory and press ${getChar(KEY.USE)}.
    * Select direction for using.

`;

Manual.fullText = marked(fullManualMarkdown);
// Manual.moveTable = moveTable;

module.exports = Manual;
