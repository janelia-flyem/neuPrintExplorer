import React from 'react';
import PropTypes from 'prop-types';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';

import copy from 'copy-to-clipboard';

class CopyToClipboardModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedColumns: []
    };
  }

  handleExport = () => {
    const { handleClose, callback } = this.props;
    const { selectedColumns } = this.state;
    const csv = callback(selectedColumns)
    // TODO: copy CSV to clipboard.
    const result = copy(csv);
    if (result) {
      handleClose();
    }
  };

  handleToggle = index => {
    const {selectedColumns} = this.state;
    selectedColumns[index] = !selectedColumns[index];
    this.setState({selectedColumns});
  };

  render() {
    const { open, visibleColumns, resultData, handleClose } = this.props;
    const { selectedColumns } = this.state;

    if (!open || !resultData) {
      return null;
    }

    const options = resultData.columns.map((column, index) => {

      // if visible columns, check that the current column should be visible
      // and change the name if required.
      if (visibleColumns) {
        const mappedColumn = visibleColumns.get(index);

        if (!mappedColumn.status) {
          return null;
        }

        return (
          <ListItem key={mappedColumn.name} button onClick={() => this.handleToggle(index)}>
            <ListItemText primary={`${mappedColumn.name}`} />
            <ListItemSecondaryAction>
              <Checkbox
                color="primary"
                onChange={() => this.handleToggle(index)}
                checked={selectedColumns[index] || false}
              />
            </ListItemSecondaryAction>
          </ListItem>
        );

      }
      // no visibleColumn data, so just use the column names from the result data.
      return (
        <ListItem key={column} button onClick={() => this.handleToggle(index)}>
          <ListItemText primary={`${column}`} />
          <ListItemSecondaryAction>
            <Checkbox
              color="primary"
              onChange={() => this.handleToggle(index)}
              checked={selectedColumns[index]}
            />
          </ListItemSecondaryAction>
        </ListItem>
      );
    });

    return (
      <Dialog
        maxWidth="xs"
        aria-labelledby="confirmation-dialog-title"
        open={open}
        onClose={handleClose}
      >
        <DialogTitle id="confirmation-dialog-title">Select Columns To Copy</DialogTitle>
        <DialogContent>
          <List>{options}</List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={this.handleExport} color="primary">
            Copy To Clipboard
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

CopyToClipboardModal.propTypes = {
  open: PropTypes.bool.isRequired,
  visibleColumns: PropTypes.object,
  resultData: PropTypes.object,
  callback: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired
};

CopyToClipboardModal.defaultProps = {
  visibleColumns: null,
  resultData: null
};

export default CopyToClipboardModal;
