
const React = require('react');

const ROT = require('../../lib/rot');

const GameBoard = require('./game-board');
const RG = require('../src/battles');
const Screen = require('../gui/screen');
const GameMessages = require('./game-messages');

const RGEffects = require('../data/effects');
const RGObjects = require('../data/battles_objects');

const NO_VISIBLE_CELLS = [];

const genFullWorld = require('../../scripts/mountain-range');

const boardViews = [
    'game-board-map-view-xxxxs',
    'game-board-map-view-xxxs',
    'game-board-map-view-xs',
    'game-board-map-view',
    'game-board-player-view',
    'game-board-player-view-xl'
];

const startSimulation = (startTime, level) =>
    () => (
        {
            level,
            startTime: startTime,
            simulationStarted: true,
            frameCount: 0
        }
    );

class GameEditor extends React.Component {

    constructor(props) {
        super(props);

        const state = {
            boardClassName: 'game-board-player-view',
            boardIndex: 3, // Points to boardViews array
            fontSize: 16,

            levelX: 80,
            levelY: 28,
            levelType: 'arena',

            subLevelX: 20,
            subLevelY: 7,
            subLevelType: 'arena',
            subLevelTileX: 1,
            subLevelTileY: 1,

            errorMsg: '',
            msg: '',

            itemFunc: (item) => (item.value < 5000),
            maxValue: 5000,

            selectedCell: null,
            elementType: 'floor',
            actorName: '',
            itemName: '',
            numEntities: 20,

            insertXWidth: 1,
            insertYWidth: 1,

            levelConf: {shown: ''},
            subLevelConf: {shown: ''},

            level: null,
            levelList: [],
            levelIndex: 0,

            frameCount: 0,
            fps: 0,
            simulationStarted: false,
            simulationPaused: false,
            turnsPerSec: 1000,
            turnsPerFrame: 1,
            idCount: 0,

            useRLE: true
        };

        this.screen = new Screen(state.levelX, state.levelY);
        const level = RG.FACT.createLevel(state.levelType,
            state.levelX, state.levelY);
        level.getMap()._optimizeForRowAccess();

        level.editorID = state.idCount++;
        state.level = level;
        state.levelList.push(level);

        this.state = state;

        this.parser = new RG.ObjectShellParser();
        this.parser.parseShellData(RGEffects);
        this.parser.parseShellData(RGObjects);

        this.intervalID = null;
        this.frameID = null;

        // Bind functions for callbacks
        this.generateWorld = this.generateWorld.bind(this);
        this.generateMap = this.generateMap.bind(this);
        this.onChangeMapType = this.onChangeMapType.bind(this);
        this.onChangeX = this.onChangeX.bind(this);
        this.onChangeY = this.onChangeY.bind(this);

        this.subGenerateMap = this.subGenerateMap.bind(this);
        this.onChangeSubType = this.onChangeSubType.bind(this);
        this.onChangeSubX = this.onChangeSubX.bind(this);
        this.onChangeSubY = this.onChangeSubY.bind(this);
        this.onChangeSubTileX = this.onChangeSubTileX.bind(this);
        this.onChangeSubTileY = this.onChangeSubTileY.bind(this);

        this.generateActors = this.generateActors.bind(this);
        this.generateItems = this.generateItems.bind(this);
        this.onChangeNumEntities = this.onChangeNumEntities.bind(this);

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
        this.playFastSimulation = this.playFastSimulation.bind(this);
        this.pauseSimulation = this.pauseSimulation.bind(this);
        this.stopSimulation = this.stopSimulation.bind(this);
        this.onChangeTurnsPerFrame = this.onChangeTurnsPerFrame.bind(this);

        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    componentDidMount() {
      document.addEventListener('keydown', this.handleKeyDown, true);
    }

    componentWillUnMount() {
      document.removeEventListener('keydown', this.handleKeyDown);
    }

    /* Handles some quick keys for faster placement. */
    handleKeyDown(evt) {
        const keyCode = this.nextCode = evt.keyCode;
        if (keyCode === ROT.VK_PERIOD) {
            this.setState({elementType: 'floor'});
            this.insertElement();
        }
        else if (keyCode === ROT.VK_W) {
            this.setState({elementType: 'wall'});
            this.insertElement();
        }
    }

    onCellClick(x, y) {
        const cell = this.state.level.getMap().getCell(x, y);
        console.log(`Clicked ${x},${y} ${JSON.stringify(cell)}`);
        console.log(cell.toString());

        this.screen.setSelectedCell(cell);
        this.setState({selectedCell: cell});
    }

    /* Converts the rendered level to JSON and puts that into localStorage.*/
    levelToJSON() {
        const json = this.state.level.toJSON();
        localStorage.setItem('savedLevel', JSON.stringify(json));
    }

    /* Generates a world scale map. */
    generateWorld() {
        const conf = {
            worldX: this.state.levelX,
            worldY: this.state.levelY
        };
        const level = genFullWorld(conf);
        level.getMap()._optimizeForRowAccess();
        level.editorID = this.state.idCount++;
        this.screen.setViewportXY(level.getMap().cols, level.getMap().rows);
        const levelList = this.state.levelList;
        levelList.push(level);
        const levelIndex = levelList.length - 1;
        this.setState({level: level, levelList, levelIndex});
    }

    /* Generates the large map. This erases everything. */
    generateMap() {
        const levelType = this.state.levelType;
        let conf = {};
        if (this.state.levelConf.hasOwnProperty(levelType)) {
            conf = this.state.levelConf[levelType];
        }

        const level = RG.FACT.createLevel(
            levelType, this.state.levelX, this.state.levelY, conf);
        level.getMap()._optimizeForRowAccess();
        level.editorID = this.state.idCount++;

        this.screen.setViewportXY(this.state.levelX, this.state.levelY);
        RG.setAllExplored(level, true);
        const levelList = this.state.levelList;
        levelList.push(level);
        const levelIndex = levelList.length - 1;
        this.setState({level: level, levelList, levelIndex});
    }

    /* Inserts a sub-map into the current level. This overwrites all
     * overlapping cells in the large map (incl items and actors). */
    subGenerateMap() {
        const level = this.state.level;
        const levelType = this.state.subLevelType;
        let conf = {};

        if (this.state.subLevelConf.hasOwnProperty(levelType)) {
            conf = this.state.subLevelConf[levelType];
        }
        const subWidth = this.state.subLevelX;
        const subHeight = this.state.subLevelY;

        if (this.state.selectedCell) {
            const x0 = this.state.selectedCell.getX();
            const y0 = this.state.selectedCell.getY();

            // Iterate through tiles in x-direction (tx) and tiles in
            // y-direction (ty). Compute upper left x,y for each sub-level.
            for (let tx = 0; tx < this.state.subLevelTileX; tx++) {
                for (let ty = 0; ty < this.state.subLevelTileY; ty++) {
                    const xSub = x0 + tx * subWidth;
                    const ySub = y0 + ty * subHeight;
                    const subLevel = RG.FACT.createLevel(
                        levelType, subWidth, this.state.subLevelY, conf);
                    RG.setAllExplored(subLevel, true);
                    RG.Geometry.insertSubLevel(level, subLevel, xSub, ySub);
                }
            }

            this.setState({level: level});
        }
        else {
            const msg = 'You must select a cell first from the map.';
            this.setState({errorMsg: msg});
        }
    }

    /* Generates and inserts random items into the map. */
    generateItems() {
        const itemFunc = this.state.itemFunc;
        const maxValue = this.state.maxValue;
        const conf = {
            func: itemFunc, maxValue,
            itemsPerLevel: this.state.numEntities
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

    /* Generates and inserts random actors into the map. */
    generateActors() {
        const level = this.state.level;

        // Remove existing actors first
        const actors = level.getActors();
        actors.forEach(actor => {
            level.removeActor(actor, actor.getX(), actor.getY());
        });

        const conf = {
            maxDanger: 20,
            monstersPerLevel: this.state.numEntities,
            func: (actor) => (actor.danger < 100)
        };

        RG.FACT.addNRandMonsters(level, this.parser, conf);
        this.setState({level: level});
    }

    debugMsg(msg) {
        console.log('[DEBUG] ' + msg);
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
        if (this.state.boardClassName === 'game-board-map-view-xxxs') {
            rowClass = 'cell-row-div-map-view-xxxs';
        }

        let map = null;
        if (this.state.level) {
            map = this.state.level.getMap();
        }

        if (map) {
            if (this.state.useRLE) {
                this.screen.renderFullMapWithRLE(map);
            }
            else {
                this.screen.renderFullMap(map);
            }
        }

        const errorMsg = this.getEditorMsg();
        const charRows = this.screen.getCharRows();
        const classRows = this.screen.getClassRows();
        const editorPanelElem = this.getEditorPanelElement();
        const simulationButtons = this.getSimulationButtons();
        const gameEditorLevelList = this.getLevelList();

        let message = [];
        if (this.state.simulationStarted) {
            if (this.game.hasNewMessages()) {
                message = this.game.getMessages();
            }
        }

        const renderPanel = !this.state.simulationStarted ||
            (this.state.simulationStarted && this.state.simulationPaused);
        return (
            <div className='game-editor-main-div'>
                <p className='text-primary'>
                    Battles Game Editor: {errorMsg}
                </p>

                {renderPanel && editorPanelElem}

                {this.state.simulationStarted &&
                    <div className='game-editor-game-messages'>
                        <GameMessages
                            message={message}
                            saveInProgress={false}
                            showAll={true}
                            visibleCells={NO_VISIBLE_CELLS}
                        />
                    </div>
                }

                <div className='row'>
                    <div className='list-group col-md-2'>
                        List of levels:
                        {gameEditorLevelList}
                    </div>
                    <div className='col-md-10'>
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
                            useRLE={this.state.useRLE}
                        />
                    </div>
                    </div>
                </div>
                <div className='game-editor-bottom-btn'>
                    {simulationButtons}

                    <div className='btn-div'>
                        <button onClick={this.levelToJSON}>Save</button>
                        <button
                            className='btn btn-danger btn-lg'
                            onClick={this.props.toggleEditor}
                        >
                            Close editor
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    getEditorMsg() {
        if (this.state.errorMsg.length > 0) {
            return <span className='text-danger'>{this.state.errorMsg}</span>;
        }
        else {
            if (this.state.msg.length > 0) {
                return <span className='text-info'>{this.state.msg}</span>;
            }
            return <span className='text-success'>OK. No errors.</span>;
        }
    }


    /* Modifes the given level configuration object based on the value
     * (level type). */
    modifyLevelConf(value, levelConf) {
        if (value === 'town') {
            if (!levelConf.town) {
                levelConf.town = RG.Factory.cityConfBase(
                    this.parser, {});
                levelConf.shown = 'town';
            }
        }
        else if (value === 'forest') {
            if (!levelConf.forest) {
                levelConf.forest = {nForests: 5, forestSize: 100, ratio: 0.5,
                    factor: 6};
                levelConf.shown = 'forest';
            }
        }
        else if (value === 'mountain') {
            if (!levelConf.mountain) {
                levelConf.mountain = {
                    noiseMult: 1,
                    noiseDivider: 20,
                    highRockThr: 0.75,
                    stoneThr: 0.5,
                    chasmThr: -0.4,
                    nRoadTurns: 8
                };
                levelConf.shown = 'mountain';
            }
        }
        else {
            levelConf[value] = {};
            levelConf.shown = value;
        }
    }

    /* Zooms the game board in or out. TODO: Make this actually work correctly.
     */
    zoom(inOut) {
        let index = this.state.boardIndex;

        if (inOut === '+') {
            if (index < (boardViews.length - 1)) {
                ++index;
            }
        }
        else if (inOut === '-') {
            if (index > 0) {
                --index;
            }
        }
        const boardClassName = boardViews[index];
        this.setState({boardClassName, boardIndex: index});
    }

    //----------------------------------------------------------------
    // onChangeXXX callbacks for <input> fields
    //----------------------------------------------------------------

    onChangeLevelConf(confType, key, idHead) {
        const id = `#${idHead}--${confType}--${key}`;
        const inputElem = document.querySelector(id);
        const value = inputElem.value;
        const conf = idHead === 'main' ? this.state.levelConf
            : this.state.subLevelConf;
        if (key.match(/(\w+)Func/)) {
            // TODO how to handle functions
        }
        else {
            conf[confType][key] = value;
        }

        if (idHead === 'main') {
            this.setState({levelConf: conf});
        }
        else {
            this.setState({subLevelConf: conf});
        }
    }

    onChangeMapType(evt) {
        const value = evt.target.value;
        const levelType = value;
        const levelConf = this.state.levelConf;
        this.modifyLevelConf(value, levelConf);
        this.setState({levelType, levelConf});
    }

    getInt(value, base) {
        const retValue = parseInt(value, base);
        if (Number.isInteger(retValue)) {
            return retValue;
        }
        return '';
    }

    onChangeX(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({levelX: value});
    }

    onChangeY(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({levelY: value});
    }

    onChangeSubType(evt) {
        const value = evt.target.value;
        const subLevelConf = this.state.subLevelConf;
        this.modifyLevelConf(value, subLevelConf);
        this.setState({subLevelType: value, subLevelConf});
    }

    onChangeSubX(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({subLevelX: value});
    }

    onChangeSubY(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({subLevelY: value});
    }

    onChangeSubTileX(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({subLevelTileX: value});
    }

    onChangeSubTileY(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({subLevelTileY: value});
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
        const value = this.getInt(evt.target.value, 10);
        this.setState({insertXWidth: value});
    }

    onChangeInsertYWidth(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({insertYWidth: value});
    }

    onChangeNumEntities(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({numEntities: value});
    }

    onChangeTurnsPerFrame(evt) {
        const value = this.getInt(evt.target.value, 10);
        this.setState({turnsPerFrame: value});
    }

    //----------------------------------------------------------------
    // SIMULATION METHODS
    //----------------------------------------------------------------

    /* Starts a simulation of the level. No player support yet. */
    simulateLevel() {
        if (!this.state.simulationStarted) {
            const id = this.state.level.getID();
            console.log('Starting sim with level ' + id);
            const fromJSON = new RG.Game.FromJSON();
            const json = this.state.level.toJSON();
            const levelClone = fromJSON.createLevel(json);
            levelClone.getMap()._optimizeForRowAccess();
            levelClone.editorID = this.state.idCount++;

            const nActors = levelClone.getActors().length;
            console.log('Cloned level has ' + nActors + ' actors');

            RG.POOL = new RG.EventPool(); // Dangerous, global objects
            this.game = new RG.Game.Main();
            this.game.addLevel(levelClone);
            this.game.addActiveLevel(levelClone);
            const startTime = new Date().getTime();
            console.log('Game has ' + this.game.getLevels().length + ' levels');

            // const newLevel = this.game.getLevels()[0];
            // this.setState({level: levelClone, frameCount: 0,
            // startTime, simulationStarted: true});
            this.setState(startSimulation(startTime, levelClone));
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
        for (let n = 0; n < this.state.turnsPerFrame; n++) {
            this.game.simulateGame();
        }
        this.setState({frameCount: frameCount + 1, fps: fps});
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    }

    /* Simulates the game for N turns, then renders once. */
    mainLoopFast() {
        for (let i = 0; i < this.state.turnsPerSec; i++) {
            this.game.simulateGame();
        }
        this.setState({level: this.game.getLevels()[0]});
    }

    playSimulation() {
        if (this.state.simulationStarted) {
            if (this.intervalID !== null) {
                clearInterval(this.intervalID);
                this.intervalID = null;
            }
            if (this.frameID === null) {
                this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
            }
            this.setState({simulationPaused: false});
        }
        else {
            console.error('Start simulation first using Simulate');
        }
    }

    playFastSimulation() {
        if (this.state.simulationStarted) {
            if (this.frameID) {
                cancelAnimationFrame(this.frameID);
                this.frameID = null;
            }
            this.intervalID = setInterval(this.mainLoopFast.bind(this),
                this.state.turnsPerSec);
            this.setState({simulationPaused: false});
        }
        else {
            console.error('Start simulation first using Simulate');
        }
    }

    pauseSimulation() {
        if (this.intervalID) {
            clearInterval(this.intervalID);
            this.intervalID = null;
        }
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
            this.frameID = null;
        }
        this.setState({simulationPaused: true});
    }

    stopSimulation() {
        if (this.state.simulationStarted) {
            if (this.intervalID) {
                clearInterval(this.intervalID);
                this.intervalID = null;
            }
            if (this.frameID) {
                cancelAnimationFrame(this.frameID);
                this.frameID = null;
            }
            console.log('Stopped simulation.');
            this.game = null;
            delete this.game;
            const shownLevel = this.state.levelList[this.state.levelIndex];
            this.setState({level: shownLevel,
                simulationStarted: false, simulationPaused: false});
        }
    }

    selectLevel(level, i) {
        this.setState({level: level, levelIndex: i});
    }

    //--------------------------------------------------------------
    // JSX GENERATING METHODS
    //--------------------------------------------------------------

    /* Returns the level config configuration shown directly under level
     * generation. */
    getLevelConfElement(id, levelConf) {
        let elem = null;
        const confType = levelConf.shown;
        if (confType.length > 0) {
            const conf = levelConf[confType];
            elem = Object.keys(conf).map(key => {
                const currVal = levelConf[confType][key];
                const newValue = currVal ? currVal : conf[key];
                const onChangeFunc =
                    this.onChangeLevelConf.bind(this, confType, key, id);
                if (typeof conf[key] !== 'function') {
                    return (
                        <label key={`${confType}--${key}`}>{key}
                            <input
                                id={`${id}--${confType}--${key}`}
                                name={`${id}--{confType}-${key}`}
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

    getLevelSelectElement() {
        const _types = ['arena', 'cellular', 'digger', 'divided', 'dungeon',
            'eller', 'empty', 'forest', 'icey', 'mountain', 'uniform', 'rogue',
            'ruins', 'rooms', 'town'];
        const elem = _types.map(type => {
            const key = 'key-sel-type-' + type;
            return <option key={key} value={type}>{type}</option>;
        });
        return elem;
    }

    getElementSelectElem() {
        const elements = Object.keys(RG.cellStyles.elements);
        const elem = elements.map(elemType => {
            if (elemType !== 'default') {
                const key = 'key-sel-element-' + elemType;
                return <option key={key} value={elemType}>{elemType}</option>;
            }
            return null;
        });
        return elem;
    }

    /* Returns the <option> dropdown menu elements for items/actors. */
    getSelectElem(type) {
        const items = this.parser.dbGet({categ: type});
        const elem = Object.values(items).map(item => {
            const key = `key-sel-${type}-${item.name}`;
            return <option key={key} value={item.name}>{item.name}</option>;
        });
        return elem;
    }

    getEditorPanelElement() {
        const levelConfElem = this.getLevelConfElement('main',
            this.state.levelConf);
        const levelSelectElem = this.getLevelSelectElement();
        const elementSelectElem = this.getElementSelectElem();
        const actorSelectElem = this.getSelectElem('actors');
        const itemSelectElem = this.getSelectElem('items');
        const subLevelConfElem = this.getLevelConfElement('sub',
            this.state.subLevelConf);
        return (
            <div className='game-editor-panel'>
                <div className='btn-div'>
                    <button onClick={this.generateWorld}>WorldGen!</button>
                </div>
                <div className='btn-div'>
                    <button onClick={this.generateMap}>Generate!</button>
                    <select
                        name='level-type'
                        onChange={this.onChangeMapType}
                        value={this.state.levelType}
                    >{levelSelectElem}
                    </select>
                    <label>Size:
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
                    </label>
                    <button onClick={this.invertMap}>Invert</button>
                    <button onClick={this.zoom.bind(this, '+')}>+</button>
                    <button onClick={this.zoom.bind(this, '-')}>-</button>
                    {levelConfElem}
                </div>
                <div className='btn-div'>
                    <button onClick={this.subGenerateMap}>SubGen!</button>
                    <select
                        name='sublevel-type'
                        onChange={this.onChangeSubType}
                        value={this.state.subLevelType}
                    >
                        {levelSelectElem}
                    </select>
                    <label>Size:
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
                    </label>
                    <label>Tiles:
                    <input
                        name='sublevel-tile-x'
                        onChange={this.onChangeSubTileX}
                        value={this.state.subLevelTileX}
                    />
                    <input
                        name='sublevel-tile-y'
                        onChange={this.onChangeSubTileY}
                        value={this.state.subLevelTileY}
                    />
                    </label>
                    {subLevelConfElem}
                </div>
                <div className='btn-div'>
                    <button onClick={this.generateActors}>Actors!</button>
                    <button onClick={this.generateItems}>Items!</button>
                    <input
                        name='gen-num-entities'
                        onChange={this.onChangeNumEntities}
                        value={this.state.numEntities}
                    />
                </div>
                <div className='btn-div'>
                    <button onClick={this.insertElement}>Insert element</button>
                    <select
                        name='insert-element'
                        onChange={this.onChangeElement}
                        value={this.state.elementType}
                    >{elementSelectElem}
                    </select>
                    <button onClick={this.insertActor}>Insert actor</button>
                    <select
                        name='insert-actor'
                        onChange={this.onChangeActor}
                        value={this.state.actorName}
                    >{actorSelectElem}
                    </select>
                    <button onClick={this.insertItem}>Insert item</button>
                    <select
                        name='insert-item'
                        onChange={this.onChangeItem}
                        value={this.state.itemName}
                    >{itemSelectElem}
                    </select>

                    <span>| X by Y</span>
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
            </div>
        );
    }

    getSimulationButtons() {
        let ctrlBtnClass = 'btn btn-xs';
        if (!this.state.simulationStarted) {
            ctrlBtnClass = 'btn btn-xs disabled';
        }
        return (
            <div className='btn-div'>

                <button
                    className='btn btn-xs'
                    onClick={this.simulateLevel}
                >Simulate
                </button>

                <button
                    className={ctrlBtnClass}
                    onClick={this.playSimulation}
                >Play
                </button>

                <button
                    className={ctrlBtnClass}
                    onClick={this.playFastSimulation}
                >>>>
                </button>

                <button
                    className={ctrlBtnClass}
                    onClick={this.pauseSimulation}
                >Pause
                </button>
                <button
                    className={ctrlBtnClass}
                    onClick={this.stopSimulation}
                >Stop
                </button>

                <div>
                    <label>Turns per frame:
                    <input
                        name='input-turns-per-frame'
                        onChange={this.onChangeTurnsPerFrame}
                        value={this.state.turnsPerFrame}
                    />
                    </label>
                </div>

                <p>Frame count: {this.state.frameCount}</p>
                <p>FPS: {this.state.fps}</p>
            </div>

        );
    }

    /* Creates the LHS panel for browsing levels. */
    getLevelList() {
        const levelList = this.state.levelList.map((level, i) => {
            const selectLevel = this.selectLevel.bind(this, level, i);
            const className = this.state.levelIndex === i
                ? 'list-group-item active' : 'list-group-item';

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
                </a>
            );
        });
        return levelList;
    }
}

GameEditor.propTypes = {
    mapShown: React.PropTypes.bool,
    toggleEditor: React.PropTypes.func
};

module.exports = GameEditor;
