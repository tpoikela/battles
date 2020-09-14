
import * as React from 'react';
import {ContextMenuItems} from '../jsx/context-menu-items';

interface IEditorContextMenuProps {
  mouseOverCell: any;
  handleRightClick(evt, data, cell): void;
}


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

  public props: IEditorContextMenuProps;

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

