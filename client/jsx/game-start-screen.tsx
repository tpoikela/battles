
import * as React from 'react';
import ModalHeader from './modal-header';
import DropdownSelect from './dropdown-select';

interface IGameStartScreenProps {
  deleteGame(): void;
  loadFromEditor: boolean;
  loadGame(): void;
  newGame(): void;
  playerName: string;
  progress: string;
  savedPlayerList: any;
  seedName: string;
  selectGame(): void;
  selectedGame: string;
  setPlayMode(): void;
  setPlayerClass(): void;
  setPlayerLevel(): void;
  setPlayerName(): void;
  setPlayerRace(): void;
  setSeedName(): void;
  settings: any;
  showLoadScreen: boolean;
  showStartScreen: boolean;
  toggleEditor(): void;
  toggleScreen(): void;
}


const RG = require('../src/rg');
const Modal = require('react-bootstrap-modal');
const Texts = require('../data/texts');

const config = require('../../public/config.js');

/* Component for the game startup screen Prints game title and gives some
 * customisation options for the game.
 */
export default class GameStartScreen extends React.Component {

    public props: IGameStartScreenProps;

  constructor(props: IGameStartScreenProps) {
    super(props);

    this.onNameChange = this.onNameChange.bind(this);
    this.deleteGame = this.deleteGame.bind(this);
    this.selectGame = this.selectGame.bind(this);
    this.loadGame = this.loadGame.bind(this);
    this.onSeedChange = this.onSeedChange.bind(this);
  }

  onNameChange(evt) {
    var name = evt.target.value;
    evt.stopPropagation();
    this.props.setPlayerName(name);
  }

  onSeedChange(evt) {
    var name = evt.target.value;
    evt.stopPropagation();
    this.props.setSeedName(name);
  }

  /* Loads a saved game.*/
  loadGame() {
    this.props.loadGame(this.props.selectedGame);
  }

  deleteGame() {
    this.props.deleteGame(this.props.selectedGame);
  }

  selectGame(name) {
    this.props.selectGame(name);
  }

  render() {
    const setPlayerLevel = this.props.setPlayerLevel;
    const setPlayMode = this.props.setPlayMode;

    const savedPlayerList = this.props.savedPlayerList;
    var playerListHTML = savedPlayerList.map( (val, index) => {
      return (
        <div
          className='player-list-item' key={index}
          onClick={this.selectGame.bind(this, val.name)}
        >
          Name: {val.name}, L: {val.expLevel} DL: {val.dungeonLevel}
        </div>);
    });

    const newGame = this.props.newGame;
    const titleTextLoad = RG.gameTitle + ' Load a game';

    let progressElem = null;
    if (this.props.progress) {
        progressElem = (<div>
            <p className='text-info'>{this.props.progress}</p>
        </div>);
    }
    if (this.props.loadFromEditor) {
      progressElem = (<div>
        <p className='text-warning'>Using Editor data for the Game</p>
      </div>);
    }
    return (
      <div id='game-start-screen'>

        {this.props.showLoadScreen &&
        <Modal
          aria-labelledby={'game-load-modal-label'}
          id='gameLoadModal'
          large={true}
          onHide={this.toggleScreen.bind(this, 'LoadScreen')}
          show={this.props.showLoadScreen}
        >
          <ModalHeader
            id='game-load-modal-label'
            text={titleTextLoad}
          />

          <div className='modal-body row'>
            {playerListHTML}
            <p>Selected game: {this.props.selectedGame}</p>
          </div>
          <div className='modal-footer row'>
            <div className='col-md-6'>
              <button
                className='btn btn-secondary btn-warning'
                data-dismiss='modal'
                onClick={this.loadGame}
                type='button'
              >
                Load
              </button>
              <button
                className='btn btn-secondary btn-danger'
                onClick={this.deleteGame}
                type='button'
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
        }

      {this.props.showStartScreen &&
      <Modal
        aria-labelledby={'game-start-modal-label'}
        id='gameStartModal'
        large={true}
        onHide={this.toggleScreen.bind(this, 'StartScreen')}
        show={this.props.showStartScreen}
      >
        <Modal.Header closeButton={true}>
          <Modal.Title
            id='game-start-modal-label'
          >{RG.gameTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        <div className='row'>
          <div className='col-md-6' id='prologue-box'>

            <p> {Texts.intro.chapter1} </p>
            <p> {Texts.intro.chapter2} </p>

            <label>You'll be forgotten as:
              <input
                onChange={this.onNameChange}
                type='text'
                value={this.props.playerName}
              />
            </label>
            <label>You can enter a seed here (optional):
                <input
                    onChange={this.onSeedChange}
                    type='text'
                    value={this.props.seedName}
                />
            </label>

          </div>

          <div className='col-md-6' id='game-options-box' >
            <p>Game settings</p>

            <div className='dropdown-select-div'>
              <DropdownSelect
                callback={setPlayerLevel}
                currValue={this.props.settings.playerLevel}
                options={['Weak', 'Medium', 'Strong', 'Inhuman']}
                titleName='Player'
              />
              <DropdownSelect
                callback={this.props.setPlayerClass}
                currValue={this.props.settings.playerClass}
                options={RG.ACTOR_CLASSES}
                titleName='Player class'
              />
              <DropdownSelect
                callback={this.props.setPlayerRace}
                currValue={this.props.settings.playerRace}
                options={RG.ACTOR_RACES}
                titleName='Player race'
              />
            </div>

            <div className='dropdown-select-div'>
              <DropdownSelect
                callback={setPlayMode}
                currValue={this.props.settings.playMode}
                id='dropdown-select-playmode'
                options={['OverWorld', 'Arena']}
                titleName='Play mode'
              />
            </div>

            {progressElem}

          </div>
          </div>
        </Modal.Body>

        <div className='modal-footer row'>
          <div className='col-md-6'>
            {config.isDevel &&
            <button
              className='btn btn-primary'
              data-dismiss='modal'
              onClick={this.props.toggleEditor}
              type='button'
            >Editor</button>
            }
            <button
              className='btn btn-success'
              data-dismiss='modal'
              id='embark-button'
              onClick={newGame}
              type='button'
            >Embark!</button>
            <button
              className='btn btn-secondary btn-warning'
              data-dismiss='modal'
              onClick={this.toggleScreen.bind(this, 'LoadScreen')}
              type='button'
            >
              Load
            </button>

          </div>
        </div>
      </Modal>
      }

    </div>
    );
  }

  toggleScreen(type) {
    this.props.toggleScreen(type);
  }

}

