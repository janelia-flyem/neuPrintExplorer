/*
 * Find similar neurons in a dataset.
*/

// TODO: create larger groups by merging similar groups

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import randomColor from 'randomcolor';
import Select from 'react-select';

import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import TextField from '@material-ui/core/TextField';
import Icon from '@material-ui/core/Icon';

import { submit, pluginResponseError } from 'actions/plugins';
import { skeletonAddandOpen } from 'actions/skeleton';
import { neuroglancerAddandOpen } from 'actions/neuroglancer';
import { setUrlQS } from '../../actions/app';
import RoiHeatMap, { ColorLegend } from '../visualization/MiniRoiHeatMap.react';
import RoiBarGraph from '../visualization/MiniRoiBarGraph.react';
import { LoadQueryString, SaveQueryString } from '../../helpers/qsparser';
import { getQueryString } from 'helpers/queryString';
import * as math from 'mathjs';

const styles = theme => ({
  textField: {
    minWidth: 250,
    maxWidth: 300,
    margin: 4,
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 250,
    maxWidth: 300
  },
  select: {
    fontFamily: theme.typography.fontFamily,
    margin: '0.5em 0 1em 0'
  },
  button: {
    margin: 4,
    display: 'block'
  },
  clickable: {
    cursor: 'pointer'
  }
});

const pluginName = 'FindSimilarNeurons';
class FindSimilarNeurons extends React.Component {
  constructor(props) {
    super(props);
    const initqsParams = {
      bodyId: '',
      name: '',
      rois: []
    };
    const qsParams = LoadQueryString(
      'Query:' + this.constructor.queryName,
      initqsParams,
      this.props.urlQueryString
    );

    this.state = {
      qsParams: qsParams
    };
  }

  static get queryName() {
    return 'Find similar neurons';
  }

  static get queryDescription() {
    return 'Find neurons that are similar to a neuron of interest in terms of their input and output locations (ROIs).';
  }

  handleShowSkeleton = (id, dataSet) => event => {
    const { actions } = this.props;
    actions.skeletonAddandOpen(id, dataSet);
    actions.neuroglancerAddandOpen(id, dataSet);
  };

  // functions for processing results
  processSimilarResults = (query, apiResponse) => {
    const { actions } = this.props;
    const { parameters } = query;
    let columns;

    const shouldShowSubLevelRoiSimilarity = () => {
      // produce sub-level roi information if present, there is more than one body id in the group, and a body id was queried
      return subLevelRois.size > 0 && data.length > 1 && parameters.bodyId;
    };

    const shouldShowSubLevelRoiHeatMapOnly = () => {
      return !parameters.bodyId || (data.length === 1 && parameters.bodyId);
    };

    const shouldShowClusterName = () => {
      return !parameters.bodyId;
    };

    const shouldShowSimilarityScores = () => {
      return data.length > 1 && parameters.bodyId;
    };

    if (apiResponse.data.length === 0) {
      // produce appropriate error message depending on which query called the function
      actions.pluginResponseError(parameters.emptyDataErrorMessage);
      return {
        columns: [],
        data: [],
        debug: apiResponse.debug
      };
    }

    // store the index of the queried body id
    let queriedBodyIdIndex;

    // store super-level rois
    let roiList = apiResponse.data[0][6];
    roiList.push('none');
    const numberOfRois = roiList.length;

    // store sub-level rois
    let subLevelRois = new Set();

    // queries for getting neuron connections
    const postQuery = bodyId => ({
      dataSet: parameters.dataset,
      queryString: '/npexplorer/simpleconnections',
      visType: 'SimpleTable',
      plugin: pluginName,
      parameters: {
        dataset: parameters.dataset,
        find_inputs: true,
        neuron_id: bodyId
      },
      title: `Connections to bodyID=${bodyId}`,
      menuColor: randomColor({ luminosity: 'light', hue: 'random' }),
      processResults: this.processConnections
    });

    const preQuery = bodyId => ({
      dataSet: parameters.dataset,
      queryString: '/npexplorer/simpleconnections',
      visType: 'SimpleTable',
      plugin: pluginName,
      parameters: {
        dataset: parameters.dataset,
        find_inputs: false,
        neuron_id: bodyId
      },
      title: `Connections from bodyID=${bodyId}`,
      menuColor: randomColor({ luminosity: 'light', hue: 'random' }),
      processResults: this.processConnections
    });

    let data = apiResponse.data.map((row, index) => {
      const bodyId = row[0];
      const name = row[1];
      const status = row[2];
      const totalPre = row[3];
      const totalPost = row[4];
      const roiInfo = row[5];
      const hasSkeleton = row[8];

      // get index of queried body id so can move this data to top of table
      if (bodyId === parseInt(parameters.bodyId)) {
        queriedBodyIdIndex = index;
      }

      const converted = [
        {
          value: hasSkeleton ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row'
              }}
            >
              {bodyId}
              <div style={{ margin: '3px' }} />
              <Icon
                className={styles.clickable}
                onClick={this.handleShowSkeleton(bodyId, query.dataSet)}
                fontSize="inherit"
              >
                visibility
              </Icon>
            </div>
          ) : (
            bodyId
          ),
          sortBy: bodyId
        },
        name,
        status,
        {
          value: totalPre,
          action: () => actions.submit(preQuery(bodyId))
        },
        {
          value: totalPost,
          action: () => actions.submit(postQuery(bodyId))
        },
        '', // empty unless roiInfoObject present
        ''
      ];

