import React from "react";
import humanize from "humanize";
import glamorous from "glamorous";
import { bindActionCreators } from "redux";
import { Toolbar } from "react-data-grid-addons";
import { connect } from "react-redux";
import { tryDeleteFiles } from "./actions";
import Iconography from "./Iconography";

const DeleteButton = glamorous.button({
  marginRight: "8px",
  color: "#ffffff !important",
  fontWeight: "bold",
  backgroundColor: "#cc0000 !important"
});

const LeftTools = glamorous.div({
  float: "left"
});

const Summary = glamorous.p({});

class FilesToolbar extends Toolbar {
  _totalToDelete() {
    return this.props.selected.reduce(
      (total, i) => total + this.props.results.items[i].size,
      0
    );
  }

  _kill(numToDelete, noun) {
    const confirmation = `Delete ${numToDelete} ${noun}, to free up ${humanize.filesize(
      this._totalToDelete()
    )}?`;
    if (window.confirm(confirmation)) {
      this.props.tryDeleteFiles(this.props.selected, this.props.results);
    }
  }

  renderDeleteButton() {
    const numToDelete = this.props.selected && this.props.selected.length;
    if (numToDelete) {
      const noun = numToDelete > 1 ? "files" : "file";
      return (
        <DeleteButton
          type="button"
          className="btn btn-danger"
          onClick={() => this._kill(numToDelete, noun)}
        >{`Delete ${numToDelete} ${noun}`}</DeleteButton>
      );
    }
  }

  render() {
    return (
      <div className="react-grid-Toolbar">
        <LeftTools>
          {this.props.results &&
            <Summary>
              <Iconography size="24" />
              <span>Displaying </span>
              <strong>{this.props.results.count}
              {" "}</strong>
              <span>files, totaling </span>
              <strong>{this.props.results.totals.all.filesize}</strong>
            </Summary>}
        </LeftTools>
        <div className="tools">
          {this.renderDeleteButton()}
          {this.renderToggleFilterButton()}
        </div>
      </div>
    );
  }
}

function getSelected({ selected, results }) {
  return { selected, results };
}

function provideActions(dispatch) {
  return bindActionCreators({ tryDeleteFiles }, dispatch);
}

export default connect(getSelected, provideActions)(FilesToolbar);
