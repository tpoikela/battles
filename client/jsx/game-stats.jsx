const React = require('react');
const RG = require('../src/rg.js');

/** Component for displaying character stats.*/
var GameStats = React.createClass({

    getInitialState: function() {
        return {
            mapShown: false
        };
    },

    changeMapView: function(evt) {
        if (this.state.mapShown) {
            $('#map-player-button').text('Map View');
            this.setState({mapShown: false});
            this.props.setViewType('player');
        }
        else {
            $('#map-player-button').text('Player View');
            this.setState({mapShown: true});
            this.props.setViewType('map');
        }
    },

    render: function() {

        var player = this.props.player;
        var eq = player.getInvEq().getEquipment();
        var dungeonLevel = player.getLevel().getLevelNumber();
        var selectedItem = this.props.selectedItem;
        var selectedCell = this.props.selectedCell;

        var selItemName = '';
        if (selectedItem !== null) {selItemName = 'Selected: ' + selectedItem.getName();}

        var selCellDescr = '';
        if (selectedCell !== null) {
            if (selectedCell.hasActors()) {
                var actorName = selectedCell.getProp('actors')[0].getName();
                selCellDescr = 'Cell: ' + actorName;
            }
        }

        // Compile final stats information
        var stats = {
            HP: player.get('Health').getHP() + '/' + player.get('Health').getMaxHP(),

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
            DL: dungeonLevel
        };

        if (player.has('Hunger')) {
            stats.E = player.get('Hunger').getEnergy();
        }

        // Create HTML for showing stats
        var statsHTML = [];
        var index = 0;
        for (var key in stats) {
            var val = stats[key];
            statsHTML.push(<li key={index}>{key}: {val}</li>);
            ++index;
        }

        // Create HTML for showing movement mode
        var moveStatus = 'Move: ';
        var moveClassName = 'text-info';
        if (player.getBrain().isRunModeEnabled()) {
            moveStatus += ' Running';
            moveClassName = 'text-danger';
        }
        else {
            moveStatus += ' Walking';
        }

        // Create HTML for showing fighting mode
        var fightMode = player.getBrain().getFightMode();
        var fightModeStatus = 'Fight: ';
        if (fightMode === RG.FMODE_NORMAL) {fightModeStatus += 'Normal';}
        else if (fightMode === RG.FMODE_SLOW) {fightModeStatus += 'Slow';}
        else if (fightMode === RG.FMODE_FAST) {fightModeStatus += 'Fast';}

        // Other status like poisoning, stun, cold, etc.
        var otherStatus = this.getPlayerStatus(player);

        return (
            <div className='game-stats'>
                <ul className='game-stats-list'>{statsHTML}</ul>
                <p className={moveClassName}>{moveStatus}</p>
                <p className='text-primary'>{fightModeStatus}</p>
                <p className='text-primary'>{selItemName}</p>
                <p className='text-primary'>{selCellDescr}</p>
                {otherStatus}
                <button id='inventory-button' className='btn btn-info' data-toggle='modal' data-target='#inventoryModal'>Inventory</button>
                <button id='map-player-button' className='btn btn-info' onClick={this.changeMapView}>Map View</button>
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
