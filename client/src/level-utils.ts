
import {Level} from './level';
import {CellMap} from './map';
import {ELEM} from '../data/elem-constants';
import {Geometry} from './geometry';

/* Contains utility functions to manipulate Level objects. */
export const LevelUtils: any = {};

/* Wraps given array of levels into new super level and returns it. */
LevelUtils.wrapAsLevel = function(levels: Level[], conf): null | Level {
  const maxCallback = (acc, curr) => Math.max(acc, curr);
  const levelCols = levels.map(l => l.getMap().cols);
  const levelRows = levels.map(l => l.getMap().rows);
  let map: null | CellMap = null;
  let level: null | Level = null;

  const baseElem = conf.baseElem || ELEM.FLOOR;
  if (conf.centerY) {
    const rowsMax = levelRows.reduce(maxCallback);
    const colsTotal = levelCols.reduce((sum, value) => sum + value, 0);
    map = new CellMap(colsTotal, rowsMax, baseElem);
    level = new Level(map);
    Geometry.tileLevels(level, levels, {centerY: true, x: 0, y: 0});
  }
  else if (conf.centerX) {
    const rowsTotal = levelRows.reduce((sum, value) => sum + value, 0);
    const colsMax = levelCols.reduce(maxCallback);
    map = new CellMap(colsMax, rowsTotal, baseElem);
    level = new Level(map);
    Geometry.tileLevels(level, levels, {centerX: true, x: 0, y: 0});
  }
  return level;
};
