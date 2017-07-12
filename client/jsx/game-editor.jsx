
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
            elemX: 1,
            elemY: 1
        };

        this.screen = new Screen(state.levelX, state.levelY);
        const level = RG.FACT.createLevel(state.levelType,
            state.levelX, state.levelY);
        this.exploreAll(level);

        state.level = level;

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

        this.state = state;

        this.parser = new RG.ObjectShellParser();
        this.parser.parseShellData(RGEffects);
        this.parser.parseShellData(RGObjects);

        this.onCellClick = this.onCellClick.bind(this);

        this.insertElement = this.insertElement.bind(this);
        this.onChangeElement = this.onChangeElement.bind(this);
    }

    exploreAll(level) {
        const map = level.getMap();
        for (let x = 0; x < map.cols; x++) {
            for (let y = 0; y < map.rows; y++) {
                const cell = map._map[x][y];
                cell.setExplored(true);
            }
        }
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

    generateMap() {
        try {
            const level = RG.FACT.createLevel(this.state.levelType,
                this.state.levelX, this.state.levelY);
            this.screen.setViewportXY(this.state.levelX, this.state.levelY);
            this.exploreAll(level);
            this.setState({level: level});
        }
        catch (e) {
            this.setState({errorMsg: e.message});
        }
    }

    subGenerateMap() {
        const level = this.state.level;
        let subLevel = RG.FACT.createLevel(this.state.subLevelType,
            this.state.subLevelX, this.state.subLevelY);
        this.exploreAll(subLevel);
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

    onChangeType(evt) {
        const value = evt.target.value;
        this.setState({levelType: value});
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

    insertElement() {
        const llx = this.state.selectedCell.getX();
        const lly = this.state.selectedCell.getY();
        const urx = llx;
        const ury = lly;
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
                    <button onClick={this.levelToJSON}>To JSON</button>
                </div>
                <div className='btn-div'>
                    <button onClick={this.insertElement}>Insert element</button>
                    <input
                        name='insert-element'
                        onChange={this.onChangeElement}
                        value={this.state.elementType}
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
}

GameEditor.propTypes = {
    mapShown: React.PropTypes.bool
};

module.exports = GameEditor;
