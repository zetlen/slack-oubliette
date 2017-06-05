import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from "redux-thunk";
import { createLogger } from "redux-logger";
import rootReducer from "./reducers";

let middleware;
if (process.env.NODE_ENV === "production") {
  middleware = applyMiddleware(thunkMiddleware);
} else {
  const loggerMiddleware = createLogger();
  middleware = applyMiddleware(thunkMiddleware, loggerMiddleware);
}

export default function configureStore() {
  return createStore(
    rootReducer,
    {
      modifiers: {},
      selected: [],
      lastSelected: -1
    },
    middleware
  );
}
