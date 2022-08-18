import * as React from 'react';
import RG from '../src/rg';
import PlayerStats from './player-stats';
import {VIEW_PLAYER, VIEW_MAP,
    STATUS_COMPS_GUI, TPlayerStatusGUI} from '../browser/game-manager';

type BrainPlayer = import('../src/brain').BrainPlayer;
type SentientActor = import('../src/actor').SentientActor;

interface IGameStatsProps {
  showMap: boolean;
  player: SentientActor;
  selectedItem?: any;
  selectedCell?: any;
  questDir: string;
  setViewType(type: number): void;
  toggleScreen(arg: any): void;
}


/* Component for displaying character stats.*/
export default class GameStats extends React.Component {

  public props: IGameStatsProps;

  constructor(props: IGameStatsProps) {
    super(props);
    this.changeMapView = this.changeMapView.bind(this);
  }

  public changeMapView() {
    if (this.props.showMap) {
      this.props.setViewType(VIEW_PLAYER);
    }
    else {
      this.props.setViewType(VIEW_MAP);
    }
  }

  public render() {
    const player = this.props.player;
    const playerName = player.getName();
    const selectedItem = this.props.selectedItem;
    const selectedCell = this.props.selectedCell;
    const brain = player.getBrain() as BrainPlayer;

    let selItemName = '';
    if (selectedItem) {
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
    if (brain.isRunModeEnabled()) {
      moveStatus += ' Running';
      moveClassName = 'text-danger';
    }
    else {
      moveStatus += ' Walking';
    }

    // Create HTML for showing fighting mode
    const fightMode = brain.getFightMode();
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

    let questDir = '';
    if (this.props.questDir) {
      questDir = this.props.questDir;
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

        {questDir !== '' &&
          <p>Quest: {questDir}</p>
        }
      </div>
    );
  }

  public toggleScreen(type: any) {
    this.props.toggleScreen(type);
  }

  public getPlayerStatus(player: SentientActor) {
    const stat: any = [];
    STATUS_COMPS_GUI.forEach((array: TPlayerStatusGUI) => {
        const [compName, style, text, key] = array;
        if (player.has(compName)) {
            stat.push(<p className={'text-' + style} key={key}>{text}</p>);
        }
    });
    return stat;
  }

}

