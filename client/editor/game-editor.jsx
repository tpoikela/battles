
import React, {Component} from 'react';
import PropTypes from 'prop-types';

import EditorTopMenu from './editor-top-menu';
import EditorGameBoard from './editor-game-board';
import EditorLevelList from './editor-level-list';
import SimulationButtons from './simulation-buttons';

import GameMessages from '../jsx/game-messages';
import LevelSaveLoad from './level-save-load';
import Capital from '../data/capital';
import AbandonedFort, {abandonedFortConf} from '../data/abandoned-fort';
import DwarvenCity, {dwarvenCityConf} from '../data/dwarven-city';

const ROT = require('../../lib/rot');
ROT.Map.Wall = require('../../lib/map.wall');
const DungeonGenerator = require('../src/dungeon-generator');
const {CaveGenerator} = require('../src/cave-generator');
const MountainGenerator = require('../src/mountain-generator');

const Screen = require('../gui/screen');

const NO_VISIBLE_CELLS = [];

const RG = require('../src/rg');
const OW = require('../src/overworld.map');
RG.getOverWorld = require('../src//overworld');

const WorldConf = require('../src/world.creator');

const editorLevelTypes = [
  'Cave', 'Dungeon', 'MountainFace', 'MountainSummit',
  'abandoned_fort',
  'arena', 'castle', 'capital', 'cellular', 'cave', 'crypt',
  'digger', 'divided', 'dungeon', 'dwarven_city',
  'eller', 'empty', 'forest', 'icey', 'miner',
  'mountain', 'uniform', 'rogue',
  'ruins', 'rooms', 'summit', 'town', 'townwithwall', 'wall'
];

const boardViews = [
  'game-board-map-view-xxxxs',
  'game-board-map-view-xxxs',
  'game-board-map-view-xs',
  'game-board-map-view',
  'game-board-map-view-s',
  'game-board-player-view',
  'game-board-player-view-xl'
];

/* Returns all cells in a box between cells c1,c2 on the given map. */
const getSelection = (c0, c1, map) => {
    const [x0, y0] = [c0.getX(), c0.getY()];
    const [x1, y1] = [c1.getX(), c1.getY()];
    if (x0 === x1 && y0 === y1) {
      return [c0];
    }
    const bb = RG.Geometry.getBoxCornersForCells(c0, c1);
    const coord = RG.Geometry.getBox(bb.ulx, bb.uly, bb.lrx, bb.lry);
    const res = [];
    coord.forEach(xy => {
      res.push(map.getCell(xy[0], xy[1]));
    });
    return res;
};

const startSimulation = (startTime, level) =>
  () => (
    {
      level,
      startTime: startTime,
      simulationStarted: true,
      frameCount: 0
    }
  );

const updateLevelAndErrorMsg = (level, msg) => (
  () => ({
    level, errorMsg: msg
  })
);

/* Component for game/level editor. */
export default class GameEditor extends Component {

