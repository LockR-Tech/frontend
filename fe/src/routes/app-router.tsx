import { useRoutes } from "react-router-dom";
import routesConfig from "./routes-config";

const AppRouter = () => {
  const element = useRoutes(routesConfig);
  return element;
};

export default AppRouter;