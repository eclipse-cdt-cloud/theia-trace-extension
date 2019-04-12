import * as actions from '../action-types';

export function traceReducer(state = {}, action: any) {
    switch (action.type) {
        case actions.ADD_TRACE:
            return Object.assign({}, state, {
                trace: action.trace
              });
        default:
            return state;
    }
}