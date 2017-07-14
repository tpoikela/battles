
const React = require('react');

const GameBoard = require('./game-board');
const RG = require('../src/battles');
const Screen = require('../gui/screen');

const RGEffects = require('../data/effects');
const RGObjects = require('../data/battles_objects');

class GameEditor extends React.Component {

    constructor(props) {
        super(props);

        const state = {
            boardClassName: 'game-board-player-view',
            levelX: 80,
            levelY: 28,
            levelType: 'arena',

            subLevelX: 20,
            subLevelY: 7,
            subLevelType: 'arena',

            errorMsg: '',

            itemFunc: (item) => (item.value < 5000),
            maxValue: 5000,

            selectedCell: null,
            elementType: 'floor',
            actorName: '',
            itemName: '',

            insertXWidth: 1,
            insertYWidth: 1,

            shownLevelConf: '',
            levelConf: {},

            editorLevel: null,
            frameCount: 0,
            fps: 0,
            simulationStarted: false
        };

        this.screen = new Screen(state.levelX, state.levelY);
        const level = RG.FACT.createLevel(state.levelType,
            state.levelX, state.levelY);
        RG.setAllExplored(level, true);

        state.level = level;

        this.state = state;

        this.parser = new RG.ObjectShellParser();
        this.parser.parseShellData(RGEffects);
        this.parser.parseShellData(RGObjects);

        // Bind functions for callbacks
        this.generateMap = this.generateMap.bind(this);
        this.onChangeType = this.onChangeType.bind(this);
        this.onChangeX = this.onChangeX.bind(this);
        this.onChangeY = this.onChangeY.bind(this);

        this.subGenerateMap = this.subGenerateMap.bind(this);
        this.onChangeSubType = this.onChangeSubType.bind(this);
        this.onChangeSubX = this.onChangeSubX.bind(this);
        this.onChangeSubY = this.onChangeSubY.bind(this);

        this.generateActors = this.generateActors.bind(this);
        this.generateItems = this.generateItems.bind(this);

        this.levelToJSON = this.levelToJSON.bind(this);

        this.onCellClick = this.onCellClick.bind(this);

        this.insertElement = this.insertElement.bind(this);
        this.onChangeElement = this.onChangeElement.bind(this);
        this.insertActor = this.insertActor.bind(this);
        this.onChangeActor = this.onChangeActor.bind(this);
        this.insertItem = this.insertItem.bind(this);
        this.onChangeItem = this.onChangeItem.bind(this);

        this.onChangeInsertXWidth = this.onChangeInsertXWidth.bind(this);
        this.onChangeInsertYWidth = this.onChangeInsertYWidth.bind(this);

        this.invertMap = this.invertMap.bind(this);
        // this.onChangeLevelConf = this.onChangeLevelConf.bind(this);
        this.simulateLevel = this.simulateLevel.bind(this);
        this.playSimulation = this.playSimulation.bind(this);
        this.pauseSimulation = this.pauseSimulation.bind(this);
        this.stopSimulation = this.stopSimulation.bind(this);
    }

    onCellClick(x, y) {
        const cell = this.state.level.getMap().getCell(x, y);
        console.log(`Clicked ${x},${y} ${JSON.stringify(cell)}`);
        this.screen.setSelectedCell(cell);
        this.setState({selectedCell: cell});
    }

    /* Converts the rendered level to JSON.*/
    levelToJSON() {
        const json = this.state.level.toJSON();
        localStorage.setItem('savedLevel', JSON.stringify(json));
    }

    /* Generates the large map. This erases everything. */
    generateMap() {
        const levelType = this.state.levelType;
        try {
            let conf = {};
            if (this.state.levelConf.hasOwnProperty(levelType)) {
                conf = this.state.levelConf[levelType];
            }
            const level = RG.FACT.createLevel(levelType,
                this.state.levelX, this.state.levelY, conf);
            this.screen.setViewportXY(this.state.levelX, this.state.levelY);
            RG.setAllExplored(level, true);
            this.setState({level: level});
        }
        catch (e) {
            this.setState({errorMsg: e.message});
        }
    }

