
/* eslint max-len: 0 */

const Keys = require('../src/keymap.js');

const {GUI, KEY, getChar} = Keys;

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
Table below shows keyboard controls:

| key                       | Command description                               |
| ------                    | ------------------------------------------        |
| ,                         | Pick up an item.                                  |
| < or >                    | Use stairs/passage.                               |
| ${getChar(KEY.CHAT)}      | Chat with another actor.                          |
| ${getChar(GUI.Help)}      | Show/hide help.                                   |
| ${getChar(GUI.OWMap)}     | Show overworld map.                               |
| ${getChar(KEY.ORDER)}     | [Give an order to another actor.](#giving-orders) |
| ${getChar(KEY.FIGHT)}     | Change fight mode.                                |
| ${getChar(KEY.NEXT_ITEM)} | See next item in the cell.                        |
| ${getChar(GUI.Inv)}       | Show inventory.                                   |
| ${getChar(GUI.Look)}      | Look around.                                      |
| ${getChar(GUI.Map)}       | Toggle the map or player view.                    |
| ${getChar(KEY.NEXT)}      | Next target (target-look).                        |
| ${getChar(KEY.DOOR)}      | Open or close door.                               |
| ${getChar(KEY.POWER)}     | [Use your powers.](#casting-spells)               |
| ${getChar(KEY.RUN)}       | Toggle run mode (1.5 x speed).                    |
| ${getChar(KEY.REST)}      | Rest (takes less energy than moving).             |
| ${getChar(KEY.TARGET)}    | [Target/fire](#firing-missiles)                   |
| ${getChar(GUI.Use)}       | [Use an item.](#using-items)                      |
`;

//------------------------------
// Full manual start here
// Translated to HTML via marked
//-------------------------------

const fullManualMarkdown = `
Battles manual
==============

This a short manual accompanying Battles game. It should get you started with
controls and basic commands of the game.

At the moment, you need both mouse and keyboard to play the game. While all the
ASCII-based menus are clickable by mouse, you need keyboard to open some of the
menus. Also, the Inventory menu cannot be used with keyboard at the moment.
These limitations will be addressed in the future development.

About the Game
--------------

Battles is an RPG/roguelike-game in a northern setting. You control a single
actor and interact with NPCs in the world. The game consists of an overworld
and numerous smaller zones (dungeons, mountains, crypts, fortresses, caves),
which are scattered around the overworld. There are also settlements such as
villages and cities, which are less hostile than previously mentioned
zones.

Mouse controls
--------------

You can move to an explored cell (not necessarily visible) by left-clicking that
cell. If an enemy is seen before, the movement will stop.

Right-clicking a cell will bring up a context menu, from which you can choose an
available action.

Key controls
------------

${keyControls}

Alternatively, you can use the numpad keys to move.

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

Giving orders
-------------

In some situations, it is possible to give commands to other actors. Use
${getChar(KEY.ORDER)} to give an order. The game will ask you to select a
target. You can used the [Movement keys](#movement) to select a target by
pressing ${getChar(KEY.SELECT)} over desired target,
or press ${getChar(KEY.SELECT_ALL)} to choose all valid targets.

After the selection, you will get a list of possible commands. Choose one
with the keyboard or using the mouse.

Game settings
-------------

TODO

Importing plugins
-----------------

TODO

`; // END OF MANUAL //

Manual.fullText = marked(fullManualMarkdown);
module.exports = Manual;
