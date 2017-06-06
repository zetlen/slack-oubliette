import React, { Component } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import "bootstrap/dist/css/bootstrap.css";
import ReactDataGrid from "react-data-grid";
import bindAll from "lodash/bindAll";
import sortedUniqBy from "lodash/sortedUniqBy";
import uniqBy from "lodash/uniqBy";
import property from "lodash/property";
import throttle from "lodash/throttle";
import moment from "moment";
import humanize from "humanize";
import glamorous from "glamorous";
import { css, before } from "glamor";
import { Filters } from "react-data-grid-addons";
import FilesToolbar from "./FilesToolbar";
import sharedConfig from "./shared-config";
import { selectFile } from "./actions";
import filterParameter from "./filterParameter";
import DateRangeFilter from "./DateRangeFilter";
import MediaFormatter from "./MediaFormatter";
import ValidityRowRenderer from "./ValidityRowRenderer";

const { AutoCompleteFilter, SingleSelectFilter } = Filters;

const columns = [
  {
    key: `thumb_${sharedConfig.thumbSize}`,
    name: "🖼",
    getRowMetaData: ({ url_private, filetype }) => ({ url_private, filetype }),
    formatter: ({ value, dependentValues: { url_private, filetype } }) =>
      <MediaFormatter value={value} url={url_private} filetype={filetype} />,
    width: sharedConfig.thumbSize
  },
  {
    key: "name",
    name: "🏷",
    filterable: true,
    filterRenderer: AutoCompleteFilter,
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
    name: "🗃",
    width: 100,
    resizable: true,
    filterable: true,
    filterRenderer: SingleSelectFilter,
    sortable: true
  },
  {
    key: "size",
    name: "🗜",
    width: 120,
    filterable: true,
    filterRenderer: () => <span />,
    sortable: true,
    formatter: ({ value }) => <span>{humanize.filesize(value)}</span>
  },
  {
    key: "created",
    name: "📅",
    filterable: true,
    filterRenderer: DateRangeFilter,
    sortable: true,
    width: 240,
    formatter: ({ value }) => {
      var d = new Date(value * 1000);
      return (
        <span>
          {moment(d).format("llll")}
        </span>
      );
    }
  },
  {
    key: "username",
    name: "🕵",
    filterable: true,
    filterRenderer: SingleSelectFilter,
    sortable: true,
    width: 200
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

const gridProps = {
  columns,
  rowGetter: () => { },
  rowsCount: 0,
  enableCellSelect: false,
  rowHeight: sharedConfig.thumbSize,
  headerRowHeight: 35,
  minHeight: window.innerHeight
};

const waiting = (
  <ReactDataGrid
    {...gridProps}
    toolbar={<FilesToolbar enableFilter={true} filterRowsButtonText="🔍" />}
    emptyRowsView={Spinner}
  />
);

class FilesGrid extends Component {
  constructor(props) {
    super(props);
    bindAll(this, [
      "_select",
      "_sort",
      "_filter",
      "_clearFilters",
      "_captureGridRef",
      "_getValidFilterValues"
    ]);
    this._filterParameter = filterParameter(props.router, columns);
    this.state = {
      height: window.innerHeight
    };
  }
  _select(i) {
    if (i !== -1) {
      this.props.selectFile(i);
    }
  }
  _captureGridRef(grid) {
    this._grid = grid;
  }
  _sort(field, direction) {
    if (direction === "NONE") {
      this.props.router.removeQueryParam("sort");
    } else {
      this.props.router.updateQuery({
        sort: `${direction.toLowerCase()} ${field}`
      });
    }
  }
  _filter({ filterTerm, column }) {
    let newFilter;
    if (!filterTerm) {
      newFilter = this._filterParameter.remove(column.key);
    } else if (Array.isArray(filterTerm)) {
      if (filterTerm.length === 0) {
        newFilter = this._filterParameter.remove(column.key);
      } else {
        newFilter = this._filterParameter.add(
          column.key,
          filterTerm.map(({ value }) => ({ value }))
        );
      }
    } else {
      newFilter = this._filterParameter.add(column.key, filterTerm.value);
    }
    if (newFilter) {
      this.props.router.updateQuery({
        filter: newFilter
      });
    } else {
      this.props.router.removeQueryParam("filter");
    }
  }
  _clearFilters() {
    this.props.router.removeQueryParam("filter");
  }
  _getValidFilterValues(column) {
    const currentSort = this.props.router.getQuery().sort;
    const isSortedByThisColumn =
      currentSort && currentSort.split(" ").pop() === column;
    let uniq = isSortedByThisColumn ? sortedUniqBy : uniqBy;
    let prop = property(column);
    return uniq(this.props.results.items, prop).map(prop);
  }
  componentDidMount() {
    window.addEventListener(
      "resize",
      throttle(() => {
        this.setState({
          height: window.innerHeight
        });
      }, 200)
    );
    if (this.props.sortColumn && this.props.sortDirection) {
      this._grid.setState({
        sortColumn: this.props.sortColumn,
        sortDirection: this.props.sortDirection
      });
    }
  }
  render() {
    const { results, selected } = this.props;
    if (!results) {
      return waiting;
    }
    return (
      <ReactDataGrid
        {...gridProps}
        ref={this._captureGridRef}
        minHeight={this.state.height}
        rowSelection={{
          showCheckbox: false,
          selectBy: {
            indexes: selected || []
          }
        }}
        rowGetter={i => results.items[i]}
        rowsCount={results.items.length}
        onRowClick={this._select}
        onGridSort={this._sort}
        onAddFilter={this._filter}
        onClearFilters={this._clearFilters}
        getValidFilterValues={this._getValidFilterValues}
        toolbar={<FilesToolbar enableFilter={true} filterRowsButtonText="🔍" />}
        rowRenderer={ValidityRowRenderer}
      />
    );
  }
}

function getResults({ results, ranges, selected }) {
  return { results, ranges, selected };
}

function provideActions(dispatch) {
  return bindActionCreators({ selectFile }, dispatch);
}

export default connect(getResults, provideActions)(FilesGrid);
