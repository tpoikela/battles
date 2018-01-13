import React, {Component} from 'react';
import PropTypes from 'prop-types';
import PlayerStats from './player-stats';

const RG = require('../src/rg.js');

/** Component for displaying character stats.*/
export default class GameStats extends Component {

  constructor(props) {
    super(props);
    this.changeMapView = this.changeMapView.bind(this);
  }

  changeMapView() {
    if (this.props.showMap) {
      this.props.setViewType('player');
    }
    else {
      this.props.setViewType('map');
    }
  }

  render() {
    const player = this.props.player;
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
          data-target='#inventoryModal'
          data-toggle='modal'
          id='inventory-button'
        >
          Inventory
        </button>
        <button
          className='btn btn-xs btn-rg btn-info'
          data-target='#char-info-modal'
          data-toggle='modal'
          id='stats-button'
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
          data-target='#gameOverWorldMapModal'
          data-toggle='modal'
          id='show-overworld-button'
        >
          Overworld
        </button>
      </div>
    );
  }

  getPlayerStatus(player) {
    var stat = [];
    if (player.has('Poison')) {
      stat.push(<p key='stat-poison' className='text-danger'>Poisoned</p>);
    }
    if (player.has('Stun')) {
      stat.push(<p key='stat-stun' className='text-danger'>Stunned</p>);
    }
    if (player.has('Ethereal')) {
      stat.push(<p key='stat-ethereal' className='text-info'>Ethereal</p>);
    }
    if (player.has('PowerDrain')) {
      stat.push(<p key='stat-power-drain' className='text-success'>Power drain</p>);
    }
    return stat;
  }


}

GameStats.propTypes = {
  showMap: PropTypes.bool.isRequired,
  player: PropTypes.object.isRequired,
  selectedItem: PropTypes.object,
  setViewType: PropTypes.func.isRequired,
  selectedCell: PropTypes.object
};

