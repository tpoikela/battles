
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ModalHeader from './modal-header';
import DropdownSelect from './dropdown-select';

const RG = require('../src/rg.js');
const Modal = require('react-bootstrap-modal');

const config = require('../../public/config.js');

/** Component for the game startup screen Prints game title and gives some
 * customisation options for the game.
 */
export default class GameStartScreen extends Component {

  constructor(props) {
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
    const setLoot = this.props.setLoot;
    const setMonsters = this.props.setMonsters;
    const setLevelSize = this.props.setLevelSize;
    const setPlayerLevel = this.props.setPlayerLevel;
    const setGameLength = this.props.setGameLength;
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

            <p>
              Welcome to the wintry realms!
              Winds are ever-blowing. Blowing off the
              glaciers.
              Are you ready to face the challenges of the
              icy north? Hunger, coldness, ravenous
              beasts, glacial chasms and forthcoming
              eternal winter are waiting for you in the
              darkness.
            </p>

            <p>
              You have come a long way from your homelands
              seeking
              the thrill of the adventure. Now, you must
              fight freezing battles in
              the north against hordes of winter demons
              and blizzard beasts. Will you bring back the
              peace
              to the grim and frostbitten kingdoms. Or
              will you
              bring the Winter of Ages upon its lands,
              reigning
              your kingdom cold for all eternity? Or will
              you
              perish
              nameless and forgotten on the icy wastes?
            </p>

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
                callback={setGameLength}
                currValue={this.props.settings.gameLength}
                options={['Short', 'Medium', 'Long', 'Epic']}
                titleName='Game length'
              />
            </div>

            <div className='dropdown-select-div'>
              <DropdownSelect
                callback={setLoot}
                currValue={this.props.settings.lootType}
                options={['Sparse', 'Medium', 'Abundant']}
                titleName='Loot'
              />
              <DropdownSelect
                callback={setMonsters}
                currValue={this.props.settings.monstType}
                options={['Sparse', 'Medium', 'Abundant']}
                titleName='Monsters'
              />
            </div>

            <div className='dropdown-select-div'>
              <DropdownSelect
                callback={setLevelSize}
                currValue={this.props.settings.levelSize}
                options={['Small', 'Medium', 'Large', 'Huge']}
                titleName='Levels'
              />
            </div>

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

  getPlayerClassOptElems() {
    return RG.ACTOR_CLASSES.map(ac => {
      const key = 'key-actor-class-' + ac;
      return <option key={key} value={ac}>{ac}</option>;
    });
  }

}

GameStartScreen.propTypes = {
  deleteGame: PropTypes.func.isRequired,
  loadFromEditor: PropTypes.bool,
  loadGame: PropTypes.func.isRequired,
  newGame: PropTypes.func.isRequired,
  playerName: PropTypes.string,
  progress: PropTypes.string,
  savedPlayerList: PropTypes.array,
  seedName: PropTypes.string,
  selectGame: PropTypes.func.isRequired,
  selectedGame: PropTypes.string,
  setGameLength: PropTypes.func.isRequired,
  setLevelSize: PropTypes.func.isRequired,
  setLoot: PropTypes.func.isRequired,
  setMonsters: PropTypes.func.isRequired,
  setPlayMode: PropTypes.func.isRequired,
  setPlayerClass: PropTypes.func.isRequired,
  setPlayerLevel: PropTypes.func.isRequired,
  setPlayerName: PropTypes.func.isRequired,
  setPlayerRace: PropTypes.func.isRequired,
  setSeedName: PropTypes.func.isRequired,
  settings: PropTypes.object,
  showLoadScreen: PropTypes.bool.isRequired,
  showStartScreen: PropTypes.bool.isRequired,
  toggleEditor: PropTypes.func.isRequired,
  toggleScreen: PropTypes.func.isRequired
};

