
/* eslint max-len: 0 */
/* This file contains the manual for Battles in the North. The manual is written
* as markdown and translated (dynamically) using marked. */

const Keys = require('../src/keymap.js');
const marked = require('marked');

const {GUI, KEY, getChar} = Keys;
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
| ${getChar(GUI.OwMap)}     | Show overworld map.                               |
| ${getChar(KEY.ORDER)}     | [Give an order to another actor.](#giving-orders) |
| ${getChar(KEY.FIGHT)}     | Change fight mode.                                |
| ${getChar(KEY.JUMP)}      | Jump to given a direction.                        |
| ${getChar(KEY.NEXT_ITEM)} | See next item in the cell.                        |
| ${getChar(GUI.Inv)}       | Show inventory.                                   |
| ${getChar(GUI.Look)}      | Look around.                                      |
| ${getChar(GUI.Map)}       | Toggle the map or player view.                    |
| ${getChar(KEY.MARK)}      | Add a location marker for quick travel.           |
| ${getChar(KEY.GOTO)}      | Open a location list for quick travel.            |
| ${getChar(KEY.NEXT)}      | Next target (target-look).                        |
| ${getChar(KEY.DOOR)}      | Open or close door.                               |
| ${getChar(KEY.POWER)}     | [Use your powers.](#casting-spells)               |
| ${getChar(KEY.RUN)}       | Toggle run mode (1.5 x speed).                    |
| ${getChar(KEY.REST)}      | Rest (takes less energy than moving).             |
| ${getChar(KEY.TARGET)}    | [Target/fire](#firing-missiles)                   |
| ${getChar(GUI.Use)}       | [Use an item.](#using-items)                      |
| ${getChar(KEY.ABILITY)}   | [Use an ability.](#abilities)                     |
`;

//------------------------------
// Full manual start here
// Translated to HTML via marked
//-------------------------------

const fullManualMarkdown = `
Battles manual
==============

This is a short manual accompanying Battles game. It should get you started with
controls and basic commands of the game.

At the moment, you need both mouse and keyboard to play the game. While all the
ASCII-based menus are clickable by mouse, you need keyboard to open some of the
menus. Also, the Inventory menu cannot be used with keyboard at the moment.
These limitations will be addressed in the future versions of the game.

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
cell. If an enemy is seen before that cell is reached, the movement will stop.

Right-clicking a cell will bring up a context menu, from which you can choose an
available action.

Key controls
------------

${keyControls}

Alternatively, you can use the numpad keys to move.

Movement
--------

${moveTable}

Attacking
---------

Attacking other actors using melee attacks can be done by bumping into adjacent
actors. If the actor is not hostile, the game will ask you to confirm the
action.

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

Press ${getChar(KEY.POWER)} to view a list of spells. Press corresponding key to
cast that spell or any other key to quit. Some spells require giving a direction
or choosing an adjacent cell.

Using items
-----------

There are 2 ways to use items:

  1. When you enter inventory, you can use the items on yourself only.
  2. If you want to use item on something else, you can do the following:
    * Open inventory and select an item.
    * Close inventory and press ${getChar(KEY.USE)}.
    * Select direction for using.

Abilities
---------

Abilities do not consume any power points.

If the actor has any abilities, they can be activated using ${getChar(KEY.ABILITY)}.
Pressing the key will open an ability menu from which an ability can be chosen.
Depending on the ability, further input such as direction to use the ability, may
be requested.

Giving orders
-------------

In some situations, it is possible to give commands to other actors. Use
${getChar(KEY.ORDER)} to give an order. The game will ask you to select a
target. You can used the [Movement keys](#movement) to select a target by
pressing ${getChar(KEY.SELECT)} over desired target,
or press ${getChar(KEY.SELECT_ALL)} to choose all valid targets.

After the selection, you will get a list of possible commands. Choose one
with the keyboard or using the mouse.

Using marks for movement
------------------------

To reduce the amount of backtracking in large levels, the game will automatically mark the 
enter/exit locations for each level. To place a mark to any other location, you can press
${getChar(KEY.MARK)}. This mark will be added to the mark list of the current level.

By pressing ${getChar(KEY.GOTO)}, you can open a mark list for the current level you are in.
By selecting one of the marks from the list, the actor tries to navigate to that location. If
any hostile actors or dangers are encountered, the navigation is immediately stopped. At the
moment you have to open the mark list again and choose a location.

Game settings
-------------

TODO

Importing plugins
-----------------

TODO

`; // END OF MANUAL //

Manual.fullText = marked(fullManualMarkdown);
module.exports = Manual;
