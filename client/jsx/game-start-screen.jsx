
const React = require('react');
const RG = require('../src/battles.js');

const ModalHeader = require('./modal-header');
const RadioButtons = require('./radio-buttons');

/** Component for the game startup screen Prints game title and gives some
 * customisation options for the game.
 */
class GameStartScreen extends React.Component {

  constructor(props) {
    super(props);

    this.onNameChange = this.onNameChange.bind(this);
    this.deleteGame = this.deleteGame.bind(this);
    this.selectGame = this.selectGame.bind(this);
    this.loadGame = this.loadGame.bind(this);
  }

  onNameChange(evt) {
    var name = evt.target.value;
    evt.stopPropagation();
    this.props.setPlayerName(name);
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
    const setDebugMode = this.props.setDebugMode;

    var savedPlayerList = this.props.savedPlayerList;
    var playerListHTML = savedPlayerList.map( (val, index) => {
      return (
        <div
          className='player-list-item' key={index}
          onClick={this.selectGame.bind(this, val.name)}
        >
          Name: {val.name}, L: {val.expLevel} DL: {val.dungeonLevel}
        </div>);
    });

    var newGame = this.props.newGame;
    var titleTextLoad = RG.gameTitle + ' Load a game';
    return (
      <div id='game-start-screen'>

        <div
          aria-hidden='true'
          aria-labelledby='game-load-modal-label'
          className='modal fade'
          id='gameLoadModal'
          role='dialog'
          tabIndex='-1'
        >
          <div className='modal-dialog modal-lg'>
            <div className='modal-content'>

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
          </div>
        </div>
      </div>

      <div
        aria-hidden='true'
        aria-labelledby='game-start-modal-label'
        className='modal fade'
        id='gameStartModal'
        role='dialog'
        role='dialog'
        tabIndex='-1'
      >
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
            <ModalHeader
              id='game-start-modal-label'
              text={RG.gameTitle}
            />
            <div className='modal-body row'>
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

              </div>

              <div className='col-md-6' id='game-options-box' >
                <p>Customisation</p>
                <RadioButtons
                  buttons={['Short', 'Medium', 'Long', 'Epic']}
                  callback={setGameLength}
                  currValue={this.props.settings.gameLength}
                  titleName='Game length'
                />
                <RadioButtons
                  buttons={['Sparse', 'Medium', 'Abundant']}
                  callback={setLoot}
                  currValue={this.props.settings.lootType}
                  titleName='Loot'
                />
                <RadioButtons
                  buttons={['Sparse', 'Medium', 'Abundant']}
                  callback={setMonsters}
                  currValue={this.props.settings.monstType}
                  titleName='Monsters'
                />
                <RadioButtons
                  buttons={['Small', 'Medium', 'Large', 'Huge']}
                  callback={setLevelSize}
                  currValue={this.props.settings.levelSize}
                  titleName='Levels'
                />
                <RadioButtons
                  buttons={['Weak', 'Medium', 'Strong', 'Inhuman']}
                  callback={setPlayerLevel}
                  currValue={this.props.settings.playerLevel}
                  titleName='Player'
                />
                <RadioButtons
                  buttons={['Off', 'Arena', 'Battle', 'Creator', 'World', 'OverWorld']}
                  callback={setDebugMode}
                  currValue={this.props.settings.debugMode}
                  titleName='Debug'
                />
              </div>
            </div>

            <div className='modal-footer row'>
              <div className='col-md-6'>
                <button
                  className='btn btn-primary'
                  data-dismiss='modal'
                  onClick={this.props.toggleEditor}
                  type='button'
                >Editor</button>
                <button
                  className='btn btn-success'
                  data-dismiss='modal'
                  onClick={newGame}
                  type='button'
                >Embark!</button>
                <button
                  className='btn btn-secondary btn-warning'
                  data-dismiss='modal'
                  data-target='#gameLoadModal'
                  data-toggle='modal'
                  type='button'
                >
                  Load
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

}

GameStartScreen.propTypes = {
  settings: React.PropTypes.object,
  deleteGame: React.PropTypes.func.isRequired,
  loadGame: React.PropTypes.func.isRequired,
  savedPlayerList: React.PropTypes.array,
  setPlayerName: React.PropTypes.func.isRequired,
  playerName: React.PropTypes.string,

  setLoot: React.PropTypes.func.isRequired,
  setMonsters: React.PropTypes.func.isRequired,
  setLevelSize: React.PropTypes.func.isRequired,
  setPlayerLevel: React.PropTypes.func.isRequired,
  setGameLength: React.PropTypes.func.isRequired,
  setDebugMode: React.PropTypes.func.isRequired,

  newGame: React.PropTypes.func.isRequired,
  selectedGame: React.PropTypes.string,
  selectGame: React.PropTypes.func.isRequired,

  toggleEditor: React.PropTypes.func.isRequired
};

module.exports = GameStartScreen;