      const roiInfoObject = JSON.parse(roiInfo);

      if (roiInfoObject) {
        // calculate # pre and post in super rois (which are disjoint) to get total
        // number of synapses assigned to an roi
        let postInSuperRois = 0;
        let preInSuperRois = 0;
        // generate vector for sorting by similarity; fill with zeros
        const vector = Array(numberOfRois * 2).fill(0);
        Object.keys(roiInfoObject).forEach(roi => {
          const roiIndex = roiList.indexOf(roi);
          if (roiIndex !== -1) {
            preInSuperRois += roiInfoObject[roi]['pre'];
            postInSuperRois += roiInfoObject[roi]['post'];
            vector[roiIndex] = (roiInfoObject[roi]['pre'] * 1.0) / totalPre;
            vector[roiIndex + numberOfRois] = (roiInfoObject[roi]['post'] * 1.0) / totalPost;
          } else {
            subLevelRois.add(roi);
          }
        });

        // add this after the other rois have been summed.
        // records # pre and post that are not in rois
        roiInfoObject['none'] = {
          pre: totalPre - preInSuperRois,
          post: totalPost - postInSuperRois
        };
        const noneIndex = roiList.indexOf('none');
        vector[noneIndex] = (roiInfoObject['none']['pre'] * 1.0) / totalPre;
        vector[noneIndex + numberOfRois] = (roiInfoObject['none']['post'] * 1.0) / totalPost;

        const barGraph = (
          <RoiBarGraph
            roiList={roiList}
            roiInfoObject={roiInfoObject}
            preTotal={totalPre}
            postTotal={totalPost}
          />
        );
        converted[5] = barGraph;

        const heatMap = (
          <RoiHeatMap
            roiList={roiList}
            roiInfoObject={roiInfoObject}
            preTotal={totalPre}
            postTotal={totalPost}
          />
        );
        converted[6] = heatMap;

        //store vector
        converted[7] = vector;
      }

