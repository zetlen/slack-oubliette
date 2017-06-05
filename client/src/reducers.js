import * as actions from "./actions";
import range from "lodash/range";

function rootReducer(state = {}, action) {
  switch (action.type) {
    case actions.REQUEST_FILES:
      return {
        ...state,
        isFetching: true
      };
    case actions.RECEIVE_FILES:
      return {
        ...state,
        results: action.results,
        isFetching: false,
        invalid: false
      };
    case actions.SELECT_FILE:
      if (state.modifiers.ctrl) {
        const indexOfIndex = state.selected.indexOf(action.index);
        if (indexOfIndex > -1) {
          return {
            ...state,
            selected: [
              ...state.selected.slice(0, indexOfIndex),
              ...state.selected.slice(indexOfIndex + 1)
            ]
          };
        }
        return {
          ...state,
          lastSelected: action.index,
          selected: state.selected.concat(action.index)
        };
      }
      if (state.modifiers.shift) {
        const min = Math.min(state.lastSelected, action.index);
        const max = Math.max(state.lastSelected, action.index);
        // leave lastSelected the same!
        return {
          ...state,
          selected: range(min, max + 1)
        };
      }
      return {
        ...state,
        lastSelected: action.index,
        selected: [action.index]
      };
    case actions.SET_MODIFIER_KEYS:
      let shift = action.modifierKeys.shiftKey;
      let ctrl = navigator.platform.indexOf("Mac") === 0
        ? action.modifierKeys.metaKey
        : action.modifierKeys.ctrlKey;
      return {
        ...state,
        modifiers: { ctrl, shift }
      };
    case actions.TRY_DELETE_FILES:
      return {
        ...state,
        deleting: action.ids
      };
    case actions.FILES_DELETED:
      return {
        ...state,
        deleting: false,
        invalid: true,
        selected: []
      };
    default:
      return state;
  }
}

export default rootReducer;