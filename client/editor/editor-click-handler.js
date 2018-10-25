
/* Handles mouse click for Game editor. */

export default class EditorClickHandler {

    constructor(level) {
      this.level = level;

      this.funcTable = {
        removeActor: this.removeActor.bind(this),
        editActor: this.editActor.bind(this)
      };
    }

    handleClick(x, y, cell, cmd) {
      console.log('EditorClickHandler with cmd', cmd);
      if (this.funcTable[cmd]) {
        return this.funcTable[cmd](cell, x, y);
      }
      return false;
    }

    removeActor(cell, x, y) {
      return this.level.removeActor(cell.getActors()[0], x, y);
    }

    editActor(cell /* , x, y*/) {
      const actor = cell.getActors()[0];
      console.log('window.EDIT_ACTOR set. Use console to edit');
      window.EDIT_ACTOR = actor;
      return true;
    }
}