    /* Inserts a sub-map into the current level. This overwrites all cells
     * in the large map (including items and actors. */
    subGenerateMap() {
        const level = this.state.level;
        let subLevel = RG.FACT.createLevel(this.state.subLevelType,
            this.state.subLevelX, this.state.subLevelY);
        RG.setAllExplored(subLevel, true);
        const x = this.state.selectedCell.getX();
        const y = this.state.selectedCell.getY();
        RG.Geometry.insertSubLevel(level, subLevel, x, y);
        subLevel = null;
        this.setState({level: level});
    }

    generateItems() {
        const itemFunc = this.state.itemFunc;
        const maxValue = this.state.maxValue;
        const conf = {
            func: itemFunc, maxValue,
            itemsPerLevel: 10
        };
        const level = this.state.level;

        // Remove existing items first
        const items = level.getItems();
        items.forEach(item => {
            level.removeItem(item, item.getX(), item.getY());
        });

        RG.FACT.addNRandItems(level, this.parser, conf);
        this.setState({level: level});
    }

    generateActors() {
        const level = this.state.level;

        // Remove existing actors first
        const actors = level.getActors();
        actors.forEach(actor => {
            level.removeActor(actor, actor.getX(), actor.getY());
        });

        const conf = {
            maxDanger: 20,
            monstersPerLevel: 20,
            func: (actor) => (actor.danger < 100)
        };

        RG.FACT.addNRandMonsters(this.state.level, this.parser, conf);
        this.setState({level: level});
    }

    debugMsg(msg) {
        console.log('[DEBUG] ' + msg);
    }


    /* Starts a simulation of the level. No player support yet. */
    simulateLevel() {
        let editorLevel = this.state.editorLevel;
        if (!this.state.simulationStarted) {
            const fromJSON = new RG.Game.FromJSON();
            const json = this.state.level.toJSON();
            const levelClone = fromJSON.createLevel(json);
            editorLevel = this.state.level;

            this.game = new RG.Game.Main();
            this.game.addLevel(levelClone);
            this.game.addActiveLevel(levelClone);
            const startTime = new Date().getTime();
            this.setState({level: this.game.getLevels()[0],
                editorLevel,
                frameCount: 0, startTime, simulationStarted: true});
            // this.frameID = setTimeout(this.mainLoop.bind(this), 20);
            this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
        }
        else {
            this.playSimulation();
        }
    }

    mainLoop() {
        const frameCount = this.state.frameCount;
        const fps = 1000 * frameCount /
            (new Date().getTime() - this.state.startTime);
        this.game.simulateGame();
        this.setState({level: this.game.getLevels()[0],
            frameCount: frameCount + 1, fps: fps});
        // this.frameID = setTimeout(this.mainLoop.bind(this), 20);
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    }

    playSimulation() {
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    }

