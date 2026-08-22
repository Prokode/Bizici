export const MONGOOSE_CONNECTED_STATE = 1;

export function requiresMongoReadiness(rawValue: string | undefined): boolean {
  return rawValue === "true";
}

export function isMongoReady(readyState: number): boolean {
  return readyState === MONGOOSE_CONNECTED_STATE;
}
