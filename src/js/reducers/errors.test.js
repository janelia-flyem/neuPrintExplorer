import C from '../../../src/js/reducers/constants';
import errors from './errors';
import Immutable from 'immutable';

describe('errors Reducer', () => {
  it('*_ERROR success', () => {
    const state = Immutable.Map({
      message: null
    });
    const action = {
      type: 'TEST_ERROR',
      error: {
        message: 'Test message'
      }
    };
    const results = errors(state, action);
    expect(results).toEqual(
      Immutable.Map({
        message: 'Test message'
      })
    );
  });

  it('CLEAR_ERRORS success', () => {
    const state = Immutable.Map({
      message: 'Test message'
    });
    const action = {
      type: C.CLEAR_ERRORS
    };
    const results = errors(state, action);
    expect(results).toEqual(
      Immutable.Map({
        message: null
      })
    );
  });
});
