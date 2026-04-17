import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { API_URL } from "../lib/api";
import { navigationRef } from "../lib/navigation";

type CheckResult = {
  name: string;
  ok: boolean;
  details: string;
};

async function checkStorage() {
  const key = "zorby.healthcheck";
  await AsyncStorage.setItem(key, "ok");
  const value = await AsyncStorage.getItem(key);
  await AsyncStorage.removeItem(key);
  return value === "ok";
}

export async function healthCheck() {
  if (!__DEV__) return;

  const results: CheckResult[] = [];

  try {
    const response = await fetch(`${API_URL}/api/mobile/discovery`);
    results.push({
      name: "API_URL",
      ok: response.ok,
      details: response.ok ? "API acessível" : `Resposta ${response.status}`,
    });
  } catch (error) {
    results.push({
      name: "API_URL",
      ok: false,
      details: error instanceof Error ? error.message : "Falha ao conectar",
    });
  }

  try {
    const ok = await checkStorage();
    results.push({
      name: "AsyncStorage",
      ok,
      details: ok ? "Write/read/delete funcionando" : "Falha no ciclo completo",
    });
  } catch (error) {
    results.push({
      name: "AsyncStorage",
      ok: false,
      details: error instanceof Error ? error.message : "Falha ao validar storage",
    });
  }

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    results.push({
      name: "Localização",
      ok: permission.granted,
      details: permission.granted ? "Permissão concedida" : `Status: ${permission.status}`,
    });
  } catch (error) {
    results.push({
      name: "Localização",
      ok: false,
      details: error instanceof Error ? error.message : "Falha ao validar localização",
    });
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    results.push({
      name: "Notificações",
      ok: permission.granted,
      details: permission.granted ? "Permissão concedida" : `Status: ${permission.status}`,
    });
  } catch (error) {
    results.push({
      name: "Notificações",
      ok: false,
      details: error instanceof Error ? error.message : "Falha ao validar notificações",
    });
  }

  results.push({
    name: "navigationRef",
    ok: navigationRef.isReady(),
    details: navigationRef.isReady() ? "Inicializado" : "Ainda não pronto",
  });

  const lines = results.map((result) => `${result.ok ? "✓" : "✗"} ${result.name}: ${result.details}`);
  console.log("[healthCheck]\n" + lines.join("\n"));
}
