'use strict';

const React = require('react');
/** This component contains non-game instance specific controls like starting
 * new game and changing screen size.*/
const GamePanel = React.createClass({

    propTypes: {
        saveGame: React.PropTypes.func.isRequired,
        setViewSize: React.PropTypes.func.isRequired,
        showLoadScreen: React.PropTypes.func.isRequired,
        showStartScreen: React.PropTypes.func.isRequired
    },

    shouldComponentUpdate: function() {
        return false;
    },

    setViewSizeXPlus: function(evt) {
        this.props.setViewSize(evt, '+', 'X');
    },

    setViewSizeXNeg: function(evt) {
        this.props.setViewSize(evt, '-', 'X');
    },

    setViewSizeYPlus: function(evt) {
        this.props.setViewSize(evt, '+', 'Y');
    },

    setViewSizeYNeg: function(evt) {
        this.props.setViewSize(evt, '-', 'Y');
    },

    render: function() {
        return (
            <div>
                <button
                    className='btn btn-info'
                    data-target='#gameStartModal'
                    data-toggle='modal'
                    id='start-button'
                    onClick={this.props.showStartScreen}
                >Start</button>
                <button
                    className='btn btn-info'
                    data-target='#gameLoadModal'
                    data-toggle='modal'
                    id='load-button'
                    onClick={this.props.showLoadScreen}
                >Load</button>
                <button
                    className='btn btn-info'
                    id='save-button'
                    onClick={this.props.saveGame}
                >Save</button>
                <button
                    className='btn btn-info'
                    data-target='#gameHelpModal'
                    data-toggle='modal'
                    id='help-button'
                >Help</button>
                <button onClick={this.setViewSizeXPlus}>+X</button>
                <button onClick={this.setViewSizeXNeg}>-X</button>
                <button onClick={this.setViewSizeYPlus}>+Y</button>
                <button onClick={this.setViewSizeYNeg}>-Y</button>
            </div>
        );
    }

});

module.exports = GamePanel;