      return converted;
    });

    // basic columns
    columns = [
      'bodyId',
      'name',
      'status',
      'pre',
      'post',
      'roi breakdown (mouseover for details)',
      <div>
        roi heatmap (mouseover for details) <ColorLegend />
      </div>
    ];

    if (shouldShowSubLevelRoiSimilarity()) {
      apiResponse.data.forEach((row, index) => {
        const roiInfo = row[5];
        const roiInfoObject = JSON.parse(roiInfo);
        const totalPre = row[3];
        const totalPost = row[4];
        const subLevelRoiList = Array.from(subLevelRois);

        // sub-level roi vector
        const subLevelRoiVector = Array(subLevelRoiList.length * 2).fill(0);
        Object.keys(roiInfoObject).forEach(roi => {
          const roiIndex = subLevelRoiList.indexOf(roi);
          if (roiIndex !== -1) {
            subLevelRoiVector[roiIndex] = (roiInfoObject[roi]['pre'] * 1.0) / totalPre;
            subLevelRoiVector[roiIndex + subLevelRoiList.length] =
              (roiInfoObject[roi]['post'] * 1.0) / totalPost;
          }
        });
        data[index][11] = subLevelRoiVector;

        // sub-level ROI heatmap
        data[index][10] = (
          <RoiHeatMap
            roiList={subLevelRoiList}
            roiInfoObject={roiInfoObject}
            preTotal={totalPre}
            postTotal={totalPost}
          />
        );

        // update column info
        columns[10] = 'sub-level rois';
      });
    } else if (shouldShowSubLevelRoiHeatMapOnly()) {
      // only add the sub-level heat-map (if appropriate) and include cluster name as a column
      apiResponse.data.forEach((row, index) => {
        const roiInfo = row[5];
        const roiInfoObject = JSON.parse(roiInfo);
        const totalPre = row[3];
        const totalPost = row[4];
        const subLevelRoiList = Array.from(subLevelRois);

        if (subLevelRois.size > 0) {
          // sub-level ROI heatmap
          data[index][7] = (
            <RoiHeatMap
              roiList={subLevelRoiList}
              roiInfoObject={roiInfoObject}
              preTotal={totalPre}
              postTotal={totalPost}
            />
          );

          columns[7] = 'sub-level rois';

          if (shouldShowClusterName()) {
            // add cluster name
            data[index][8] = row[7];
            columns[8] = 'cluster name';
          }
        } else {
          // add cluster name only
          if (shouldShowClusterName()) {
            data[index][7] = row[7];
            columns[7] = 'cluster name';
          }
        }
      });
    }

    if (shouldShowClusterName()) {
      const clusterNameColumn = columns[8] === 'cluster name' ? 8 : 7;
      data.sort((a, b) => {
        if (a[clusterNameColumn] < b[clusterNameColumn]) return -1;
        if (a[clusterNameColumn] > b[clusterNameColumn]) return 1;
        return 0;
      });
    }

    if (shouldShowSimilarityScores()) {
      // sort by similarity
      const queriedBodyVector = data[queriedBodyIdIndex][7];
      const queriedBodySubLevelVector = data[queriedBodyIdIndex][11];
      data.forEach(row => {
        const rawVector = row[7];
        // input score (pre)
        row[8] = math.round(
          math.sum(
            math.abs(
              math.subtract(queriedBodyVector.slice(numberOfRois), rawVector.slice(numberOfRois))
            )
          ) / 2.0,
          4
        );
        // output score (post)
        row[9] = math.round(
          math.sum(
            math.abs(
              math.subtract(
                queriedBodyVector.slice(0, numberOfRois),
                rawVector.slice(0, numberOfRois)
              )
            )
          ) / 2.0,
          4
        );
        // total score
        row[7] = math.round(
          math.sum(math.abs(math.subtract(queriedBodyVector, rawVector))) / 4.0,
          4
        );

        // update columns
        columns[7] = 'total similiarity score';
        columns[8] = 'input similiarity score';
        columns[9] = 'output similarity score';

        // sub-level rois
        if (shouldShowSubLevelRoiSimilarity()) {
          row[11] = math.round(
            math.sum(math.abs(math.subtract(queriedBodySubLevelVector, row[11]))) / 4.0,
            4
          );
          //incorporate sub-level rois into total score
          row[7] = (row[7] + row[11]) / 2.0;

          // update columns
          columns[11] = 'sub-level roi similarity score';
        }
      });
      // sort by total similarity score; queried body id will be 0 so should be at top
      data.sort((a, b) => {
        if (a[7] < b[7]) return -1;
        if (a[7] > b[7]) return 1;
        return 0;
      });
    }

    return {
      columns: columns,
      data,
      debug: apiResponse.debug
    };
  };

  processGroupResults = (query, apiResponse) => {
    const { actions } = this.props;
    const { parameters } = query;

    // for displaying cluster names
    if (apiResponse.data.length === 0) {
      actions.pluginResponseError('No cluster names found in the dataset.');
    }

    const data = apiResponse.data.map(row => {
      const clusterName = row[0];

      const clusterQueryString =
        "MATCH (m:Meta{dataset:'" +
        parameters.dataset +
        "'}) WITH m.superLevelRois AS rois MATCH (n:`" +
        parameters.dataset +
        "-Neuron`{clusterName:'" +
        clusterName +
        "'}) RETURN n.bodyId, n.name, n.status, n.pre, n.post, n.roiInfo, rois, n.clusterName, exists((n)-[:Contains]->(:Skeleton)) AS hasSkeleton";

      parameters.clusterName = clusterName;
      parameters.emptyDataErrorMessage = 'Cluster name does not exist in the dataset.';

      const title = 'Neurons with classification ' + clusterName;

      const clusterQuery = {
        dataSet: parameters.dataset,
        cypherQuery: clusterQueryString,
        visType: 'SimpleTable',
        plugin: pluginName,
        parameters: parameters,
        title: title,
        menuColor: randomColor({ luminosity: 'light', hue: 'random' }),
        processResults: this.processSimilarResults
      };

      const converted = [
        {
          value: clusterName,
          action: () => actions.submit(clusterQuery)
        }
      ];

      return converted;
    });

    return {
      columns: ['cluster name (click to explore group)'],
      data,
      debug: apiResponse.debug
    };
  };

  processConnections = (query, apiResponse) => {
    const { dataSet, actions } = this.props;

    const findSimilarNeuron = bodyId => {
      const parameters = {
        dataset: dataSet,
        bodyId: bodyId,
        emptyDataErrorMessage: 'Body ID not found in dataset.'
      };

      const similarQuery =
        "MATCH (m:Meta{dataset:'" +
        dataSet +
        "'}) WITH m.superLevelRois AS rois MATCH (n:`" +
        dataSet +
        '-Neuron`{bodyId:' +
        bodyId +
        '}) WITH n.clusterName AS cn, rois MATCH (n:`' +
        dataSet +
        '-Neuron`{clusterName:cn}) RETURN n.bodyId, n.name, n.status, n.pre, n.post, n.roiInfo, rois, n.clusterName, exists((n)-[:Contains]->(:Skeleton)) AS hasSkeleton';

      // TODO: change title based on results
      const title = 'Neurons similar to ' + bodyId;

      return {
        dataSet,
        cypherQuery: similarQuery,
        visType: 'SimpleTable',
        plugin: pluginName,
        parameters,
        title: title,
        menuColor: randomColor({ luminosity: 'light', hue: 'random' }),
        processResults: this.processSimilarResults
      };
    };

    const data = apiResponse.data.map(row => {
      return [
        {
          value: row[2],
          action: () => actions.submit(findSimilarNeuron(row[2]))
        },
        row[1],
        row[3]
      ];
    });

    return {
      columns: ['body id (click to find similar neurons)', 'name', '# connections'],
      data,
      debug: apiResponse.debug
    };
  };

  // processing intital request
  processIDRequest = () => {
    const { dataSet, actions, history } = this.props;
    const { bodyId } = this.state.qsParams;

    const parameters = {
      dataset: dataSet,
      bodyId: bodyId,
      emptyDataErrorMessage: 'Body ID not found in dataset.'
    };

    const similarQuery =
      "MATCH (m:Meta{dataset:'" +
      dataSet +
      "'}) WITH m.superLevelRois AS rois MATCH (n:`" +
      dataSet +
      '-Neuron`{bodyId:' +
      bodyId +
      '}) WITH n.clusterName AS cn, rois MATCH (n:`' +
      dataSet +
      '-Neuron`{clusterName:cn}) RETURN n.bodyId, n.name, n.status, n.pre, n.post, n.roiInfo, rois, n.clusterName, exists((n)-[:Contains]->(:Skeleton)) AS hasSkeleton';

    // TODO: change title based on results
    const title = 'Neurons similar to ' + bodyId;

    const query = {
      dataSet,
      cypherQuery: similarQuery,
      visType: 'SimpleTable',
      plugin: pluginName,
      parameters,
      title: title,
      menuColor: randomColor({ luminosity: 'light', hue: 'random' }),
      processResults: this.processSimilarResults
    };

    actions.submit(query);

    history.push({
      pathname: '/results',
      search: getQueryString()
    });
  };

  processGroupRequest = () => {
    const { dataSet, actions, history } = this.props;

    const parameters = {
      dataset: dataSet
    };

    const groupsQuery = 'MATCH (n:`' + dataSet + '-Neuron`) RETURN DISTINCT n.clusterName';

    const title = 'Cluster names for ' + dataSet + ' dataset';

    const query = {
      dataSet,
      cypherQuery: groupsQuery,
      visType: 'SimpleTable',
      plugin: pluginName,
      parameters,
      title: title,
      menuColor: randomColor({ luminosity: 'light', hue: 'random' }),
      processResults: this.processGroupResults
    };

    actions.submit(query);

    history.push({
      pathname: '/results',
      search: getQueryString()
    });
  };

  processRoiRequest = () => {
    const { dataSet, actions, history } = this.props;
    const { rois } = this.state.qsParams;

    const parameters = {
      dataset: dataSet,
      rois: rois,
      emptyDataErrorMessage: 'No neurons located in all selected rois: ' + rois
    };

    let roiPredicate = '';
    rois.forEach(roi => {
      roiPredicate += 'exists(n.`' + roi + '`) AND ';
    });
    const roiQuery =
      "MATCH (m:Meta{dataset:'" +
      dataSet +
      "'}) WITH m.superLevelRois AS rois MATCH (n:`" +
      dataSet +
      '-Neuron`) WHERE (' +
      roiPredicate.slice(0, -4) +
      ') RETURN n.bodyId, n.name, n.status, n.pre, n.post, n.roiInfo, rois, n.clusterName, exists((n)-[:Contains]->(:Skeleton)) AS hasSkeleton';

    // TODO: change title based on results
    const title = 'Neurons in ' + rois;

    const query = {
      dataSet,
      cypherQuery: roiQuery,
      visType: 'SimpleTable',
      plugin: pluginName,
      parameters,
      title: title,
      menuColor: randomColor({ luminosity: 'light', hue: 'random' }),
      processResults: this.processSimilarResults
    };

    actions.submit(query);

    history.push({
      pathname: '/results',
      search: getQueryString()
    });
  };

  addNeuronBodyId = event => {
    const oldParams = this.state.qsParams;
    oldParams.bodyId = event.target.value;
    this.props.actions.setURLQs(SaveQueryString('Query:' + this.constructor.queryName, oldParams));
    this.setState({
      qsParams: oldParams
    });
  };

  addNeuronName = event => {
    const oldParams = this.state.qsParams;
    oldParams.name = event.target.value;
    this.props.actions.setURLQs(SaveQueryString('Query:' + this.constructor.queryName, oldParams));
    this.setState({
      qsParams: oldParams
    });
  };

  handleChangeRois = selected => {
    const oldParams = this.state.qsParams;
    const rois = selected.map(item => item.value);
    oldParams.rois = rois;
    this.props.actions.setURLQs(SaveQueryString('Query:' + this.constructor.queryName, oldParams));
    this.setState({
      qsParams: oldParams
    });
  };

  catchReturn = event => {
    // submit request if user presses enter
    if (event.keyCode === 13) {
      event.preventDefault();
      this.processIDRequest();
    }
  };

  render() {
    const { classes, availableROIs } = this.props;
    const rois = this.state.qsParams.rois;

    const roiOptions = availableROIs.map(name => {
      return {
        label: name,
        value: name
      };
    });

    const roiValues = rois.map(roi => {
      return {
        label: roi,
        value: roi
      };
    });

    return (
      <div>
        <FormControl className={classes.formControl}>
          <TextField
            label="Neuron bodyId"
            multiline
            fullWidth
            rows={1}
            value={this.state.qsParams.bodyId}
            rowsMax={2}
            className={classes.textField}
            onChange={this.addNeuronBodyId}
            onKeyDown={this.catchReturn}
          />
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={this.processIDRequest}
          disabled={!(this.state.qsParams.bodyId.length > 0)}
        >
          Search By Body ID
        </Button>
        <Divider />
        <Select
          className={classes.select}
          isMulti
          value={roiValues}
          onChange={this.handleChangeRois}
          options={roiOptions}
          closeMenuOnSelect={false}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={this.processRoiRequest}
          className={classes.button}
          disabled={!(roiValues.length > 0)}
        >
          Explore By ROI
        </Button>
        <Divider />
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={this.processGroupRequest}
        >
          Explore Groups
        </Button>
      </div>
    );
  }
}