    pauseSimulation() {
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
            // clearInterval(this.frameID);
        }
    }

    stopSimulation() {
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
            // clearInterval(this.frameID);
        }
        const editorLevel = this.state.editorLevel;
        this.setState({level: editorLevel, simulationStarted: false});
    }

    insertElement() {
        const llx = this.state.selectedCell.getX();
        const lly = this.state.selectedCell.getY();
        const urx = this.state.insertXWidth + llx - 1;
        const ury = this.state.insertYWidth + lly - 1;
        this.debugMsg('insertElement: ' + `${llx}, ${lly}, ${urx}, ${ury}`);
        const level = this.state.level;
        try {
            RG.Geometry.insertElements(level, this.state.elementType,
                llx, lly, urx, ury);
        }
        catch (e) {
            this.setState({errorMsg: e.message});
        }
        this.setState({level: level});
    }

    insertActor() {
        const llx = this.state.selectedCell.getX();
        const lly = this.state.selectedCell.getY();
        const urx = this.state.insertXWidth + llx - 1;
        const ury = this.state.insertYWidth + lly - 1;
        this.debugMsg('insertActor: ' + `${llx}, ${lly}, ${urx}, ${ury}`);
        const level = this.state.level;
        try {
            RG.Geometry.insertActors(level, this.state.actorName,
                llx, lly, urx, ury, this.parser);
        }
        catch (e) {
            this.setState({errorMsg: e.message});
        }
        this.setState({level: level});
    }

    insertItem() {
        const llx = this.state.selectedCell.getX();
        const lly = this.state.selectedCell.getY();
        const urx = this.state.insertXWidth + llx - 1;
        const ury = this.state.insertYWidth + lly - 1;
        const level = this.state.level;
        try {
            RG.Geometry.insertItems(level, this.state.itemName,
                llx, lly, urx, ury, this.parser);
        }
        catch (e) {
            this.setState({errorMsg: e.message});
        }
        this.setState({level: level});

    }

    /* Inverts the map base elements (floor/wall) */
    invertMap() {
        const level = this.state.level;
        const map = level.getMap();
        RG.Map.CellList.invertMap(map);
        this.setState({level: level});
    }

    render() {
        const mapShown = this.props.mapShown;
        let rowClass = 'cell-row-div-player-view';
        if (mapShown) {rowClass = 'cell-row-div-map-view';}

        let map = null;
        if (this.state.level) {
            map = this.state.level.getMap();
        }
        if (map) {
            this.screen.renderFullMap(map);
        }

        const errorMsg = this.getErrorMsg();
        const charRows = this.screen.getCharRows();
        const classRows = this.screen.getClassRows();
        const levelConfElem = this.getLevelConfElement();

        return (
            <div className='game-editor'>
                <h2>Battles Game Editor</h2>
                <div className='btn-div'>
                    <button onClick={this.generateMap}>Generate!</button>
                    <input
                        name='level-type'
                        onChange={this.onChangeType}
                        value={this.state.levelType}
                    />
                    <input
                        name='level-x'
                        onChange={this.onChangeX}
                        value={this.state.levelX}
                    />
                    <input
                        name='level-y'
                        onChange={this.onChangeY}
                        value={this.state.levelY}
                    />
                    <button onClick={this.invertMap}>Invert</button>
                    {levelConfElem}
                </div>
                <div className='btn-div'>
                    <button onClick={this.subGenerateMap}>SubGen!</button>
                    <input
                        name='sublevel-type'
                        onChange={this.onChangeSubType}
                        value={this.state.subLevelType}
                    />
                    <input
                        name='sublevel-x'
                        onChange={this.onChangeSubX}
                        value={this.state.subLevelX}
                    />
                    <input
                        name='sublevel-y'
                        onChange={this.onChangeSubY}
                        value={this.state.subLevelY}
                    />
                </div>
                <div className='btn-div'>
                    <button onClick={this.generateActors}>Actors!</button>
                    <button onClick={this.generateItems}>Items!</button>
                </div>
                <div className='btn-div'>
                    <button onClick={this.insertElement}>Insert element</button>
                    <input
                        name='insert-element'
                        onChange={this.onChangeElement}
                        value={this.state.elementType}
                    />
                    <button onClick={this.insertActor}>Insert actor</button>
                    <input
                        name='insert-actor'
                        onChange={this.onChangeActor}
                        value={this.state.actorName}
                    />
                    <button onClick={this.insertItem}>Insert item</button>
                    <input
                        name='insert-item'
                        onChange={this.onChangeItem}
                        value={this.state.itemName}
                    />
                </div>
                <div className='btn-div'>
                    <input
                        name='insert-x-width'
                        onChange={this.onChangeInsertXWidth}
                        value={this.state.insertXWidth}
                    />
                    <input
                        name='insert-y-width'
                        onChange={this.onChangeInsertYWidth}
                        value={this.state.insertYWidth}
                    />
                </div>
                <div>
                    {errorMsg}
                </div>
                <div className='game-editor-board-div'>
                    <GameBoard
                        boardClassName={this.state.boardClassName}
                        charRows={charRows}
                        classRows={classRows}
                        endY={this.screen.endY}
                        onCellClick={this.onCellClick}
                        rowClass={rowClass}
                        startX={0}
                        startY={0}
                    />
                </div>
                <div className='btn-div'>
                    <button onClick={this.levelToJSON}>To JSON</button>
                </div>
                <div className='btn-div'>
                    <button onClick={this.simulateLevel}>Simulate</button>
                    <button onClick={this.playSimulation}>Play</button>
                    <button onClick={this.pauseSimulation}>Pause</button>
                    <button onClick={this.stopSimulation}>Stop</button>
                    <p>Frame count: {this.state.frameCount}</p>
                    <p>FPS: {this.state.fps}</p>
                </div>
            </div>
        );
    }

    getErrorMsg() {
        if (this.state.errorMsg.length > 0) {
            return <p className='text-danger'>{this.state.errorMsg}</p>;
        }
        else {
            return <p className='text-success'>OK. No errors.</p>;
        }
    }

    onChangeLevelConf(confType, key) {
        const id = `#${confType}--${key}`;
        const inputElem = document.querySelector(id);
        const value = inputElem.value;
        const conf = this.state.levelConf;
        conf[confType][key] = value;
        this.setState({levelConf: conf});
    }

    /* Returns the level config configuration shown directly under level
     * generation. */
    getLevelConfElement() {
        let elem = null;
        const confType = this.state.shownLevelConf;
        if (confType.length > 0) {
            const conf = this.state.levelConf[confType];
            elem = Object.keys(conf).map(key => {
                const currVal = this.state.levelConf[confType][key];
                const newValue = currVal ? currVal : conf[key];
                const onChangeFunc =
                    this.onChangeLevelConf.bind(this, confType, key);
                if (typeof conf[key] !== 'function') {
                    return (
                        <label key={`${confType}--${key}`}>{key}
                            <input
                                id={`${confType}--${key}`}
                                name={`${confType}-${key}`}
                                onChange={onChangeFunc}
                                value={newValue}
                            />

                        </label>

                    );
                }
                else {
                    return <label>{key}</label>;
                }
            });
        }
        return <div className='game-editor-level-conf'>{elem}</div>;
    }

    //----------------------------------------------------------------
    // onChangeXXX callbacks for <input> fields
    //----------------------------------------------------------------

    onChangeType(evt) {
        const value = evt.target.value;
        const levelType = value;
        let levelConf = this.state.levelConf;
        let shownLevelConf = this.state.shownLevelConf;
        if (value === 'town') {
            if (!levelConf.town) {
                levelConf.town = RG.Factory.cityConfBase(
                    this.parser, {});
                shownLevelConf = 'town';
            }
        }
        else {
            levelConf = {};
            shownLevelConf = '';
        }
        this.setState({levelType, levelConf, shownLevelConf});
    }

    onChangeX(evt) {
        const value = parseInt(evt.target.value, 10);
        this.setState({levelX: value});
    }

    onChangeY(evt) {
        const value = parseInt(evt.target.value, 10);
        this.setState({levelY: value});
    }

    onChangeSubType(evt) {
        const value = evt.target.value;
        this.setState({subLevelType: value});
    }

    onChangeSubX(evt) {
        const value = parseInt(evt.target.value, 10);
        this.setState({subLevelX: value});
    }

    onChangeSubY(evt) {
        const value = parseInt(evt.target.value, 10);
        this.setState({subLevelY: value});
    }

    onChangeElement(evt) {
        const value = evt.target.value;
        this.setState({elementType: value});
    }

    onChangeActor(evt) {
        const value = evt.target.value;
        this.setState({actorName: value});
    }

    onChangeItem(evt) {
        const value = evt.target.value;
        this.setState({itemName: value});
    }

    onChangeInsertXWidth(evt) {
        const value = parseInt(evt.target.value, 10);
        this.setState({insertXWidth: value});
    }

    onChangeInsertYWidth(evt) {
        const value = parseInt(evt.target.value, 10);
        this.setState({insertYWidth: value});
    }

    bindFunctionsToThis() {
        this.generateMap = this.generateMap.bind(this);
        this.onChangeType = this.onChangeType.bind(this);
        this.onChangeX = this.onChangeX.bind(this);
        this.onChangeY = this.onChangeY.bind(this);

        this.subGenerateMap = this.subGenerateMap.bind(this);
        this.onChangeSubType = this.onChangeSubType.bind(this);
        this.onChangeSubX = this.onChangeSubX.bind(this);
        this.onChangeSubY = this.onChangeSubY.bind(this);

        this.generateActors = this.generateActors.bind(this);
        this.generateItems = this.generateItems.bind(this);

        this.levelToJSON = this.levelToJSON.bind(this);

        this.onCellClick = this.onCellClick.bind(this);

        this.insertElement = this.insertElement.bind(this);
        this.onChangeElement = this.onChangeElement.bind(this);
        this.insertActor = this.insertActor.bind(this);
        this.onChangeActor = this.onChangeActor.bind(this);
        this.insertItem = this.insertItem.bind(this);
        this.onChangeItem = this.onChangeItem.bind(this);

        this.onChangeInsertXWidth = this.onChangeInsertXWidth.bind(this);
        this.onChangeInsertYWidth = this.onChangeInsertYWidth.bind(this);
    }
}

GameEditor.propTypes = {
    mapShown: React.PropTypes.bool
};

module.exports = GameEditor;
