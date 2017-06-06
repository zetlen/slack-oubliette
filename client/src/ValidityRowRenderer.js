import React, { Component } from 'react';
import ReactDataGrid from "react-data-grid";
import { connect } from "react-redux";
const { Row } = ReactDataGrid;
class ValidityRowRenderer extends Component {
    getRowStyle() {
        return {
            backgroundColor: this.getRowBackground(),
            opacity: this.isInvalid() ? .5 : 1
        };
    }

    getRowBackground() {
        return this.props.idx % 2 ? '#f3f3ff' : '#ffffff';
    }

    isInvalid() {
        return this.props.deleted && this.props.deleted.indexOf(this.props.row.id) > -1;
    }

    render() {
        // here we are just changing the style
        // but we could replace this with anything we liked, cards, images, etc
        // usually though it will just be a matter of wrapping a div, and then calling back through to the grid
        return (<div style={this.getRowStyle()}><Row ref={node => this.row = node} {...this.props} /></div>);
    }
}

export default connect(({ deleted }) => ({ deleted }))(ValidityRowRenderer);