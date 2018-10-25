
import React from 'react';
import PropTypes from 'prop-types';
import ContextMenuItems from '../jsx/context-menu-items';

const allMenuItems = {
  hasActors: [
    {text: 'Remove actor', type: 'removeActor'},
    {text: 'Edit actor', type: 'editActor'}
  ],
  hasItems: [
    {text: 'Delete item'},
    {text: 'Edit item'}
  ],
  hasElements: [
    {text: 'Delete element'},
    {text: 'Edit element'}
  ],
  hasConnection: [
    {text: 'Create connection'}
  ]
};

export default class EditorContextMenu extends React.Component {

  render() {
    return (
      <ContextMenuItems
        handleRightClick={this.props.handleRightClick}
        menuItems={allMenuItems}
        mouseOverCell={this.props.mouseOverCell}
      />
    );
  }

}

EditorContextMenu.propTypes = {
  handleRightClick: PropTypes.func.isRequired,
  mouseOverCell: PropTypes.object
};
