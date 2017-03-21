'use strict';

const React = require('react');
/** This component contains non-game instance specific controls like starting
 * new game and changing screen size.*/
var GamePanel = React.createClass({

    shouldComponentUpdate: function(nextProps, nextState) {
        return false;
    },

    setViewSizeXPlus: function(evt) {
        this.props.setViewSize(evt, "+", "X");
    },

    setViewSizeXNeg: function(evt) {
        this.props.setViewSize(evt, "-", "X");
    },

    setViewSizeYPlus: function(evt) {
        this.props.setViewSize(evt, "+", "Y");
    },

    setViewSizeYNeg: function(evt) {
        this.props.setViewSize(evt, "-", "Y");
    },

    render: function() {
        return (
            <div>
                <button id="start-button" className="btn btn-info" data-toggle="modal" data-target="#gameStartModal">Start</button>
                <button id="load-button" className="btn btn-info" data-toggle="modal" data-target="#gameLoadModal">Load</button>
                <button id="save-button" className="btn btn-info" onClick={this.props.saveGame}>Save</button>
                <button id="help-button" className="btn btn-info" data-toggle="modal" data-target="#gameHelpModal">Help</button>
                <button onClick={this.setViewSizeXPlus}>+X</button>
                <button onClick={this.setViewSizeXNeg}>-X</button>
                <button onClick={this.setViewSizeYPlus}>+Y</button>
                <button onClick={this.setViewSizeYNeg}>-Y</button>
            </div>
        );
    }

});

module.exports = GamePanel;
