import { expoClient } from "@better-auth/expo/client";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { runtimeConfig } from "./runtime-config";

const APP_SCHEME = "jam";

export const authClient = createAuthClient({
  baseURL: runtimeConfig.convexSiteUrl,
  plugins: [
    convexClient(),
    ...(Platform.OS === "web"
      ? [crossDomainClient()]
      : [
          expoClient({
            scheme: APP_SCHEME,
            storagePrefix: APP_SCHEME,
            storage: SecureStore,
          }),
        ]),
  ],
});
