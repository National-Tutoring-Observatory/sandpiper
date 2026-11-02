import each from "lodash/each";
import isArray from "lodash/isArray";
import type { Route, RouteOperation } from "../api.types";
import ROUTES from "../apis";

const setDefaults = (route: Route, item: RouteOperation): void => {
  const routeItem = route[item];
  if (!routeItem) return;
  routeItem.param = routeItem.param || "";
  routeItem.body = routeItem.body || {};
  routeItem.query = routeItem.query || {};
  routeItem.files = routeItem.files || {};
  routeItem.middleware = routeItem.middleware || [];
  routeItem.props = routeItem.props || {};
  routeItem.hasCors = !!routeItem.hasCors;
  routeItem.shouldSkipValidation = !!routeItem.shouldSkipValidation;
  routeItem.shouldSkipRateLimit = !!routeItem.shouldSkipRateLimit;
  routeItem.rateLimit = routeItem.rateLimit
    ? routeItem.rateLimit
    : item === "list" || item === "read"
      ? 2000
      : 200;
};

const registerApiRoute = (route: Route): void => {
  if (!route.basePath) console.warn("Route needs a basePath attribute");
  if (!route.controller)
    console.warn("Route needs a controller", route.basePath);
  if (route.list) setDefaults(route, "list");
  if (route.create) setDefaults(route, "create");
  if (route.read) setDefaults(route, "read");
  if (route.update) setDefaults(route, "update");
  if (route.delete) setDefaults(route, "delete");
  ROUTES.push(route);
};

export default function registerApi(route: Route | Route[]): void {
  if (isArray(route)) {
    each(route, registerApiRoute);
  } else {
    registerApiRoute(route);
  }
}
