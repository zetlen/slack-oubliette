import React, { Component } from "react";
import glamorous from "glamorous";
import sharedConfig from "./shared-config"

let PendingPool = {};
let ReadyPool = {};

let MediaIcons = {
  PICTURE: "picture",
  VIDEO: "film",
  AUDIO: "headphones",
  UNKNOWN: "save-file"
};

let MediaTypes = {
  png: MediaIcons.PICTURE,
  jpg: MediaIcons.PICTURE,
  gif: MediaIcons.PICTURE,
  mov: MediaIcons.VIDEO,
  mp4: MediaIcons.VIDEO,
  m4a: MediaIcons.AUDIO,
  mp3: MediaIcons.AUDIO,
  unknown: MediaIcons.UNKNOWN
};

const MediaDiv = glamorous.div({
  backgroundSize: "100%",
  backgroundRepeat: "no-repeat",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: sharedConfig.thumbSize - 15,
  width: sharedConfig.thumbSize - 15
});

const iconColor = "#999999";
const MediaLink = glamorous.a({
  display: "inline-block",
  textDecoration: "none",
  color: iconColor,
  height: "100%",
  width: "100%",
  "fontSize": "24px",
  "&:hover": {
      color: iconColor,
      textDecoration: "none"
  }
});

export default class MediaFormatter extends Component {
  constructor(props) {
    super(props);
    this._mediaType = this.state = {
      ready: false,
      mediaType: MediaTypes[props.filetype] || MediaTypes.unknown
    };
    this._onLoad = this._onLoad.bind(this);
  }

  componentWillMount() {
    if (this._willHaveThumbnail()) {
      this._load(this.props.value);
    }
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({ value: null });
      this._load(nextProps.value);
    }
  }

  _willHaveThumbnail() {
    return this.state.mediaType === MediaIcons.PICTURE;
  }

  _load(src) {
    let imageSrc = src;
    if (ReadyPool[imageSrc]) {
      this.setState({ value: imageSrc });
      return;
    }

    if (PendingPool[imageSrc]) {
      PendingPool[imageSrc].push(this._onLoad);
      return;
    }

    PendingPool[imageSrc] = [this._onLoad];

    let img = new Image();
    img.onload = () => {
      PendingPool[imageSrc].forEach(callback => {
        callback(imageSrc);
      });
      delete PendingPool[imageSrc];
      img.onload = null;
      imageSrc = undefined;
    };
    img.src = imageSrc;
  }

  _onLoad(src) {
    if (this._isMounted && src === this.props.value) {
      this.setState({
        value: src
      });
    }
  }

  render() {
    let inner;
    if (this.state.value) {
      inner = (
        <MediaDiv
          style={{
            backgroundImage: `url(${this.state.value})`
          }}
        />
      );
    } else {
      inner = (
        <MediaDiv>
          <span className={`glyphicon glyphicon-${this.state.mediaType}`} />
        </MediaDiv>
      );
    }
    return (
      <MediaLink target="_blank" rel="noopener noreferrer" href={this.props.url}>
        {inner}
      </MediaLink>
    );
  }
}
