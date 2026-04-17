import { createNavigationContainerRef, type ParamListBase } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<ParamListBase>();

export function navigate(name: string, params?: object) {
  if (!navigationRef.isReady()) return;
  const ref = navigationRef as unknown as {
    navigate: (routeName: string, routeParams?: object) => void;
  };
  ref.navigate(name, params);
}
