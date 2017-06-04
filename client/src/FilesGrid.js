import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import "bootstrap/dist/css/bootstrap.css";
import ReactDataGrid from "react-data-grid";
import glamorous from "glamorous";
import { css, before } from "glamor";
import { Formatters } from "react-data-grid-addons";
import sharedConfig from "./shared-config";
import { selectFile } from "./actions";

const columns = [
  {
    key: `thumb_${sharedConfig.thumbSize}`,
    name: "Thumb",
    getRowMetaData: ({ url_private, filetype }) => ({ url_private, filetype }),
    formatter: ({ value, dependentValues: { url_private, filetype } }) => (
      <a target="_blank" rel="noopener noreferrer" href={url_private}>
        <Formatters.ImageFormatter value={value} />
      </a>
    ),
    width: sharedConfig.thumbSize
  },
  {
    key: "name",
    name: "Name",
    filterable: true,
    sortable: true,
    resizable: true,
    getRowMetaData: ({ title }) => ({ title }),
    formatter: ({ value, dependentValues }) =>
      value !== dependentValues.title
        ? <span>
            <strong>{value}</strong>
            <br />
            <span>{dependentValues.title}</span>
          </span>
        : <span><strong>{value}</strong></span>
  },
  {
    key: "filetype",
    name: "Type",
    width: 100,
    filterable: true,
    sortable: true
  },
  {
    key: "size",
    name: "Size",
    filterable: true,
    sortable: true,
    getRowMetaData: ({ filesize }) => ({ filesize }),
    formatter: ({ dependentValues: { filesize } }) => <span>{filesize}</span>
  },
  {
    key: "created",
    name: "Created On",
    filterable: true,
    sortable: true,
    formatter: ({ value }) => {
      var d = new Date(value * 1000);
      return (
        <span>
          {[d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-")}
        </span>
      );
    }
  },
  {
    key: "username",
    name: "Created By",
    filterable: true,
    sortable: true
  }
];

const spin = css.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(359deg)" }
});

const spinSize = 120;

const Spinner = glamorous.div(
  css({
    animation: `${spin} 1.25s infinite linear`,
    position: "relative",
    margin: `${spinSize / 2.4}px auto`,
    height: `${spinSize}px`,
    width: `${spinSize}px`,
    fontSize: `${spinSize}px`,
    lineHeight: `${spinSize * 1.1}px`
  }),
  before({
    display: "block",
    position: "absolute",
    content: "'🤔'"
  })
);

function logevt(evt) {
  return {
    [evt]: console.log.bind(console, evt)
  };
}

const gridProps = {
  ...logevt("onGridSort"),
  ...logevt("onGridRowsUpdated"),
  columns,
  rowGetter: () => {},
  rowsCount: 0,
  enableCellSelect: false,
  rowHeight: sharedConfig.thumbSize,
  headerRowHeight: 35,
  minHeight: 640
};

const waiting = <ReactDataGrid {...gridProps} emptyRowsView={Spinner} />;

class FilesGrid extends Component {
  constructor(props) {
    super(props);
    this._select = this._select.bind(this);
  }
  _select(i) {
    if (i !== -1) {
      this.props.selectFile(i);
    }
  }
  render() {
    const { results, selected } = this.props;
    return results
      ? <ReactDataGrid
          {...gridProps}
          rowSelection={{
            showCheckbox: false,
            selectBy: {
              indexes: selected || []
            }
          }}
          rowGetter={i => results.items[i]}
          rowsCount={results.items.length}
          onRowClick={this._select}
        />
      : waiting;
  }
}

function getResults({ results, selected }) {
  return { results, selected };
}

function provideActions(dispatch) {
  return bindActionCreators({ selectFile }, dispatch);
}

export default connect(getResults, provideActions)(FilesGrid);
