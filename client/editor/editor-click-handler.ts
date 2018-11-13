
import {Cell} from '../src/map.cell';
import {Level} from '../src/level';
/* Handles mouse click for Game editor. */

type HandleFunc = (cell: Cell, x, y) => boolean;

export default class EditorClickHandler {

    public level: Level;
    public funcTable: {[key: string]: HandleFunc};

    constructor(level) {
      this.level = level;

      this.funcTable = {
        removeActor: this.removeActor.bind(this),
        editActor: this.editActor.bind(this)
      };
    }

    public handleClick(x, y, cell, cmd) {
      console.log('EditorClickHandler with cmd', cmd);
      if (this.funcTable[cmd]) {
        return this.funcTable[cmd](cell, x, y);
      }
      return false;
    }

    public removeActor(cell, x, y): boolean {
      return this.level.removeActor(cell.getActors()[0]);
    }

    public editActor(cell /* , x, y*/): boolean {
      const actor = cell.getActors()[0];
      console.log('window.EDIT_ACTOR set. Use console to edit');
      (window as any).EDIT_ACTOR = actor;
      return true;
    }
}
