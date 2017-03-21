'use strict';

const React = require('react');
const RG = require('../src/rg.js');
const ModalHeader = require('./modal-header');

/** This component contains short info on keys and how to play the game.*/
var GameHelpScreen = React.createClass({

    shouldComponentUpdate: function(nextProps, nextState) {
        return false;
    },

    render: function() {
        console.log('render() GameHelpScreen');
        return (
            <div className='modal fade' role='dialog' id='gameHelpModal' tabIndex='-1' role='dialog' aria-labelledby='game-help-modal-label' aria-hidden='true'>
                <div className='modal-dialog modal-lg'>
                    <div className='modal-content'>
                        <ModalHeader id='game-help-modal-label' text={RG.gameTitle + 'Help'}/>
                        <div className='modal-body row'>
                            <div className='col-md-6'>
                                <p>To move around, use:</p>
                                <table id='mov-buttons-table' className='table table-large'>
                                    <thead />
                                    <tbody>
                                        <tr><td>{'\u2B09'} q</td><td>{'\u2B06'} w</td><td>{'\u2B08'} e</td></tr>
                                        <tr><td>{'\u2B05'} a</td><td>Rest: s</td><td>{'\u27A1'} d</td></tr>
                                        <tr><td>{'\u2B0B'} z</td><td>{'\u2B07'} x</td><td>{'\u2B0A'} c</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className='col-md-6 help-info-buttons'>
                                <p><span className='text-primary'>b</span> - Use stairs.</p>
                                <p><span className='text-primary'>f</span> - Change fight mode.</p>
                                <p><span className='text-primary'>h</span> - See next item in the cell.</p>
                                <p><span className='text-primary'>m</span> - Toggle the map/player view.</p>
                                <p><span className='text-primary'>n</span> - Next target (when in targeting mode).</p>
                                <p><span className='text-primary'>i</span> - View inventory.</p>
                                <p><span className='text-primary'>o</span> - Open/close door.</p>
                                <p><span className='text-primary'>r</span> - Toggle run mode (1.5 x speed).</p>
                                <p><span className='text-primary'>t</span> - Enter targeting mode. Press again to fire.</p>
                                <p><span className='text-primary'>u</span> - Use an item.</p>
                                <p><span className='text-primary'>,</span> - Pick up an item.</p>
                                <p><span className='text-primary'>.</span> - Rest (takes less energy than moving).</p>
                            </div>
                        </div>

                        <div className='modal-footer row'>
                            <div className='col-md-6'>
                                <button type='button' className='btn btn-secondary' data-dismiss='modal'>Close</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

});

module.exports = GameHelpScreen;
