import qs from "querystring";
import pick from "lodash/fp/pick";

export const REQUEST_FILES = "REQUEST_FILES";
export const RECEIVE_FILES = "RECEIVE_FILES";
export const FAIL_RECEIVE_FILES = "FAIL_RECEIVE_FILES";
export const SELECT_FILE = "SELECT_FILE";
export const SET_MODIFIER_KEYS = "SET_MODIFIER_KEYS";
export const TRY_DELETE_FILES = "TRY_DELETE_FILES";
export const FAIL_DELETE_FILES = "FAIL_DELETE_FILES";
export const FILES_DELETED = "FILES_DELETED";
export const AUTHORIZED = "AUTHORIZED";
export const UNAUTHORIZED = "UNAUTHORIZED";

const BASE = "/files/";

export function identifyWithServer() {
  return dispatch => fetch('/whoami', { credentials: 'include' })
    .then(response => response.text().then(id => {
      if (response.status !== 200) {
        dispatch({ type: UNAUTHORIZED });
      } else {
        dispatch({ type: AUTHORIZED, id });
      }
    }))
    .catch(() => dispatch({ type: UNAUTHORIZED }));
}

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

function failReceiveFiles(reason) {
  return {
    type: FAIL_RECEIVE_FILES,
    reason: reason.toString()
  };
}

function fetchFiles(options) {
  return dispatch => {
    dispatch(requestFiles(options));
    return fetch(`${BASE}?${qs.stringify(options)}`, { credentials: 'include' })
      .then(response => response.json())
      .then(json => dispatch(receiveFiles(options, json)))
      .catch(reason => dispatch(failReceiveFiles(reason)));
  };
}

function shouldFetchFiles(state) {
  if (!state.results || state.invalid) {
    return true;
  } else if (state.isFetching) {
    return false;
  }
  return true;
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

export function tryDeleteFiles(selected, results) {
  const ids = selected.map((i) => results.items[i].id);
  return (dispatch) => {
    dispatch({
      type: TRY_DELETE_FILES,
      ids
    });
    return fetch(`${BASE}delete`, {
      method: 'POST',
      credentials: 'include',
      body: ids.join(',')
    }).then((res) => {
      if (res.status !== 200) {
        dispatch({
          type: FAIL_DELETE_FILES,
          reason: res.statusText
        })
      } else {
        dispatch({
          type: FILES_DELETED,
          ids
        });
      }
    }).catch((reason) => {
      dispatch({
        type: FAIL_DELETE_FILES,
        reason: reason.toString()
      })
    })
  }
}

export const pickModifierKeys = pick(['ctrlKey', 'metaKey', 'shiftKey']);

export function setModifierKeys(keyboardEvent) {
  return {
    type: SET_MODIFIER_KEYS,
    modifierKeys: pickModifierKeys(keyboardEvent)
  };
}