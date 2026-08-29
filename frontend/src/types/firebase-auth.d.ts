import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  /** API oficial disponível no entrypoint React Native do SDK Firebase. */
  export function getReactNativePersistence(storage: unknown): Persistence;
}
