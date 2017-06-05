import React, { Component } from "react";
import { css } from "glamor";
import { connect } from "react-redux";
import moment from "moment";
import { DateRangePicker } from "react-dates";
import "react-dates/lib/css/_datepicker.css";
import bindAll from "lodash/bindAll";

const dateRangeStyle = css({
  "& .DateRangePickerInput": {
    borderRadius: "4px"
  },
  "& .DateInput__input": {
    borderRadius: "4px"
  },
  "& .DateInput": {
    borderRadius: "4px",
    padding: 0,
    fontSize: "12px",
    lineHeight: "20px",
    width: 80
  }
});

class DateRangeFilter extends Component {
  constructor(props) {
    super(props);
    bindAll(this, ["_setFocus", "_isOutOfBounds", "handleChange"]);
    this.state = {};
  }

  componentWillMount() {
    if (this.props.range) {
      this._setBounds(this.props.range.min, this.props.range.max);
    }
  }

  componentWillReceiveProps(newProps) {
    if (newProps.range) {
      this._setBounds(newProps.range.min, newProps.range.max);
    }
  }

  _setBounds(min, max) {
    this._min = moment(min * 1000);
    this._max = moment(max * 1000);
  }

  _isOutOfBounds(date) {
    return false; // !date.isBetween(this._min, this._max, "day", "[]");
  }

  _setFocus(focusedInput) {
    this.setState({ focusedInput });
  }

  filterValues(row, { filterTerm }, columnKey) {
    if (!filterTerm) {
      return true;
    }
    const rowDate = moment(row[columnKey] * 1000);
    return rowDate.isBetween(
      filterTerm.startDate,
      filterTerm.endDate,
      "day",
      "[]"
    );
  }

  handleChange({ startDate, endDate }) {
    this.setState({ startDate, endDate });
    // TODO: create a proper filter rules engine
    let filterTerms = [];
    if (startDate) {
      filterTerms.push({
        operation: '>=',
        value: startDate.unix()
      });
    }
    if (endDate) {
      filterTerms.push({
        operation: '<=',
        value: endDate.unix()
      });
    }
    this.props.onChange({
      filterTerm: { value: filterTerms },
      column: this.props.column,
      filterValues: this.filterValues
    });
  }

  render() {
    return (
      <div {...dateRangeStyle}>
        <DateRangePicker
          startDate={this.state.startDate}
          endDate={this.state.endDate}
          onDatesChange={this.handleChange}
          focusedInput={this.state.focusedInput} // PropTypes.oneOf([START_DATE, END_DATE]) or null,
          onFocusChange={this._setFocus} // PropTypes.func.isRequired,
          isOutsideRange={this._isOutOfBounds}
        />
      </div>
    );
  }
}

// TODO: this is a hack
function getCreatedDate({ results }) {
  return results.ranges ? { range: results.ranges.created } : {};
}

export default connect(getCreatedDate)(DateRangeFilter);
