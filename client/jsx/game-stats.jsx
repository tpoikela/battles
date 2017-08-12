const React = require('react');
const RG = require('../src/rg.js');

/** Component for displaying character stats.*/
const GameStats = React.createClass({

    propTypes: {
        showMap: React.PropTypes.bool.isRequired,
        player: React.PropTypes.object.isRequired,
        selectedItem: React.PropTypes.object,
        setViewType: React.PropTypes.func.isRequired,
        selectedCell: React.PropTypes.object
    },

    changeMapView: function() {
        if (this.props.showMap) {
            this.props.setViewType('player');
        }
        else {
            this.props.setViewType('map');
        }
    },

    render: function() {
        const player = this.props.player;
        const dungeonLevel = player.getLevel().getLevelNumber();
        const location = player.getLevel().getParent();
        const selectedItem = this.props.selectedItem;
        const selectedCell = this.props.selectedCell;

        let selItemName = '';
        if (selectedItem !== null) {
            selItemName = 'Selected: ' + selectedItem.getName();
        }

        let selCellDescr = '';
        if (selectedCell !== null) {
            if (selectedCell.hasActors()) {
                const actorName = selectedCell.getProp('actors')[0].getName();
                selCellDescr = 'Cell: ' + actorName;
            }
        }

        // Compile final stats information
        const stats = {
            HP: player.get('Health').getHP() + '/'
                + player.get('Health').getMaxHP(),
            PP: player.get('SpellPower').getPP() + '/'
                + player.get('SpellPower').getMaxPP(),

            Att: player.getAttack(),
            Def: player.getDefense(),
            Pro: player.getProtection(),

            Str: player.getStrength(),
            Agi: player.getAgility(),
            Acc: player.getAccuracy(),
            Wil: player.getWillpower(),

            Speed: player.getSpeed(),
            XP: player.get('Experience').getExp(),
            XL: player.get('Experience').getExpLevel(),
            DL: dungeonLevel,
            Loc: location
        };

        if (player.has('Hunger')) {
            stats.E = player.get('Hunger').getEnergy();
        }

        // Create HTML for showing stats
        const statsHTML = [];
        let index = 0;
        for (const key in stats) {
            if (key) {
                const val = stats[key];
                statsHTML.push(<li key={key + ',' + index}>{key}: {val}</li>);
                ++index;
            }
        }

        // Create HTML for showing movement mode
        let moveStatus = 'Move: ';
        let moveClassName = 'text-info';
        if (player.getBrain().isRunModeEnabled()) {
            moveStatus += ' Running';
            moveClassName = 'text-danger';
        }
        else {
            moveStatus += ' Walking';
        }

        // Create HTML for showing fighting mode
        const fightMode = player.getBrain().getFightMode();
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

        return (
            <div className='game-stats'>
                <ul className='game-stats-list'>{statsHTML}</ul>
                <ul className='player-mode-list'>
                    <li className={moveClassName}>{moveStatus}</li>
                    <li className='text-primary'>{fightModeStatus}</li>
                    <li className='text-warning'>{selItemName}</li>
                    <li className='text-danger'>{selCellDescr}</li>
                </ul>
                {otherStatus}
                <button
                    className='btn btn-xs btn-rg btn-info'
                    data-target='#inventoryModal'
                    data-toggle='modal'
                    id='inventory-button'
                >
                    Inventory
                </button>
                <button
                    className='btn btn-xs btn-rg btn-info'
                    id='map-player-button'
                    onClick={this.changeMapView}
                >
                    {mapButtonText}
                </button>
            </div>
        );
    },

    getPlayerStatus: function(player) {
        var stat = [];
        if (player.has('Poison')) {
            stat.push(<p className='text-danger'>Poisoned</p>);
        }
        if (player.has('Stun')) {
            stat.push(<p className='text-danger'>Stunned</p>);
        }
        if (player.has('Ethereal')) {
            stat.push(<p className='text-danger'>Ethereal</p>);
        }
        return stat;
    }

});

module.exports = GameStats;
