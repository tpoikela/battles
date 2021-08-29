
/* eslint max-len: 0 */
/* This file contains the manual for Battles in the North. The manual is written
* inside a js template string using markdown, and translated (dynamically) using marked.
* Advantage of using js is that we can import any game data we need, and it will
* be automatically updated in the manual. */

import {Keys} from '../src/keymap';
import marked = require('marked');
import {ELEV} from './elements';

const {GUI, KEY, getChar} = Keys;
export const Manual: any = {};

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
| ${getChar(KEY.READ)}      | Read something from the current cell.             |
| ${getChar(KEY.RUN)}       | Toggle run mode (1.5 x speed).                    |
| ${getChar(KEY.REST)}      | Rest (takes less energy than moving).             |
| ${getChar(KEY.TARGET)}    | [Target/fire](#firing-missiles)                   |
| ${getChar(GUI.Use)}       | [Use an item.](#using-items)                      |
| ${getChar(KEY.ABILITY)}   | [Use an ability.](#abilities)                     |
| ${getChar(GUI.Shop)}      | [Open a shop menu (when inside shop)](#shops)     |
| ${getChar(GUI.Craft)}     | [Open a crafting menu ](#crafting)                |
`;

//------------------------------
// Full manual start here
// Translated to HTML via marked
//-------------------------------

const fullManualMarkdown = `
Battles in the North manual
===========================

This is a short manual accompanying Battles in the North (hereafter Battles) game.
It should get you started with controls and basic commands of the game. Use your
browser's Find (typical Control/Cmd-F)
to search anything in this manual.

At the moment, you need both the mouse and keyboard to play the game. While all the
ASCII-based menus are also clickable by mouse, you need keyboard to open some of the
menus. Also, the Inventory/Shop/Crafting menus cannot be used with keyboard at the moment.
These limitations will be addressed in the future versions of the game.

<!-- toc -->

About the Game
--------------

Battles is an open-world RPG/roguelike-game in a northern setting. You control
a single actor and interact with NPCs in the world. The game consists of an overworld
and numerous smaller zones (dungeons, mountains, crypts, fortresses, caves),
which are scattered around the overworld. There are also settlements such as
villages and cities, which are less hostile than previously mentioned
zones.

Mouse controls
--------------

You can move to an already explored cell (non-black, but not necessarily visible) by
left-clicking that cell. If an enemy is seen before the cell is reached,
the movement will stop automatically.

If the cell has an item, the top item will be picked up automatically when
left-clicking. If the cell has a hostile actor, left-clicking it will automatically
perform a melee attack.

Right-clicking a cell will bring up a context menu, from which you can choose an
available action.

Key controls
------------

${keyControls}

Alternatively, you can use the numpad keys to move around.

Movement
--------

${moveTable}

Alternatively, you can use the numpad keys to move around.

| Terrain            | ASCII symbol | Z        |
| ------------------ | -----------  | -------- |
| ground/floor (any) | .            | 0        |
| cliff              | ${ELEV[0]}   | 1        |
| stone              | ${ELEV[1]}   | 2        |
| steep cliff        | ${ELEV[2]}   | 3        |


In Battles, terrain affects the movement heavily. Currently, there are 3 heights of
elevation above sea-level, and 3 depths for water. When climbing above the sea level,
it is possible to only move between two adjacent height levels. In the table below,
you can only move between terrain that is in two adjacent rows:


Attacking
---------

Attacking other actors using melee attacks can be done by bumping into adjacent
actors. If the actor is not hostile, the game will ask you to confirm the
action.

An exception is melee attack with range of 2 or more. Currently, these must be
performed by right-clicking the target with mouse and choosing attack. For example,
a whip can be used to attack enemies within range of two.

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
    * Close inventory and press ${getChar(Keys.GUI.Use)}.
    * Select direction for using.

Abilities
---------

Abilities do not consume any power points. They may have features such as a
cooldown period, during which that ability cannot be used.

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
By selecting one of the marks from the list, the actor tries to navigate to that location
automatically. If
any hostile actors or dangers are encountered, the navigation is immediately stopped. At the
moment you have to open the mark list again and choose a location again to proceed after
stopping.

Reading books
-------------

Books can be read by pressing ${getChar(KEY.READ)} while there is something to read in
the same cell as the player. If they are in inventory, they can be read by using the
books simply with Use command.

Game settings
-------------

TODO

Importing plugins
-----------------

Battles supports importing and using custom plugins. To load a plugin:
  1. Close the starting menu (if shown)
  2. Open Plugin menu from the top menu. Select Plugin manager
  3. Tick the box below. Now you can load the plugins
  4. Choose from the top menu Plugin->Load script.
  5. Navigate to a valid plugin file and open it. It should appear in Plugin
     manager now.
  6.

For plugin developers, see the ./plugin-examples/README.md distributed with the
game source code.
`; // END OF MANUAL //

const renderer = new marked.Renderer();
const toc = []; // your table of contents as a list.
const tocMd = []; // ToC as markdown

renderer.heading = function(text: string, level): string {
  const slug = text.toLowerCase().replace(/[^\w]+/g, '-');
  toc.push({
    level, slug,
    title: text
  });
  if (level > 1) {
      if (level === 2) {
          tocMd.push(`- [${text}](#${slug})`);
      }
      else if (level === 3) {
          tocMd.push(`  - [${text}](#${slug})`);
      }
      else {
          tocMd.push(`    - [${text}](#${slug})`);
      }
  }
  return `<h${level} id="${slug}"><a href="#${slug}" class="anchor"></a>${text}</h${level}>`;
};

const convertMarkdown = function(text: string): string {
    return marked(text, {renderer});
};

Manual.fullText = convertMarkdown(fullManualMarkdown);
const mdWithToC = fullManualMarkdown.replace('<!-- toc -->', tocMd.join('\n'));
Manual.fullText = convertMarkdown(mdWithToC);

