/*
 * Handle neo4j server information.
 */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'underscore';
import C from '../reducers/constants';

export function sortRois(a, b) {
  const aStartsWithLetter = a.charAt(0).match(/[a-z]/i);
  const bStartsWithLetter = b.charAt(0).match(/[a-z]/i);
  if (aStartsWithLetter && !bStartsWithLetter) return -1;
  if (bStartsWithLetter && !aStartsWithLetter) return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

class MetaInfo extends React.Component {
  componentDidMount() {
    const { userInfo } = this.props;
    this.updateDB(userInfo);
  }

  componentDidUpdate(prevProps) {
    const { userInfo, setNeoDatasets, setNeoServer } = this.props;
    if (prevProps.userInfo !== userInfo) {
      setNeoDatasets([], {}, {}, {});
      setNeoServer('');
    }

    if (!_.isEqual(prevProps.userInfo, userInfo)) {
      this.updateDB(userInfo);
    }
  }

  updateDB = () => {
    const { setRoiInfo, setNeoDatasets, setNeoServer, setNeoServerPublic, setMeshInfo } = this.props;
    fetch('/api/dbmeta/datasets', {
      credentials: 'include'
    })
      .then(result => result.json())
      .then(items => {
        if (!('message' in items)) {
          const datasets = [];
          const rois = {};
          const superRois = {};
          const datasetInfo = {};
          Object.entries(items).forEach(item => {
            const [name, data] = item;
            datasets.push(name);
            rois[name] = data.ROIs.sort(sortRois);
            superRois[name] = data.superLevelROIs.sort(sortRois);
            datasetInfo[name] = {
              uuid: data.uuid,
              lastmod: data['last-mod'],
              info: data.info,
              hidden: data.hidden
            };
          });
          setNeoDatasets(datasets, rois, superRois, datasetInfo);
        }
      });


    fetch('/api/dbmeta/database', {
      credentials: 'include'
    })
      .then(result => result.json())
      .then(data => {
        if (!('message' in data)) {
          setNeoServer(data.Location);
        }
      });


    fetch('/api/serverinfo', {
      credentials: 'include',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    })
      .then(result => result.json())
      .then(resp => {
        setNeoServerPublic(resp.IsPublic);
      });

   fetch('/api/custom/custom?np_explorer=meta_roi_info', {
      credentials: 'include',
      body: JSON.stringify({ cypher: 'MATCH (n:Meta) RETURN n.roiInfo' }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    })
      .then(result => result.json())
      .then(resp => {
        if (!('message' in resp)) {
          if (resp.data && resp.data[0]) {
            setRoiInfo(JSON.parse(resp.data[0][0]));
          }
        }
      });


    fetch('/api/custom/custom?np_explorer=meta_dataset_and_host', {
      credentials: 'include',
      body: JSON.stringify({ cypher: 'MATCH (n:Meta) RETURN n.dataset, n.meshHost' }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    })
      .then(result => result.json())
      .then(resp => {
        if (!('message' in resp)) {
          const meshInfo = {}
          if (resp.data) {
            resp.data.forEach(dataset => {
              const [key, value] = dataset;
              meshInfo[key] = value;
            });
          }
          setMeshInfo(meshInfo);
        }
      });
  };

  render() {
    return <div />;
  }
}

MetaInfo.propTypes = {
  setNeoDatasets: PropTypes.func.isRequired,
  setNeoServer: PropTypes.func.isRequired,
  setNeoServerPublic: PropTypes.func.isRequired,
  setMeshInfo: PropTypes.func.isRequired,
  setRoiInfo: PropTypes.func.isRequired,
  userInfo: PropTypes.object.isRequired
};

const MetaInfoState = state => ({
  userInfo: state.user.get('userInfo')
});

const MetaInfoDispatch = dispatch => ({
  setNeoDatasets(datasets, rois, superRois, datasetInfo) {
    dispatch({
      type: C.SET_NEO_DATASETS,
      availableDatasets: datasets,
      availableROIs: rois,
      superROIs: superRois,
      datasetInfo
    });
  },
  setNeoServerPublic(publicState) {
    dispatch({
      type: C.SET_NEO_SERVER_PUBLIC,
      publicState
    });
  },
  setNeoServer(server) {
    dispatch({
      type: C.SET_NEO_SERVER,
      neoServer: server
    });
  },
  setMeshInfo(dataSets) {
    dispatch({
      type: C.SET_NEO_MESHINFO,
      dataSets
    });
  },
  setRoiInfo(rois) {
    dispatch({
      type: C.SET_NEO_ROIINFO,
      rois
    });
  }
});

export default connect(
  MetaInfoState,
  MetaInfoDispatch
)(MetaInfo);
