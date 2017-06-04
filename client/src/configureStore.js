import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from "redux-thunk";
import { createLogger } from "redux-logger";
import rootReducer from "./reducers";

const loggerMiddleware = createLogger();

export default function configureStore() {
  return createStore(
    rootReducer,
    {
      modifiers: {},
      selected: [],
      lastSelected: -1
    },
    applyMiddleware(thunkMiddleware, loggerMiddleware)
  );
}
