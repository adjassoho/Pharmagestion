export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_OBASA_DEMO_MODE === "true";
}
