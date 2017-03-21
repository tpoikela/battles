
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

        this.state = {
            selectedGame: null,
            playerName: 'Player'
        };

    }

    onNameChange(evt) {
        var name = evt.target.value;
        this.props.setPlayerName(name);
        this.setState({playerName: evt.target.value});
    }

    /* Loads a saved game.*/
    loadGame() {
        this.props.loadGame(this.state.selectedGame);
    }

    deleteGame() {
        this.props.deleteGame(this.state.selectedGame);
    }

    selectGame(name) {
        this.setState({selectedGame: name});
    }


    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.savedPlayerList !== this.props.savedPlayerList) {
            return true;
        }
        if (nextState.playerName !== this.state.playerName) {return true;}
        return false;
    }

    render() {
        var setLoot = this.props.setLoot;
        var setMonsters = this.props.setMonsters;
        var setLevelSize = this.props.setLevelSize;
        var setPlayerLevel = this.props.setPlayerLevel;
        var setGameLength = this.props.setGameLength;
        var setDebugMode = this.props.setDebugMode;

        var that = this;
        var savedPlayerList = this.props.savedPlayerList;
        var playerListHTML = savedPlayerList.map(function(val, index) {
            return (
                <div
                    className='player-list-item' key={index}
                    onClick={that.selectGame.bind(that, val.name)}
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
                            <p>Selected game: {this.state.selectedGame}</p>
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
                                        value={this.state.playerName}
                                    />
                                </label>

                        </div>

                            <div className='col-md-6' id='game-options-box' >
                                <p>Customisation</p>
                                <RadioButtons
                                    buttons={['Short', 'Medium', 'Long', 'Epic']}
                                    callback={setGameLength}
                                    titleName='Game length'
                                />
                                <RadioButtons
                                    buttons={['Sparse', 'Medium', 'Abundant']}
                                    callback={setLoot}
                                    titleName='Loot'
                                />
                                <RadioButtons
                                    buttons={['Sparse', 'Medium', 'Abundant']}
                                    callback={setMonsters}
                                    titleName='Monsters'
                                />
                                <RadioButtons
                                    buttons={['Small', 'Medium', 'Large', 'Huge']}
                                    callback={setLevelSize}
                                    titleName='Levels'
                                />
                                <RadioButtons
                                    buttons={['Weak', 'Medium', 'Strong', 'Inhuman']}
                                    callback={setPlayerLevel}
                                    titleName='Player'
                                />
                                <RadioButtons
                                    buttons={['Off', 'Arena', 'Battle']}
                                    callback={setDebugMode}
                                    titleName='Debug'
                                />
                            </div>
                        </div>

                        <div className='modal-footer row'>
                            <div className='col-md-6'>
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
    deleteGame: React.PropTypes.func,
    loadGame: React.PropTypes.func,
    savedPlayerList: React.PropTypes.array,
    setPlayerName: React.PropTypes.func,

    setLoot: React.PropTypes.func,
    setMonsters: React.PropTypes.func,
    setLevelSize: React.PropTypes.func,
    setPlayerLevel: React.PropTypes.func,
    setGameLength: React.PropTypes.func,
    setDebugMode: React.PropTypes.func,

    newGame: React.PropTypes.func
};

module.exports = GameStartScreen;

