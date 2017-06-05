import React, { Component } from "react";
import { connect } from "react-redux";
import defer from "lodash/defer";
import FilesGrid from "./FilesGrid";
import glamorous from "glamorous";
import {
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
    this.props.router.onRoute(this.refresh);
  }

  componentDidMount() {
    this.refresh();
    document.body.addEventListener("keydown", this.dispatchModifierKeys);
    document.body.addEventListener("mousedown", this.dispatchModifierKeys);
    document.body.addEventListener("keyup", e => {
      const keys = pickModifierKeys(e);
      defer(this.dispatchModifierKeys, keys);
    });
  }

  componentWillReceiveProps({ invalid }) {
    if (invalid) {
      this.refresh();
    }
  }

  render() {
    return (
      <Main>
        <FilesGrid
          ranges={this.props.ranges}
          router={this.props.router}
          results={this.props.results}
        />
      </Main>
    );
  }

  dispatchModifierKeys(e) {
    this.props.dispatch(setModifierKeys(e));
  }

  refresh() {
    this.props.dispatch(fetchFilesIfNeeded(this.props.router.getQuery()));
  }
}

export default connect(({ invalid }) => ({ invalid }))(App);
