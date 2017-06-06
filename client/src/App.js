import React, { Component } from "react";
import { connect } from "react-redux";
import defer from "lodash/defer";
import FilesGrid from "./FilesGrid";
import io from "socket.io-client";
import glamorous from "glamorous";
import LoginButton from "./LoginButton";
import {
  identifyWithServer,
  fetchFilesIfNeeded,
  pickModifierKeys,
  setModifierKeys
} from "./actions";

const Main = glamorous.div({
  "& .react-grid-HeaderRow:first-child .react-grid-HeaderCell": {
    "fontSize": "2em",
    "padding": "0 8px",
    '& .pull-right': {
      fontSize: ".8em"
    }
  },
  "& .react-grid-Cell:focus": {
    outlineWidth: 0
  }
});

class App extends Component {
  constructor(props) {
    super(props);
    this.refresh = this.refresh.bind(this);
    this.dispatchModifierKeys = this.dispatchModifierKeys.bind(this);
    // TODO: make it actually do filtering from props instead of state
    if (this.props.router.getQuery().filter) {
      this.props.router.removeQueryParam('filter');
    }
    this.props.router.onRoute(this.refresh);
  }

  componentDidMount() {
    this.identify();
    document.body.addEventListener("keydown", this.dispatchModifierKeys);
    document.body.addEventListener("mousedown", this.dispatchModifierKeys);
    document.body.addEventListener("keyup", e => {
      const keys = pickModifierKeys(e);
      defer(this.dispatchModifierKeys, keys);
    });
  }

  componentWillReceiveProps({ userId }) {
    if (userId && !this.props.userId) {
      // just authenticated!
      const { protocol, host } = window.location;
      this._socket = io.connect(`${protocol}//${host}`);
      this._socket.on('connected', () => {
        this._socket.emit('register', userId);
        this.refresh();
      });
      this._socket.on('update', () => {
        this.refresh();
      });
    }
  }

  render() {
    return (
      <Main>
        {(!this.props.userId || this.props.unauthorized) ? <LoginButton /> :
          <FilesGrid
            ranges={this.props.ranges}
            router={this.props.router}
            results={this.props.results}
          />}
      </Main>
    );
  }

  dispatchModifierKeys(e) {
    this.props.dispatch(setModifierKeys(e));
  }

  identify() {
    this.props.dispatch(identifyWithServer());
  }

  refresh() {
    this.props.dispatch(fetchFilesIfNeeded(this.props.router.getQuery()));
  }
}

export default connect(({ userId, unauthorized }) => ({ userId, unauthorized }))(App);