  constructor(props) {
    super(props);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    const state = {
      boardClassName: 'game-board-player-view',
      boardIndex: boardViews.indexOf('game-board-player-view'),
      lastTouchedConf: null,

      zoneType: 'city',
      zoneList: [],
      zoneConf: {shown: ''},

      levelX: 80,
      levelY: 50,
      levelType: 'Cave',

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
      selectMode: false,
      selectBegin: null,

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

      showAnimations: true,
      frameCount: 0,
      fps: 0,
      simulationStarted: false,
      simulationPaused: false,
      turnsPerSec: 1000,
      turnsPerFrame: 1,
      idCount: 0,
      updateMap: true,

      useRLE: true,
      savedLevelName: 'saved_level_from_editor.json'
    };

    this.screen = new Screen(state.levelX, state.levelY);

    // Create empty level and add to the editor
    state.levelConf.shown = state.levelType;
    state.levelConf[state.levelType] = this.getLevelConf(state.levelType);
    this.state = state; // Need to assign here, before createLevel

    const level = this.createLevel(state.levelType);
    level.getMap()._optimizeForRowAccess();
    level.editorID = state.idCount++;
    state.level = level;
    state.levelList.push(level);
    window.LEVEL = level;

    this.parser = RG.ObjectShell.getParser();

    this.intervalID = null;
    this.frameID = null;

    // Bind functions for callbacks
    this.setMsg = this.setMsg.bind(this);

    this.getLevelConf = this.getLevelConf.bind(this);
    this.createLevel = this.createLevel.bind(this);

    this.generateWorld = this.generateWorld.bind(this);
    this.generateZone = this.generateZone.bind(this);
    this.onChangeZoneType = this.onChangeZoneType.bind(this);

    this.generateLevel = this.generateLevel.bind(this);
    this.onChangeMapType = this.onChangeMapType.bind(this);

    this.subGenerateMap = this.subGenerateMap.bind(this);
    this.onChangeSubType = this.onChangeSubType.bind(this);

    this.generateActors = this.generateActors.bind(this);
    this.generateItems = this.generateItems.bind(this);
    this.setShownLevel = this.setShownLevel.bind(this);
    this.onCellClick = this.onCellClick.bind(this);
    this.onChangeCellSelectX = this.onChangeCellSelectX.bind(this);
    this.onChangeCellSelectY = this.onChangeCellSelectY.bind(this);

    this.onChangeInputInt = this.onChangeInputInt.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.insertElement = this.insertElement.bind(this);
    this.insertActor = this.insertActor.bind(this);
    this.insertItem = this.insertItem.bind(this);

    this.importConfig = this.importConfig.bind(this);
    this.exportConfig = this.exportConfig.bind(this);

    this.invertMap = this.invertMap.bind(this);
    this.simulateLevel = this.simulateLevel.bind(this);
    this.stepSimulation = this.stepSimulation.bind(this);
    this.playSimulation = this.playSimulation.bind(this);
    this.playFastSimulation = this.playFastSimulation.bind(this);
    this.pauseSimulation = this.pauseSimulation.bind(this);
    this.stopSimulation = this.stopSimulation.bind(this);

    this.onLoadCallback = this.onLoadCallback.bind(this);

    this.menuCallback = this.menuCallback.bind(this);
    this.addLevelToEditor = this.addLevelToEditor.bind(this);

    this.setEditorData = this.setEditorData.bind(this);


    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keypress', this.handleKeyDown, true);
    if (this.props.editorData) {
        const {allLevels} = this.props.editorData;
        if (allLevels && allLevels.length > 0) {
            this.state.levelList = allLevels;
        }
    }
  }

  onMouseDown(x, y) {
    if (!this.state.selectMode) {
      const cell = this.getCellCurrMap(x, y);
      this.setState({selectMode: true, selectBegin: cell, selectEnd: cell});
    }
  }

  getCellCurrMap(x, y) {
    const map = this.state.level.getMap();
    if (map.hasXY(x, y)) {
      return map.getCell(x, y);
    }
    return null;
  }

  getCurrMap() {
    return this.state.level.getMap();
  }

  onMouseUp(x, y) {
    if (this.state.selectMode) {
      const cell = this.getCellCurrMap(x, y);
      const stateUpdates = {
        selectMode: false, selectEnd: cell,
        cellSelectX: cell.getX(), cellSelectY: cell.getY()
      };
      if (this.state.selectBegin === this.state.selectEnd) {
        stateUpdates.selectedCell = [cell];
      }
      this.setState(stateUpdates);
    }
  }

