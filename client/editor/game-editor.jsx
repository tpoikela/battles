
const React = require('react');
const ROT = require('../../lib/rot');
const FileSaver = require('file-saver');

const GameBoard = require('../jsx/game-board');
const GameMessages = require('../jsx/game-messages');

const RG = require('../src/battles');
const Screen = require('../gui/screen');

const RGEffects = require('../data/effects');
const RGObjects = require('../data/battles_objects');

const NO_VISIBLE_CELLS = [];

const createOverWorld = RG.OverWorld.createOverWorld;
const WorldConf = require('../src/world.creator');

/*
 * Sketch to specify the menus in more sane way than jsx.
 */
/*
const topMenuConf = {
    File: {
        Save: 'callback1',
        Load: 'callback2',
        Quit: 'callback3'
    },
    Edit: {

    },
    Select: {
    },
    View: {
      // No actual zooming supported
        'Size +':
        'Size -':
        'Size fit':
        'Size max':
        'Size min':
    },
    Tools: {
    },
    Settings: {

    }
};
*/

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

/* Component for game/level editor. */
class GameEditor extends React.Component {

  constructor(props) {
    super(props);

    const state = {
      boardClassName: 'game-board-player-view',
      boardIndex: 3, // Points to boardViews array
      fontSize: 16,

      lastTouchedConf: null,

      featureType: 'city',
      featureList: [],
      featureConf: {shown: ''},

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

      showAnimations: false,
      frameCount: 0,
      fps: 0,
      simulationStarted: false,
      simulationPaused: false,
      turnsPerSec: 1000,
      turnsPerFrame: 1,
      idCount: 0,

      useRLE: true,
      savedLevelName: 'saved_level_from_editor.json'
    };

    this.screen = new Screen(state.levelX, state.levelY);
    const level = RG.FACT.createLevel(state.levelType,
      state.levelX, state.levelY);
    level.getMap()._optimizeForRowAccess();

    level.editorID = state.idCount++;
    state.level = level;
    state.levelList.push(level);

    this.state = state;

    this.parser = new RG.ObjectShell.Parser();
    this.parser.parseShellData(RGEffects);
    this.parser.parseShellData(RGObjects);

    this.intervalID = null;
    this.frameID = null;

    // Bind functions for callbacks
    this.generateWorld = this.generateWorld.bind(this);
    this.generateFeature = this.generateFeature.bind(this);
    this.onChangeFeatureType = this.onChangeFeatureType.bind(this);

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

    this.saveLevel = this.saveLevel.bind(this);
    this.loadLevel = this.loadLevel.bind(this);

    this.onCellClick = this.onCellClick.bind(this);

    this.insertElement = this.insertElement.bind(this);
    this.onChangeElement = this.onChangeElement.bind(this);
    this.insertActor = this.insertActor.bind(this);
    this.onChangeActor = this.onChangeActor.bind(this);
    this.insertItem = this.insertItem.bind(this);
    this.onChangeItem = this.onChangeItem.bind(this);

    this.onChangeInsertXWidth = this.onChangeInsertXWidth.bind(this);
    this.onChangeInsertYWidth = this.onChangeInsertYWidth.bind(this);

    this.importConfig = this.importConfig.bind(this);
    this.exportConfig = this.exportConfig.bind(this);
    this.onChangeConfTemplText = this.onChangeConfTemplText.bind(this);

    this.invertMap = this.invertMap.bind(this);
    // this.onChangeLevelConf = this.onChangeLevelConf.bind(this);
    this.simulateLevel = this.simulateLevel.bind(this);
    this.playSimulation = this.playSimulation.bind(this);
    this.playFastSimulation = this.playFastSimulation.bind(this);
    this.pauseSimulation = this.pauseSimulation.bind(this);
    this.stopSimulation = this.stopSimulation.bind(this);
    this.onChangeTurnsPerFrame = this.onChangeTurnsPerFrame.bind(this);

    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.deleteLevel = this.deleteLevel.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keypress', this.handleKeyDown, true);
  }

