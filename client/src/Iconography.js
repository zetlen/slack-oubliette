import React from "react";
export default function Iconography({ size }) {
    return <span>
        <img
            src="./slack-icon.png"
            alt="#"
            style={{
                height: size,
                width: size,
                verticalAlign: "middle"
            }}
        />
        <span
            role="img"
            aria-label="oubliette"
            style={{ fontSize: `${size}px` }}
        >🔮</span>
    </span>
}