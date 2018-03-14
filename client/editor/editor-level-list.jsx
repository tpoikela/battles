
import React from 'react';
import PropTypes from 'prop-types';

/* This component is used to manage the game editor level list. */
export default class EditorLevelList extends React.Component {

  constructor(props) {
    super(props);
    this.deleteLevel = this.deleteLevel.bind(this);
  }

  render() {
    const gameEditorLevelList = this.getLevelList();
    return (
      <div className='list-group'>
        List of levels:
        {gameEditorLevelList}
      </div>
    );
  }

  /* Creates the LHS panel for browsing levels. */
  getLevelList() {
    const levelList = this.props.levelList.map((level, i) => {
      const selectLevel = this.selectLevel.bind(this, level, i);
      const className = this.props.levelIndex === i
        ? 'list-group-item list-group-item-info' : 'list-group-item';

      const nActors = level.getActors().length;
      const nActorsShow = nActors ? 'A:' + nActors : '';
      const nItems = level.getItems().length;
      const nItemsShow = nItems ? 'I:' + nItems : '';

      return (
        <a className={className}
          href='#'
          key={level.getID()}
          onClick={selectLevel}
        >
          L{level.getID()}:
          {level.getMap().cols}x{level.getMap().rows}|{nActorsShow}|
          {nItemsShow}
          <button
            className='btn-xs btn-danger pull-right'
            id={'btn-delete-level-' + i}
            onClick={this.deleteLevel}
          >X</button>
        </a>
      );
    });
    return levelList;
  }

  /* Called when a level is selected from level list. */
  selectLevel(level, i) {
    this.props.setShownLevel({level: level, levelIndex: i});
  }

  /* When delete X button is pressed, deletes the level. */
  deleteLevel(evt) {
    if (evt) {
      evt.stopPropagation();
    }

    const {id} = evt.target;
    let i = id.match(/(\d+)$/)[1];
    i = parseInt(id, 10);

    const levelList = this.props.levelList;
    levelList.splice(i, 1);
    const shownLevel = levelList.length > 0 ? levelList[0] : null;
    if (shownLevel === null) {
      this.props.setShownLevel({level: null, levelIndex: -1, levelList});
    }
    else {
      this.props.setShownLevel({level: shownLevel, levelIndex: 0, levelList});
    }
  }

}

EditorLevelList.propTypes = {
  levelList: PropTypes.array,
  levelIndex: PropTypes.number,
  setShownLevel: PropTypes.func.required
};

