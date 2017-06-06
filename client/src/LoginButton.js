import React from "react";
import { css } from "glamor";
import qs from "querystring";
import sharedConfig from "./shared-config.json";
import Iconography from "./Iconography";

const loginButtonCss = css({
    display: 'block',
    margin: '40px auto',
    textAlign: 'center',
    '&:hover': {
        textDecoration: 'none !important'
    }
});

const { protocol, host } = window.location;
const params = qs.stringify({
    scope: "identity.basic",
    client_id: sharedConfig.clientId,
    redirect_uri: `${protocol}//${host}${sharedConfig.authPath}`
});

export default function LoginButton() {
    return <a
        {...loginButtonCss}
        href={`https://slack.com/oauth/authorize?${params}`}>
        <Iconography size={48} />
        <img {...loginButtonCss}
            alt="Sign in with Slack"
            height="40"
            width="172"
            src="https://platform.slack-edge.com/img/sign_in_with_slack.png"
            srcSet="https://platform.slack-edge.com/img/sign_in_with_slack.png 1x, https://platform.slack-edge.com/img/sign_in_with_slack@2x.png 2x"
        />
    </a>;
}