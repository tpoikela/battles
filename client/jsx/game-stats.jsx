import React, {Component} from 'react';
import PropTypes from 'prop-types';
import PlayerStats from './player-stats';

const RG = require('../src/rg.js');

export const VIEW_MAP = 0;
export const VIEW_PLAYER = 1;

// Different player status can be defined here
const statusComps = [
    // Comp name, style   , text  , react-key
    ['Coldness', 'primary', 'Cold', 'stat-coldness'],
    ['Ethereal', 'info', 'Ethereal', 'stat-ethereal'],
    ['Flying', 'primary', 'Flying', 'stat-flying'],
    ['Paralysis', 'danger', 'Paralysed', 'stat-paralysis'],
    ['Poison', 'danger', 'Poisoned', 'stat-poison'],
    ['PowerDrain', 'success', 'Power drain', 'stat-power-drain'],
    ['Stun', 'danger', 'Stunned', 'stat-stun'],
    ['MindControl', 'danger', 'Mind controlled', 'stat-mind-ctrl']
];

/** Component for displaying character stats.*/
export default class GameStats extends Component {

  constructor(props) {
    super(props);
    this.changeMapView = this.changeMapView.bind(this);
  }

  changeMapView() {
    if (this.props.showMap) {
      this.props.setViewType(VIEW_PLAYER);
    }
    else {
      this.props.setViewType(VIEW_MAP);
    }
  }

  render() {
    const player = this.props.player;
    const playerName = player.getName();
    const selectedItem = this.props.selectedItem;
    const selectedCell = this.props.selectedCell;

    let selItemName = '';
    if (selectedItem !== null) {
      selItemName = 'Selected: ' + selectedItem.getName();
    }

    let selCellDescr = '';
    if (selectedCell) {
      if (selectedCell.hasActors()) {
        const actorName = selectedCell.getProp('actors')[0].getName();
        selCellDescr = 'Cell: ' + actorName;
      }
    }
    // Create HTML for showing movement mode
    let moveStatus = 'Move: ';
    let moveClassName = 'text-info';
    if (player.getBrain().isRunModeEnabled()) {
      moveStatus += ' Running';
      moveClassName = 'text-danger';
    }
    else {
      moveStatus += ' Walking';
    }

    // Create HTML for showing fighting mode
    const fightMode = player.getBrain().getFightMode();
    let fightModeStatus = 'Fight: ';
    if (fightMode === RG.FMODE_NORMAL) {fightModeStatus += 'Normal';}
    else if (fightMode === RG.FMODE_SLOW) {fightModeStatus += 'Slow';}
    else if (fightMode === RG.FMODE_FAST) {fightModeStatus += 'Fast';}

    // Other status like poisoning, stun, cold, etc.
    const otherStatus = this.getPlayerStatus(player);

    let mapButtonText = 'Map View';
    if (this.props.showMap) {
      mapButtonText = 'Player View';
    }

    return (
      <div className='game-stats'>
        <p>{playerName}</p>
        <PlayerStats player={player} />
        <ul className='player-mode-list'>
          <li className={moveClassName}>{moveStatus}</li>
          <li className='text-primary'>{fightModeStatus}</li>
          <li className='text-warning'>{selItemName}</li>
          <li className='text-danger'>{selCellDescr}</li>
        </ul>
        {otherStatus}

        <button
          className='btn btn-xs btn-rg btn-info'
          id='inventory-button'
          onClick={this.toggleScreen.bind(this, 'Inventory')}
        >
          Inventory
        </button>

        <button
          className='btn btn-xs btn-rg btn-info'
          id='stats-button'
          onClick={this.toggleScreen.bind(this, 'CharInfo')}
        >
          CharInfo
        </button>
        <button
          className='btn btn-xs btn-rg btn-info'
          id='map-player-button'
          onClick={this.changeMapView}
        >
          {mapButtonText}
        </button>
        <button
          className='btn btn-xs btn-rg btn-info'
          id='show-overworld-button'
          onClick={this.toggleScreen.bind(this, 'OWMap')}
        >
          Overworld
        </button>
      </div>
    );
  }

  toggleScreen(type) {
    this.props.toggleScreen(type);
  }

  getPlayerStatus(player) {
    const stat = [];
    statusComps.forEach(array => {
        const [compName, style, text, key] = array;
      if (player.has(compName)) {
        stat.push(<p className={'text-' + style} key={key}>{text}</p>);
      }
    });
    return stat;
  }

}

GameStats.propTypes = {
  showMap: PropTypes.bool.isRequired,
  player: PropTypes.object.isRequired,
  selectedItem: PropTypes.object,
  setViewType: PropTypes.func.isRequired,
  selectedCell: PropTypes.object,
  toggleScreen: PropTypes.func.isRequired
};

