/* eslint max-len: [2, 100, 2] */


import React, {Component} from 'react';
import PropTypes from 'prop-types';

/** A row component which holds a number of cells. {{{2 */
class GameRow extends Component {

    shouldComponentUpdate(nextProps) {
        if (this.props.rowClass !== nextProps.rowClass) {
            return true;
        }
        const classesLen = this.props.rowClasses.length;
        const charsLen = this.props.rowChars.length;

        if (classesLen === nextProps.rowClasses.length) {
            if (charsLen === nextProps.rowChars.length) {

                if (!this.props.useRLE) {
                    for (let i = 0; i < classesLen; i++) {
                        if (this.props.rowClasses[i] !== nextProps.rowClasses[i]) {
                            return true;
                        }
                    }

                    for (let j = 0; j < charsLen; j++) {
                        if (this.props.rowChars[j] !== nextProps.rowChars[j]) {
                            return true;
                        }
                    }
                }
                else {
                    for (let i = 0; i < classesLen; i++) {
                        // Compare run-length
                        if (this.props.rowClasses[i][0] !== nextProps.rowClasses[i][0]) {
                            return true;
                        }
                        // Compare className
                        if (this.props.rowClasses[i][1] !== nextProps.rowClasses[i][1]) {
                            return true;
                        }
                    }

                    for (let j = 0; j < charsLen; j++) {
                        // Compare run-length
                        if (this.props.rowChars[j][0] !== nextProps.rowChars[j][0]) {
                            return true;
                        }
                        // Compare className
                        if (this.props.rowChars[j][1] !== nextProps.rowChars[j][1]) {
                            return true;
                        }
                    }
                } // else useRLE
            }
            return false;
        }
        return true;
    }

    render() {
        const y = this.props.y;
        const rowClass = this.props.rowClass;

        let rowCells = null;

        if (!this.props.useRLE) {
            rowCells = this.props.rowClasses.map( (className, index) => {
                const cellChar = this.props.rowChars[index];

                return (
                    <span
                        className={className}
                        key={y + ',' + index}
                    >
                        {cellChar}
                    </span>
                );
            });
        }
        else {
            rowCells = this.props.rowClasses.map( (rleAndClass, index) => {
                const rleAndChar = this.props.rowChars[index];
                return (
                    <span
                        className={rleAndClass[1]}
                        key={y + ',' + index}
                    >
                        {rleAndChar[1].repeat(rleAndChar[0])}
                    </span>
                );
            });
        }

        return (
            <div className={'game-board-row ' + rowClass}>
                {rowCells}
            </div>
        );
    }

}

GameRow.propTypes = {
    rowChars: PropTypes.array,
    rowClass: PropTypes.string,
    rowClasses: PropTypes.array,
    startX: PropTypes.number,
    useRLE: PropTypes.bool,
    y: PropTypes.number
};

module.exports = GameRow;

