import React from "react";
import createHistory from "history/createBrowserHistory";
import qs from "querystring";

export default function Router() {
  const history = createHistory();
  const QueryLink = ({ query, root = "/", children }) => (
    <a
      href={root + qs.stringify(query)}
      onClick={e => history.push(e.currentTarget.href)}
    >
      {children}
    </a>
  );
  // force redux-like pattern with no arguments to handler
  const onRoute = handler => history.listen(() => handler());
  const getQuery = () => qs.parse(history.location.search.slice(1));
  return {
    QueryLink,
    onRoute,
    getQuery
  };
}
