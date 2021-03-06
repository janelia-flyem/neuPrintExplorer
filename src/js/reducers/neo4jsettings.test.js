import Immutable from 'immutable';
import C from './constants';
import neo4jsettings from './neo4jsettings';

const state = Immutable.Map({
  availableDatasets: ['existingdataset'],
  availableROIs: { rois: ['existingrois'] },
  superROIs: {},
  datasetInfo: {
    lastmod: 'existinglastmod',
    uuid: 'existingversion'
  },
  meshInfo: {},
  roiInfo: {},
  neoServer: 'foobar',
  publicState: false
});

const initialState = Immutable.Map({
  availableDatasets: [],
  availableROIs: {},
  superROIs: {},
  datasetInfo: {},
  meshInfo: {},
  roiInfo: {},
  neoServer: '',
  publicState: false
});

describe('neo4jsettings Reducer', () => {
  it('SET_NEO_DATASETS success', () => {
    const action = {
      type: C.SET_NEO_DATASETS,
      availableDatasets: ['newdataset'],
      availableROIs: { rois: ['newrois'] },
      superROIs: {},
      datasetInfo: {
        lastmod: 'newlastmod',
        uuid: 'newversion'
      }
    };
    expect(neo4jsettings(undefined, action)).toEqual(
      Immutable.Map({
        availableDatasets: ['newdataset'],
        availableROIs: { rois: ['newrois'] },
        superROIs: {},
        datasetInfo: {
          lastmod: 'newlastmod',
          uuid: 'newversion'
        },
        meshInfo: {},
        roiInfo: {},
        neoServer: '',
        publicState: false
      })
    );
    expect(neo4jsettings(state, action)).toEqual(
      Immutable.Map({
        availableDatasets: ['newdataset'],
        availableROIs: { rois: ['newrois'] },
        superROIs: {},
        datasetInfo: {
          lastmod: 'newlastmod',
          uuid: 'newversion'
        },
        meshInfo: {},
        roiInfo: {},
        neoServer: 'foobar',
        publicState: false
      })
    );
  });
  it('SET_NEO_SERVER success', () => {
    const action = {
      type: C.SET_NEO_SERVER,
      neoServer: 'testServer'
    };
    expect(neo4jsettings(undefined, action)).toEqual(initialState.set('neoServer', 'testServer'));
  });
});
