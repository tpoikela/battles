
const React = require('react');

/** A row component which holds a number of cells. {{{2 */
var GameRow = React.createClass({

    shouldComponentUpdate: function(nextProps, nextState) {
        if (this.props.rowClasses.length === nextProps.rowClasses.length) {
            if (this.props.rowChars.length === nextProps.rowChars.length) {

                for (var i = 0; i < this.props.rowClasses.length; i++) {
                    if (this.props.rowClasses[i] !== nextProps.rowClasses[i]) {return true;}
                }

                for (var j = 0; j < this.props.rowChars.length; j++) {
                    if (this.props.rowChars[j] !== nextProps.rowChars[j]) {return true;}
                }

            }
            return false;
        }
        return true;
    },

    onCellClick: function(x, y) {
        this.props.onCellClick(x, y);
    },

    render: function() {
        var y = this.props.y;
        var that = this;
        var startX = this.props.startX;
        var rowClass = this.props.rowClass;

        var rowCells = this.props.rowClasses.map( function(className, index) {
            var cellChar = that.props.rowChars[index];
            var cellX = startX + index;

            return (
                <span key={index}
                    className={className}
                    onClick={that.onCellClick.bind(that, cellX, y)}
                    >
                    {cellChar}
                </span>
            );
        });


        return (
            <div className={rowClass}>
                {rowCells}
            </div>
        );
    }

}); // }}} GameRow

module.exports = GameRow;

