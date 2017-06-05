import createHistory from "history/createBrowserHistory";
import qs from "querystring";
import omit from "lodash/omit";

export default function Router() {
  const history = createHistory();
  const getQuery = () => qs.parse(history.location.search.slice(1));
  const root = "/";
  const toUrl = params => root + '?' + qs.stringify(params);
  const replaceQuery = params => history.push(toUrl(params));
  const updateQuery = params =>
    replaceQuery({
      ...getQuery(),
      ...params
    });
  const removeQueryParam = paramName =>
    replaceQuery(omit(getQuery(), paramName));
  const onRoute = handler => history.listen(() => handler());
  // const QueryLink = ({ query, root = "/", children }) => (
  //   <a
  //     href={root + qs.stringify(query)}
  //     onClick={e => history.push(e.currentTarget.href)}
  //   >
  //     {children}
  //   </a>
  // );
  // force redux-like pattern with no arguments to handler
  return {
    getQuery,
    replaceQuery,
    updateQuery,
    removeQueryParam,
    onRoute
  };
}