  onMouseOver(x, y) {
    if (this.state.selectMode) {
      const cell = this.getCellCurrMap(x, y);
      if (cell) {
        const map = this.getCurrMap();
        const selectedCells = getSelection(this.state.selectBegin,
          cell, map);
        const dX = cell.getX() - this.state.selectBegin.getX();
        const dY = cell.getY() - this.state.selectBegin.getY();
        this.setState({selectedCell: selectedCells, selectEnd: cell,
            selectDiffX: dX, selectDiffY: dY});
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keypress', this.handleKeyDown, true);
  }

  setStateWithLevel(level, obj = {}) {
    level.getMap()._optimizeForRowAccess();
    this.setState(Object.assign({level}, obj));
  }

  /* Returns the first selected cell. */
  getFirstSelectedCell() {
    if (this.state.selectedCell) {
      if (this.state.selectedCell.length > 0) {
        return this.state.selectedCell[0];
      }
    }
    return null;
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
    else if (RG.KeyMap.inMoveCodeMap(keyCode)) {
      let mult = 1;
      if (keyCode >= ROT.VK_1 && keyCode <= ROT.VK_9) {
        mult = 10;
      }

      let cell = this.getFirstSelectedCell();
      if (this.state.selectMode) {
        cell = this.state.selectEnd;
      }

      if (cell) {
        const [x0, y0] = [cell.getX(), cell.getY()];
        const dir = RG.KeyMap.getDir(keyCode);
        const newX = x0 + dir[0] * mult;
        const newY = y0 + dir[1] * mult;
        const map = this.getCurrMap();

        if (map.hasXY(newX, newY)) {
          const newCell = map.getCell(newX, newY);
          if (this.state.selectMode) {
            const selectedCells = getSelection(this.state.selectBegin,
              newCell, map);
            const dX = newX - this.state.selectBegin.getX();
            const dY = newY - this.state.selectBegin.getY();
            this.setState({selectedCell: selectedCells, selectEnd: newCell,
                selectDiffX: dX, selectDiffY: dY});
          }
          else {
            this.setState({
              selectedCell: [newCell],
              cellSelectX: newX, cellSelectY: newY
            });
          }
        }
      }
    }
    else if (keyCode === RG.VK_s) {
      const cell = this.getFirstSelectedCell();
      const selectMode = !this.state.selectMode;
      if (!this.state.selectMode) {
        if (cell) {
          this.setState({selectMode, selectBegin: cell, selectEnd: cell});
        }
      }
      else if (cell) {
        this.setState({selectMode, selectEnd: cell});
      }
    }
  }


  /* Returns current level. */
  getLevel() {
    if (this.state.levelList.length) {
      return this.state.levelList[this.state.levelIndex];
    }
    return null;
  }

  onCellClick(x, y) {
    const map = this.getCurrMap();
    if (map.hasXY(x, y)) {
      const cell = map.getCell(x, y);
      console.log(`Clicked ${x},${y} ${JSON.stringify(cell)}`);

      if (cell.hasActors()) {
        console.log(cell.getActors()[0]);
        console.log(JSON.stringify(cell.getActors()[0]));
      }
    }
  }


  /* Generates a world scale map using overworld algorithm and adds it to the
   * editor. Does not generate any sublevels or zones. */
  generateWorld() {
    const mult = 1;
    const owConf = {
      worldX: mult * this.state.levelX,
      worldY: mult * this.state.levelY,
      yFirst: false,
      topToBottom: false,
      stopOnWall: true,
      nVWalls: [0.8],
      nHWalls: 3,
      owTilesX: mult * 40,
      owTilesY: mult * 40
    };
    const overworld = OW.createOverWorld(owConf);
    const worldAndConf = RG.OverWorld.createOverWorldLevel(
      overworld, owConf);
    const worldLevel = worldAndConf[0];
    this.addLevelToEditor(worldLevel);
  }

  generateZone() {
    const zoneType = this.state.zoneType;
    const fact = new RG.Factory.World();
    const featConf = this.state.zoneConf[zoneType];

    try {
      let feat = null;
      switch (zoneType) {
        case 'branch': feat = fact.createBranch(featConf); break;
        case 'city': feat = fact.createCity(featConf); break;
        case 'dungeon': feat = fact.createDungeon(featConf); break;
        case 'face': feat = fact.createMountainFace(featConf); break;
        case 'mountain': feat = fact.createMountain(featConf); break;
        case 'quarter': feat = fact.createCityQuarter(featConf); break;
        default: console.log('No legal zoneType given');
      }
      this.addZoneToEditor(zoneType, feat);
    }
    catch (e) {
      this.setState({errorMsg: e.message});
    }
  }

  /* Generates a new level map and adds it to the editor.  */
  generateLevel() {
    const levelType = this.state.levelType;
    const level = this.createLevel(levelType);
    this.addLevelToEditor(level);
  }

  /* Creates the level of given type. */
  createLevel(levelType) {
    let conf = {};
    if (this.state.levelConf.hasOwnProperty(levelType)) {
      conf = this.state.levelConf[levelType];
    }

    conf.transpose = false;

    const [cols, rows] = [this.state.levelX, this.state.levelY];

    conf.parser = this.parser;
    let level = null;
    if (levelType === 'capital') {
      level = new Capital(cols, rows, conf).getLevel();
    }
    else if (levelType === 'abandoned_fort') {
      level = new AbandonedFort(cols, rows, conf).getLevel();
    }
    else if (levelType === 'dwarven_city') {
      level = new DwarvenCity(cols, rows, conf).getLevel();
    }
    else if (levelType === 'Dungeon') {
      level = new DungeonGenerator().create(cols, rows, conf);
    }
    else if (levelType === 'Cave') {
      level = new CaveGenerator().create(cols, rows, conf);
    }
    else if (levelType === 'MountainFace') {
      level = new MountainGenerator().createFace(cols, rows, conf);
    }
    else if (levelType === 'MountainSummit') {
      level = new MountainGenerator().createSummit(cols, rows, conf);
    }
    else {
      level = RG.FACT.createLevel(
        levelType, this.state.levelX, this.state.levelY, conf);
    }
    delete conf.parser;
    return level;
  }

  /* Adds one level to the editor and updates the state. */
  addLevelToEditor(level) {
    level.getMap()._optimizeForRowAccess();
    level.editorID = this.state.idCount++;

    const levelList = this.state.levelList;
    levelList.push(level);
    // Show the newly added level immediately
    const levelIndex = levelList.length - 1;
    this.setShownLevel({level: level, levelList, levelIndex});
  }

  addZoneToEditor(type, feat) {
    const levels = feat.getLevels();
    const levelList = this.state.levelList;
    levels.forEach(level => {
      level.getMap()._optimizeForRowAccess();
      level.editorID = this.state.idCount++;
      levelList.push(level);
    });
    const zoneConf = this.state.zoneConf;
    zoneConf.shown = type;
    const levelIndex = this.state.levelIndex + 1;
    this.setShownLevel({level: levels[0], levelList, levelIndex, zoneConf});
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
      const x0 = this.getFirstSelectedCell().getX();
      const y0 = this.getFirstSelectedCell().getY();

      // Iterate through tiles in x-direction (tx) and tiles in
      // y-direction (ty). Compute upper left x,y for each sub-level.
      let errorMsg = '';
      try {
        for (let tx = 0; tx < this.state.subLevelTileX; tx++) {
          for (let ty = 0; ty < this.state.subLevelTileY; ty++) {
            const xSub = x0 + tx * subWidth;
            const ySub = y0 + ty * subHeight;
            const subLevel = RG.FACT.createLevel(
              levelType, subWidth, this.state.subLevelY, conf);
            RG.Geometry.mergeLevels(level, subLevel, xSub, ySub);
          }
        }
      }
      catch (e) {
        errorMsg = e.message;
        console.error(e.message);
      }

      level.getMap()._optimizeForRowAccess();
      this.setState(updateLevelAndErrorMsg(level, errorMsg));
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
    this.setStateWithLevel(level);
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
      actorsPerLevel: this.state.numEntities,
      func: (actor) => (actor.danger < 100)
    };

    RG.FACT.setParser(RG.ObjectShell.getParser());
    RG.FACT.addNRandActors(level, this.parser, conf);
    this.setStateWithLevel(level);
  }

  debugMsg(msg) {
    if (this.state.debug) {
      console.log('[DEBUG] ' + msg);
    }
  }

  getBBoxForInsertion() {
    const c0 = this.state.selectBegin;
    const c1 = this.state.selectEnd;
    return RG.Geometry.getBoxCornersForCells(c0, c1);
  }

  insertElement() {
    const {ulx, uly, lrx, lry} = this.getBBoxForInsertion();
    this.debugMsg('insertElement: ' + `${ulx}, ${uly}, ${lrx}, ${lry}`);
    const level = this.state.level;
    try {
      RG.Geometry.insertElements(level, this.state.elementType,
        {ulx, uly, lrx, lry});
    }
    catch (e) {
      this.setState({errorMsg: e.message});
    }
    this.setStateWithLevel(level);
  }

  insertActor() {
    const {ulx, uly, lrx, lry} = this.getBBoxForInsertion();
    this.debugMsg('insertActor: ' + `${ulx}, ${uly}, ${lrx}, ${lry}`);
    const level = this.state.level;
    try {
      RG.Geometry.insertActors(level, this.state.actorName,
        {ulx, uly, lrx, lry}, this.parser);
    }
    catch (e) {
      this.setState({errorMsg: e.message});
    }
    this.setStateWithLevel(level);
  }

  insertItem() {
    const {ulx, uly, lrx, lry} = this.getBBoxForInsertion();
    const level = this.state.level;
    try {
      RG.Geometry.insertItems(level, this.state.itemName,
        {ulx, uly, lrx, lry}, this.parser);
    }
    catch (e) {
      this.setState({errorMsg: e.message});
    }
    this.setStateWithLevel(level);
  }

  /* Inverts the map base elements (floor/wall) */
  invertMap() {
    const level = this.state.level;
    const map = level.getMap();
    RG.Map.CellList.invertMap(map);
    this.setStateWithLevel(level);
  }

  setMsg(msg) {
    this.setState({errorMsg: msg});
  }

  render() {
    const mapShown = this.props.mapShown;
    let rowClass = 'cell-row-div-player-view';
    if (mapShown) {rowClass = 'cell-row-div-map-view';}
    if (this.state.boardClassName === 'game-board-map-view-xxxs') {
      rowClass = 'cell-row-div-map-view-xxxs';
    }

    let map = null;
    let mapSizeX = null;
    if (this.state.level) {
      map = this.state.level.getMap();
    }

    if (this.state.selectedCell) {
      this.screen.setSelectedCell(this.state.selectedCell);
    }

    if (map) {
      mapSizeX = map.cols;
      if (this.state.useRLE) {
        this.screen.renderFullMapWithRLE(map);
      }
      else {
        this.screen.renderFullMap(map);
      }
    }
    else {
      this.screen.clear();
    }

    const errorMsg = this.getEditorMsg();
    const simulationButtons = this.getSimulationButtons();

    let message = [];
    if (this.state.simulationStarted) {
      if (this.game.hasNewMessages()) {
        message = this.game.getMessages();
      }
    }

    const isPanelRendered = !this.state.simulationStarted ||
      (this.state.simulationStarted && this.state.simulationPaused);
    let editorPanelElem = null;
    if (isPanelRendered) {
      editorPanelElem = this.getEditorPanelElement();
    }

    return (
      <div className='game-editor-main-div'>
        <p className='text-primary'>
          Battles Game Editor: {errorMsg}
        </p>

        <EditorTopMenu
            addLevel={this.addLevelToEditor}
            level={this.state.level}
            menuCallback={this.menuCallback}
            toggleEditor={this.props.toggleEditor}
        />

        {isPanelRendered && editorPanelElem}

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
          <div className='col-md-2'>
              <EditorLevelList
                  levelList={this.state.levelIndex}
                  levelList={this.state.levelList}
                  setShownLevel={this.setShownLevel}
              />
          </div>

          <div className='col-md-10'>
            <div className='game-editor-board-div'>
              <EditorGameBoard
                boardClassName={this.state.boardClassName}
                onCellClick={this.onCellClick}
                onMouseDown={this.onMouseDown}
                onMouseOver={this.onMouseOver}
                onMouseUp={this.onMouseUp}
                rowClass={rowClass}
                screen={this.screen}
                sizeX={mapSizeX}
                updateMap={this.state.updateMap}
                useRLE={this.state.useRLE}
              />
            </div>
          </div>
        </div>

        <div className='game-editor-bottom-btn'>
          {simulationButtons}

          <div className='btn-div'>
            <LevelSaveLoad
                objData={this.state.level}
                onLoadCallback={this.onLoadCallback}
                savedObjName={this.state.savedLevelName}
                setMsg={this.setMsg}
            />

            <div>
              <button
                className='btn btn-danger btn-lg'
                onClick={this.props.toggleEditor}
              >
                Close editor
              </button>
              <button
                className='btn btn-success btn-lg'
                onClick={this.setEditorData}
              >
                Set game data
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  setEditorData() {
    this.props.setEditorData(this.state.levelList, this.state.levelList);
  }

  onLoadCallback(data) {
    const fromJSON = new RG.Game.FromJSON();
    const level = fromJSON.restoreLevel(data);
    fromJSON.restoreEntityData();
    this.addLevelToEditor(level);
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
   * (level type) after level (sub) type is changed in the editor. */
  modifyLevelConf(value, levelConf) {
    levelConf.shown = value;
    if (!levelConf[value]) {
      levelConf[value] = this.getLevelConf(value);
    }
  }

  getLevelConf(value) {
    console.log('getLevelConf with', value);
    if (value === 'town') {
      return RG.Factory.cityConfBase({});
    }
    else if (value === 'townwithwall') {
      return RG.Factory.cityConfBase({});
    }
    else if (value === 'forest') {
      return {nForests: 5, forestSize: 100, ratio: 0.5, factor: 6};
    }
    else if (value === 'mountain') {
      return RG.Map.Generator.getOptions('mountain');
    }
    else if (value === 'crypt' || value === 'castle') {
      return {
        tilesX: 12, tilesY: 7, roomCount: 30,
        genParams: [2, 2, 2, 2]
      };
    }
    else if (value === 'wall') {
      const wallGen = new ROT.Map.Wall();
      return wallGen._options;
    }
    else if (value === 'abandoned_fort') {
      return abandonedFortConf;
    }
    else if (value === 'dwarven_city') {
      return dwarvenCityConf;
    }
    else if (value === 'Dungeon') {
      return DungeonGenerator.getOptions();
    }
    else if (value === 'Cave') {
      return CaveGenerator.getOptions();
    }
    else if (value === 'cave') {
      const caveGen = new ROT.Map.Miner();
      const conf = caveGen._options;
      delete conf.rng;
      return conf;
    }
    else if (value === 'MountainFace') {
      return MountainGenerator.getFaceOptions();
    }
    else if (value === 'MountainSummit') {
      return MountainGenerator.getSummitOptions();
    }
    else {
      return {};
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

  onInputChange(evt) {
      const {name} = evt.target;
      let {value} = evt.target;
      const [tag, stateVar] = name.split('-');
      if (tag === 'checkbox') {
          value = evt.target.checked;
      }
      console.log('name', name);
      console.log('value', value);
      console.log('checked', evt.target.checked);
      console.log('stateVar', stateVar);
      if (stateVar) {
          if (this.state.hasOwnProperty(stateVar)) {
              this.setState({[stateVar]: value});
          }
          else {
              console.warn(`onInputChange: <${tag}> No ${stateVar} in state`);
          }
      }
  }

  onChangeLevelConf(confType, key, idHead) {
    const id = `#${idHead}--${confType}--${key}`;
    const inputElem = document.querySelector(id);
    const value = inputElem.value;
    let conf = null;

    if (idHead === 'main') {conf = this.state.levelConf;}
    else if (idHead === 'zone') {conf = this.state.zoneConf;}
    else {conf = this.state.subLevelConf;}

    if (key.match(/(\w+)Func/)) {
      // TODO how to handle functions
    }
    else if (isNaN(value)) {
      conf[confType][key] = value;
    }
    else {
      conf[confType][key] = +value;
    }

    if (idHead === 'main') {
      this.setState({levelConf: conf});
    }
    else if (idHead === 'zone') {
      this.setState({zoneConf: conf});
    }
    else {
      this.setState({subLevelConf: conf});
    }
  }

  onChangeZoneType(evt) {
    const type = evt.target.value;
    const featConf = WorldConf.getBaseConf(type);
    const zoneConf = this.state.zoneConf;
    zoneConf[type] = featConf;
    zoneConf.shown = type;
    this.setState({zoneType: type, zoneConf,
      lastTouchedConf: zoneConf});
  }

  onChangeMapType(evt) {
    const value = evt.target.value;
    const levelType = value;
    const levelConf = this.state.levelConf;
    this.modifyLevelConf(value, levelConf);
    this.setState({levelType, levelConf, lastTouchedConf: levelConf});
  }

  getInt(value, base) {
    const retValue = parseInt(value, base);
    if (Number.isInteger(retValue)) {
      return retValue;
    }
    return '';
  }

  onChangeSubType(evt) {
    const value = evt.target.value;
    const subLevelConf = this.state.subLevelConf;
    this.modifyLevelConf(value, subLevelConf);
    this.setState({subLevelType: value, subLevelConf,
      lastTouchedConf: subLevelConf});
  }

  onChangeInputInt(evt) {
      const [tag, stateVar] = evt.target.name.split('-');
      if (tag === 'input') {
          const value = this.getInt(evt.target.value, 10);
          this.setState({[stateVar]: value});
      }
  }

  onChangeCellSelectX(evt) {
    const newX = this.getInt(evt.target.value, 10);
    const cell = this.getFirstSelectedCell();
    const update = {cellSelectX: newX};
    const map = this.state.level.getMap();
    if (Number.isInteger(newX) && cell) {
      if (map.hasXY(newX, cell.getY())) {
        const newCell = map.getCell(newX, cell.getY());
        if (newCell) {
          update.selectedCell = [newCell];
        }
      }
    }
    this.setState(update);
  }

  onChangeCellSelectY(evt) {
    const newY = this.getInt(evt.target.value, 10);
    const cell = this.getFirstSelectedCell();
    const update = {cellSelectY: newY};
    const map = this.state.level.getMap();
    if (Number.isInteger(newY) && cell) {
      if (map.hasXY(cell.getX(), newY)) {
        const newCell = map.getCell(cell.getX(), newY);
        if (newCell) {
          update.selectedCell = [newCell];
        }
      }
    }
    this.setState(update);
  }

  //----------------------------------------------------------------
  // SIMULATION METHODS
  //----------------------------------------------------------------

  playAnimation() {
    if (this.game.hasAnimation()) {
      const anim = this.game.getAnimationFrame();
      this.setState({render: true, animation: anim});
      this.animationID = requestAnimationFrame(
        this.playAnimation.bind(this));
    }
    else {
      // Animation is finished
      this.setState({render: true, animation: null});
      // this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    }
  }

  /* Starts a simulation of the level. */
  simulateLevel(step = false) {
    if (!this.state.level) {
      const msg = 'You must create a level before simulation!';
      this.setState({errorMsg: msg});
    }
    else if (!this.state.simulationStarted) {

      this.game = new RG.Game.Main();
      window.GAME = this.game; // Handle for debugging

      const fromJSON = new RG.Game.FromJSON();
      const json = this.state.level.toJSON();
      const levelClone = fromJSON.restoreLevel(json);
      fromJSON.restoreEntityData();

      levelClone.getMap()._optimizeForRowAccess();
      levelClone.editorID = this.state.idCount++;

      this.game.addLevel(levelClone);
      this.game.addActiveLevel(levelClone);
      if (this.state.showAnimations) {
        this.game.setAnimationCallback(this.playAnimation.bind(this));
      }

      const startTime = new Date().getTime();
      this.setState(startSimulation(startTime, levelClone));
      if (!step) {
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
      }
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
    this.setShownLevel({level: this.game.getLevels()[0]});
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

  stepSimulation() {
    if (this.state.simulationStarted) {
      this.game.simulateGame();
      this.setShownLevel({level: this.game.getLevels()[0]});
    }
    else {
      this.simulateLevel(true);
      // console.error('Start simulation first using Simulate');
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

  /* Stops the simulation and deletes the game. */
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
      this.game = null;
      window.GAME = null;
      delete this.game;
      this.setShownLevel({level: this.getLevel(),
        simulationStarted: false, simulationPaused: false});
    }
  }

  setShownLevel(args) {
    window.LEVEL = args.level;
    this.setState(args);
  }

  //--------------------------------------------------------------
  // JSX GENERATING METHODS
  //--------------------------------------------------------------

  /* Returns the config element shown directly under level
   * generation. */
  getConfElement(id, levelConf) {
    let elem = null;
    const confType = levelConf.shown;
    if (confType.length > 0) {
      if (!levelConf.hasOwnProperty(confType)) {
        console.error(`No conf for level type ${confType}`);
      }
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
    const elem = editorLevelTypes.map(type => {
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

  getZoneSelectElem() {
    const featNames = ['branch', 'city', 'dungeon', 'face', 'mountain',
      'quarter'];
    const features = Object.values(featNames).map(type => {
      const key = `key-sel-feature-${type}`;
      return <option key={key} value={type}>{type}</option>;
    });
    return features;

  }

    /* Returns the markup for editor panel containing all selection and
     * configuration options. */
  getEditorPanelElement() {
    const zoneSelectElem = this.getZoneSelectElem();
    const zoneConfElem = this.getConfElement('zone',
      this.state.zoneConf);
    const levelConfElem = this.getConfElement('main',
      this.state.levelConf);
    const levelSelectElem = this.getLevelSelectElement();
    const elementSelectElem = this.getElementSelectElem();
    const actorSelectElem = this.getSelectElem('actors');
    const itemSelectElem = this.getSelectElem('items');
    const subLevelConfElem = this.getConfElement('sub',
      this.state.subLevelConf);

    return (
      <div className='game-editor-panel'>
        <div className='row'>
          <div className='col-md-6'>

            <div className='btn-div'>
              <button
                id='btn-gen-world'
                onClick={this.generateWorld}
              >OverWorld</button>

              <span>Zoom In/Out:
                <button
                  id='btn-zoom-in'
                  onClick={this.zoom.bind(this, '+')}
                >+</button>
                <button
                  id='btn-zoom-out'
                  onClick={this.zoom.bind(this, '-')}
                >-</button>
                <label>
                <input
                    checked={this.state.updateMap}
                    name='checkbox-updateMap'
                    onChange={this.onInputChange}
                    type='checkbox'
                />
                Update map
                </label>
              </span>
            </div>

            <div className='btn-div'>
              <button
                id='btn-gen-zone'
                onClick={this.generateZone}
              >Zone!</button>

              <select
                name='feature-type'
                onChange={this.onChangeZoneType}
                value={this.state.zoneType}
              >{zoneSelectElem}
              </select>
              {zoneConfElem}
            </div>

            <div className='btn-div'>
              <button
                id='btn-gen-level'
                onClick={this.generateLevel}
              >Level!</button>
              <select
                name='level-type'
                onChange={this.onChangeMapType}
                value={this.state.levelType}
              >{levelSelectElem}
              </select>
              <label>Size:
                <input
                  name='input-levelX'
                  onChange={this.onChangeInputInt}
                  value={this.state.levelX}
                />
                <input
                  name='input-levelY'
                  onChange={this.onChangeInputInt}
                  value={this.state.levelY}
                />
              </label>
              <button onClick={this.invertMap}>Invert</button>
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
                  name='input-subLevelX'
                  onChange={this.onChangeInputInt}
                  value={this.state.subLevelX}
                />
                <input
                  name='input-subLevelY'
                  onChange={this.onChangeInputInt}
                  value={this.state.subLevelY}
                />
              </label>
              <label>Tiles:
                <input
                  name='input-subLevelTileX'
                  onChange={this.onChangeInputInt}
                  value={this.state.subLevelTileX}
                />
                <input
                  name='input-subLevelTileY'
                  onChange={this.onChangeInputInt}
                  value={this.state.subLevelTileY}
                />
              </label>
              {subLevelConfElem}
            </div>

            <div className='btn-div'>
              <button
                id='btn-gen-actors'
                onClick={this.generateActors}
              >Actors!</button>

              <button
                id='btn-gen-items'
                onClick={this.generateItems}
              >Items!</button>
              <input
                name='input-numEntities'
                onChange={this.onChangeInputInt}
                value={this.state.numEntities}
              />
            </div>

            <div className='btn-div'>
              <button
                id='btn-insert-element'
                onClick={this.insertElement}
              >Insert element</button>
              <select
                name='input-elementType'
                onChange={this.onInputChange}
                value={this.state.elementType}
              >{elementSelectElem}
              </select>
              <button
                id='btn-insert-actor'
                onClick={this.insertActor}
              >Insert actor</button>
              <select
                name='input-actorName'
                onChange={this.onInputChange}
                value={this.state.actorName}
              >{actorSelectElem}
              </select>
            </div>

            <div className='btn-div'>
              <button
                id='btn-insert-item'
                onClick={this.insertItem}
              >Insert item</button>
              <select
                name='input-itemName'
                onChange={this.onInputChange}
                value={this.state.itemName}
              >{itemSelectElem}
              </select>
              <span>| X by Y</span>
              <input
                name='input-insertXWidth'
                onChange={this.onChangeInputInt}
                value={this.state.insertXWidth}
              />
              <input
                name='input-insertYWidth'
                onChange={this.onChangeInputInt}
                value={this.state.insertYWidth}
              />
            </div>

          </div>
          <div className='col-md-6'>
            <div>
              <p>Template/Config here</p>
              <textarea
                name='input-confTemplText'
                onChange={this.onInputChange}
                rows={5}
                value={this.state.confTemplText}
              />
              <button onClick={this.importConfig}>Import</button>
              <button onClick={this.exportConfig}>Export</button>
            </div>

            <div className='cell-selection'>
              <span>Selection:</span>
              <input
                name='cell-select-x'
                onChange={this.onChangeCellSelectX}
                value={this.state.cellSelectX}
              />
              <input
                name='cell-select-y'
                onChange={this.onChangeCellSelectY}
                value={this.state.cellSelectY}
              />
            </div>

            <div className='selection-diff'>
              <span>dX/dY:</span>
                <input
                  name='cell-select-diff-x'
                  readOnly={true}
                  type='text'
                  value={this.state.selectDiffX}
                />
                <input
                  name='cell-select-diff-x'
                  readOnly={true}
                  type='text'
                  value={this.state.selectDiffY}
                />
            </div>

          </div>
        </div>
      </div>
    );
  }

  getSimulationButtons() {
    return (
      <div className='btn-div'>

        <SimulationButtons
          menuCallback={this.menuCallback}
          simulationStarted={this.state.simulationStarted}
        />

        <div>
          <label>Turns per frame:
            <input
              name='input-turnsPerFrame'
              onChange={this.onChangeInputInt}
              value={this.state.turnsPerFrame}
            />
          </label>
        </div>

        <p>Frame count: {this.state.frameCount}</p>
        <p>FPS: {this.state.fps}</p>
      </div>

    );
  }

  //-----------------------------
  // Templates + Config stuff
  //-----------------------------

  importConfig() {
    if (this.state.lastTouchedConf) {
      const shown = this.state.lastTouchedConf.shown;
      const conf = this.state.lastTouchedConf[shown];
      const str = JSON.stringify(conf, null, 1);
      this.setState({confTemplText: str});
    }
  }

  exportConfig() {
    try {
      const conf = JSON.parse(this.state.confTemplText);
      const lastTouchedConf = this.state.lastTouchedConf;
      const shown = lastTouchedConf.shown;
      lastTouchedConf[shown] = conf;
      this.setState({lastTouchedConf});
    }
    catch (e) {
      this.setState({errorMsg: e.message});
    }
  }

  menuCallback(cmd, args) {
    if (typeof this[cmd] === 'function') {
      if (Array.isArray(args)) {
          if (args.length === 1) {
              this[cmd](args);
          }
          else {
              this[cmd](...args);
          }
      }
      else {
          this[cmd](args);
      }
    }
    else {
      console.error(`${cmd} not a function in Top`);
      console.error(`Called with args ${args}`);
    }
  }

}

GameEditor.propTypes = {
  editorData: PropTypes.object,
  mapShown: PropTypes.bool,
  setEditorData: PropTypes.func.isRequired,
  toggleEditor: PropTypes.func
};