  componentWillUnMount() {
    document.removeEventListener('keypress', this.handleKeyDown);
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

  /* Returns current level */
  getLevel() {
    if (this.state.levelList.length) {
      return this.state.levelList[this.state.levelIndex];
    }
    return null;
  }

  onCellClick(x, y) {
    const map = this.state.level.getMap();
    if (map.hasXY(x, y)) {
      const cell = map.getCell(x, y);
      console.log(`Clicked ${x},${y} ${JSON.stringify(cell)}`);
      console.log(cell.toString());

      if (cell.hasActors()) {
        console.log(cell.getActors()[0]);
        console.log(JSON.stringify(cell.getActors()[0]));
      }

      this.screen.setSelectedCell(cell);
      this.setState({selectedCell: cell});
    }
  }

  /* Converts the rendered level to JSON and puts that into localStorage.*/
  saveLevel() {
    const json = this.state.level.toJSON();
    try {
      /* eslint-disable */
      const isFileSaverSupported = !!new Blob;
      /* eslint-enable */
      if (isFileSaverSupported) {
        const date = new Date().getTime();
        const fname = `${date}_${this.state.savedLevelName}.json`;
        const text = JSON.stringify(json);
        const blob = new Blob([text],
          {type: 'text/plain;charset=utf-8'});
        FileSaver.saveAs(blob, fname);
      }
    }
    catch (e) {
      let msg = 'No Blob support in browser. Saving to localStorage.\n';
      msg += 'You can visit /level.html to view the JSON.';
      localStorage.setItem('savedLevel', JSON.stringify(json));
      this.setState({errorMsg: msg});
    }
  }

  /* Loads a user file and converts that into a level, which will be shown
   * if the loading was successful. */
  loadLevel() {
    const fileList = document.querySelector('#level-file-input').files;
    console.log('Filelist has ' + fileList.length + ' files');

    const file = fileList[0];
    for (const f in file) {
      if (f) {
        console.log(f + '->' + JSON.stringify(file[f]));
      }
    }
    if (file) {
      console.log(JSON.stringify(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result;

        console.log('FileReader text: ' + text);
        try {
          // Many things can go wrong: Not JSON, not a valid level..
          const json = JSON.parse(text);
          const fromJSON = new RG.Game.FromJSON();
          const level = fromJSON.createLevel(json);
          this.addLevelToEditor(level);
        }
        catch (e) {
          const msg = 'File: Not valid JSON or level: ' + e.message;
          this.setState({errorMsg: msg});
        }
      };
      reader.onerror = (e) => {
        const msg = 'Filereader error: ' + e;
        this.setState({errorMsg: msg});
      };

      reader.readAsText(file);
    }
    else {
      const msg = 'Could not get the file.';
      this.setState({errorMsg: msg});
    }
  }

  /* Generates a world scale map using overworld algorithm and adds it to the
   * editor. */
  generateWorld() {
    const mult = 1;
    const conf = {
      worldX: mult * this.state.levelX,
      worldY: mult * this.state.levelY,
      yFirst: false,
      topToBottom: false,
      stopOnWall: true,
      nVWalls: [0.8],
      owTilesX: mult * 40,
      owTilesY: mult * 20
    };
    const levelAndConf = createOverWorld(conf);
    this.addLevelToEditor(levelAndConf[0]);
  }

  generateFeature() {
    const featureType = this.state.featureType;
    console.log('Adding feature type ' + featureType);
    const fact = new RG.Factory.World();
    const featConf = this.state.featureConf[featureType];

    let feat = null;
    switch (featureType) {
      case 'branch': feat = fact.createBranch(featConf); break;
      case 'city': feat = fact.createCity(featConf); break;
      case 'dungeon': feat = fact.createDungeon(featConf); break;
      case 'face': feat = fact.createMountainFace(featConf); break;
      case 'mountain': feat = fact.createDungeon(featConf); break;
      case 'quarter': feat = fact.createCityQuarter(featConf); break;
      default: console.log('No legal featureType given');
    }
    this.addFeatureToEditor(featureType, feat);
  }

  /* Generates a new level map and adds it to the editor.  */
  generateMap() {
    const levelType = this.state.levelType;
    let conf = {};
    if (this.state.levelConf.hasOwnProperty(levelType)) {
      conf = this.state.levelConf[levelType];
    }

    conf.parser = this.parser;
    const level = RG.FACT.createLevel(
      levelType, this.state.levelX, this.state.levelY, conf);
    delete conf.parser;
    this.addLevelToEditor(level);
  }

  /* Adds one level to the editor and updates the state. */
  addLevelToEditor(level) {
    level.getMap()._optimizeForRowAccess();
    level.editorID = this.state.idCount++;

    const levelList = this.state.levelList;
    levelList.push(level);
    // Show the newly added level immediately
    const levelIndex = levelList.length - 1;
    this.setState({level: level, levelList, levelIndex});
  }

  addFeatureToEditor(type, feat) {
    const levels = feat.getLevels();
    const levelList = this.state.levelList;
    levels.forEach(level => {
      level.getMap()._optimizeForRowAccess();
      level.editorID = this.state.idCount++;
      levelList.push(level);
    });
    const featureConf = this.state.featureConf;
    featureConf.shown = type;
    const levelIndex = this.state.levelIndex + 1;
    this.setState({level: levels[0], levelList, levelIndex, featureConf});
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
      actorsPerLevel: this.state.numEntities,
      func: (actor) => (actor.danger < 100)
    };

    RG.FACT.addNRandActors(level, this.parser, conf);
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
    let mapSizeX = null;
    if (this.state.level) {
      map = this.state.level.getMap();
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
      console.log('Clearing the screen');
      this.screen.clear();
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

          <div className='col-md-2'>
            <div className='list-group'>
              List of levels:
              {gameEditorLevelList}
            </div>
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
                sizeX={mapSizeX}
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
            <button onClick={this.saveLevel}>Save</button>
            <input
              id='level-file-input'
              onChange={this.loadLevel}
              type='file'
            />
            <div>
              <button
                className='btn btn-danger btn-lg'
                onClick={this.props.toggleEditor}
              >
                Close editor
              </button>
            </div>
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
        levelConf.town = RG.Factory.cityConfBase({});
        levelConf.shown = 'town';
      }
    }
    else if (value === 'townwithwall') {
      if (!levelConf.townwithwall) {
        levelConf.townwithwall = RG.Factory.cityConfBase({});
        levelConf.shown = 'townwithwall';
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
    else if (value === 'crypt' || value === 'castle') {
      const conf = {
        tilesX: 12, tilesY: 7, roomCount: 30,
        genParams: [1, 1, 1, 1]
      };
      if (value === 'crypt' && !levelConf.crypt) {
        levelConf.crypt = conf;
        levelConf.shown = 'crypt';
      }
      if (value === 'castle' && !levelConf.castle) {
        levelConf.castle = conf;
        levelConf.shown = 'castle';
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
    let conf = null;

    if (idHead === 'main') {conf = this.state.levelConf;}
    else if (idHead === 'feature') {conf = this.state.featureConf;}
    else {conf = this.state.subLevelConf;}

    if (key.match(/(\w+)Func/)) {
      // TODO how to handle functions
    }
    else {
      conf[confType][key] = value;
    }

    if (idHead === 'main') {
      this.setState({levelConf: conf});
    }
    else if (idHead === 'feature') {
      this.setState({featureConf: conf});
    }
    else {
      this.setState({subLevelConf: conf});
    }
  }

  onChangeFeatureType(evt) {
    const type = evt.target.value;
    const featConf = WorldConf.getBaseConf(type);
    const featureConf = this.state.featureConf;
    featureConf[type] = featConf;
    featureConf.shown = type;
    this.setState({featureType: type, featureConf,
      lastTouchedConf: featureConf});
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
    this.setState({subLevelType: value, subLevelConf,
      lastTouchedConf: subLevelConf});
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

  onChangeConfTemplText(evt) {
    this.setState({confTemplText: evt.target.value});
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

  playAnimation() {
    console.log('Animation start');
    if (this.game.hasAnimation()) {
      console.log('\tAnimation frame');
      const anim = this.game.getAnimationFrame();
      this.setState({render: true, animation: anim});
      this.animationID = requestAnimationFrame(
        this.playAnimation.bind(this));
    }
    else {
      // Animation is finished
      console.log('\tAnimation finished');
      this.setState({render: true, animation: null});
      this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    }
  }

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
      if (this.state.showAnimations) {
        this.game.setAnimationCallback(this.playAnimation.bind(this));
      }

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

  /* Called when a level is selected from level list. */
  selectLevel(level, i) {
    this.setState({level: level, levelIndex: i});
  }

  /* When delete cross is pressed, deletes the level. */
  deleteLevel(evt) {
    evt.stopPropagation();
    const {id} = evt.target;
    const i = parseInt(id, 10);
    const levelList = this.state.levelList;
    levelList.splice(i, 1);
    const shownLevel = levelList.length > 0 ? levelList[0] : null;
    if (shownLevel === null) {
      this.setState({level: null, levelIndex: -1, levelList});
    }
    else {
      this.setState({level: shownLevel, levelIndex: 0, levelList});
    }
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
    const types = [
      'arena', 'castle', 'cellular', 'cave', 'crypt', 'digger', 'divided',
      'dungeon', 'eller', 'empty', 'forest', 'icey', 'miner',
      'mountain', 'uniform', 'rogue',
      'ruins', 'rooms', 'town', 'townwithwall'
    ];
    const elem = types.map(type => {
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

  getFeatureSelectElem() {
    const featNames = ['branch', 'city', 'dungeon', 'face', 'mountain',
      'quarter'];
    const features = Object.values(featNames).map(type => {
      const key = `key-sel-feature-${type}`;
      return <option key={key} value={type}>{type}</option>;
    });
    return features;

  }

  getEditorPanelElement() {
    const featureSelectElem = this.getFeatureSelectElem();
    const featureConfElem = this.getLevelConfElement('feature',
      this.state.featureConf);
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
        <div className='row'>
          <div className='col-md-6'>

            <div className='btn-div'>
              <button onClick={this.generateWorld}>OverWorld!</button>
              <span>Zoom In/Out:
                <button onClick={this.zoom.bind(this, '+')}>+</button>
                <button onClick={this.zoom.bind(this, '-')}>-</button>
              </span>
            </div>

            <div className='btn-div'>
              <button onClick={this.generateFeature}>Feature!</button>
              <select
                name='feature-type'
                onChange={this.onChangeFeatureType}
                value={this.state.featureType}
              >{featureSelectElem}
              </select>
              {featureConfElem}
            </div>

            <div className='btn-div'>
              <button onClick={this.generateMap}>Level!</button>
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
            </div>

            <div className='btn-div'>
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
          <div className='col-md-6'>
            <p>Template/Config here</p>
            <textarea
              name='conf-template-input'
              onChange={this.onChangeConfTemplText}
              rows={5}
              value={this.state.confTemplText}
            />
            <button onClick={this.importConfig}>Import</button>
            <button onClick={this.exportConfig}>Export</button>
          </div>
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
        ? 'list-group-item list-group-item-info' : 'list-group-item';

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
          <button
            className='btn-xs btn-danger pull-right'
            id={i}
            onClick={this.deleteLevel}
          >X</button>
        </a>
      );
    });
    return levelList;
  }

  //-----------------------------
  // Templates + Config stuff
  //-----------------------------

  importConfig() {
    if (this.state.lastTouchedConf) {
      const shown = this.state.lastTouchedConf.shown;
      const conf = this.state.lastTouchedConf[shown];
      const str = JSON.stringify(conf);
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

}

GameEditor.propTypes = {
  mapShown: React.PropTypes.bool,
  toggleEditor: React.PropTypes.func
};

module.exports = GameEditor;
