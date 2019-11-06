/*
 * Side drawer pop out for queries.
 */

import React from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';

import Drawer from '@material-ui/core/Drawer';
import { withStyles } from '@material-ui/core/styles';

import Query from './Query';
import QueryTypeSelection from './QueryTypeSelection';
import { getSiteParams, setQueryString } from '../helpers/queryString';

const drawerWidth = 400;

// adapted from material ui example
const styles = theme => ({
  drawerPaperQuery: {
    height: '100vh',
    overflow: 'auto',
    position: 'relative',
    width: drawerWidth
  },
  toolbar: theme.mixins.toolbar
});

const QueryDrawer = props => {
  const { classes, location } = props;
  const qsParams = getSiteParams(location);

  const openQuery = qsParams.get('q');
  const fullscreen = qsParams.get('rt');

  if (fullscreen !== 'full') {
    if (openQuery === '1') {
      return (
        <div>
          <Drawer
            variant="permanent"
            classes={{
              paper: classes.drawerPaperQuery
            }}
          >
            <div className={classes.toolbar} />
            <Query />
          </Drawer>
        </div>
      );
    }
    if (openQuery === '2') {
      return (
        <div>
          <Drawer
            variant="permanent"
            classes={{
              paper: classes.drawerPaperQuery
            }}
          >
            <div className={classes.toolbar} />
            <QueryTypeSelection />
          </Drawer>
        </div>
      );

    }
  }
  return null;
};

QueryDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired
};

export default withRouter(withStyles(styles)(QueryDrawer));
