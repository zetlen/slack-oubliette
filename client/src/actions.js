import qs from "querystring";
import pick from "lodash/fp/pick";

export const REQUEST_FILES = "REQUEST_FILES";
export const RECEIVE_FILES = "RECEIVE_FILES";
export const SELECT_FILE = "SELECT_FILE";
export const SET_MODIFIER_KEYS = "SET_MODIFIER_KEYS";

const BASE = "/files/";

function requestFiles(options) {
  return {
    type: REQUEST_FILES,
    options
  };
}

function receiveFiles(options, results) {
  return {
    type: RECEIVE_FILES,
    options,
    results
  };
}

function fetchFiles(options) {
  return dispatch => {
    dispatch(requestFiles(options));
    return fetch(`${BASE}?${qs.stringify(options)}`)
      .then(response => response.json())
      .then(json => dispatch(receiveFiles(options, json)));
  };
}

function shouldFetchFiles(state) {
  if (!state.results) {
    return true;
  } else if (state.isFetching) {
    return false;
  }
}

export function fetchFilesIfNeeded(options) {
  return (dispatch, getState) => {
    if (shouldFetchFiles(getState(), options)) {
      return dispatch(fetchFiles(options));
    }
  };
}

export function selectFile(index) {
  return {
    type: SELECT_FILE,
    index
  };
}

export const pickModifierKeys = pick(['ctrlKey', 'metaKey', 'shiftKey']);

export function setModifierKeys(keyboardEvent) {
  return {
    type: SET_MODIFIER_KEYS,
    modifierKeys: pickModifierKeys(keyboardEvent)
  };
}