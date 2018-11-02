/* This file contains color variables which can be used in
 * actors, elements and items.
 */

const Colors = {};

// Colors.race must be defined as objects {fg: <color1>, bg: <color2>}.
// See scss/_colors.scss for list of allowed colors
Colors.race = {};
Colors.race.animal = {bg: 'Brown'};
Colors.race.avianfolk = {bg: 'GreenYellow'};
Colors.race.bearfolk = {bg: 'GreenYellow'};
Colors.race.catfolk = {bg: 'GreenYellow'};
Colors.race.dark = {bg: 'Brown'};
Colors.race.dogfolk = {bg: 'GreenYellow'};
Colors.race.dwarven = {fg: 'White', bg: 'Brown'};
Colors.race.goblin = {bg: 'GreenYellow'};
Colors.race.human = {bg: 'Brown'};
Colors.race.hyrkhian = {bg: 'Brown'};
Colors.race.hyrm = {bg: 'Brown'};
Colors.race.spirit = {bg: 'White'};
Colors.race.undead = {bg: 'Black'};
Colors.race.wildling = {bg: 'Brown'};
Colors.race.wolfclan = {bg: 'Brown'};

// Role colors must be defined as strings, and given to items/actors as
// 'color-fg': Colors.role.archer, for example
Colors.role = {};
Colors.role.archer = 'Yellow';
Colors.role.berserker = 'Pink';
Colors.role.commander = 'Yellow';
Colors.role.elite = 'Cyan';
Colors.role.fighter = 'Blue';
Colors.role.king = 'Red';
Colors.role.mage = 'Purple';
Colors.role.slinger = 'Purple';

module.exports = Colors;