FindSimilarNeurons.propTypes = {
  actions: PropTypes.object.isRequired,
  availableROIs: PropTypes.array.isRequired,
  dataSet: PropTypes.string.isRequired,
  urlQueryString: PropTypes.string.isRequired,
  classes: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  isQuerying: PropTypes.bool.isRequired
};

const FindSimilarNeuronsState = function(state) {
  return {
    urlQueryString: state.app.get('urlQueryString'),
    isQuerying: state.query.isQuerying
  };
};

const FindSimilarNeuronsDispatch = dispatch => ({
  actions: {
    submit: query => {
      dispatch(submit(query));
    },
    setURLQs: function(querystring) {
      dispatch(setUrlQS(querystring));
    },
    pluginResponseError: error => {
      dispatch(pluginResponseError(error));
    },
    skeletonAddandOpen: (id, dataSet) => {
      dispatch(skeletonAddandOpen(id, dataSet));
    },
    neuroglancerAddandOpen: (id, dataSet) => {
      dispatch(neuroglancerAddandOpen(id, dataSet));
    }
  }
});

export default withRouter(
  withStyles(styles, { withTheme: true })(
    connect(
      FindSimilarNeuronsState,
      FindSimilarNeuronsDispatch
    )(FindSimilarNeurons)
  )
);