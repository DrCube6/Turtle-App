export type LoginResponse = {
  status: number;
  appKey?: string | null;
  hatchery?: number | null;
  message?: string | null;
};

// export type AppConfigPayload = {
//   hatchery: number;
//   sample_rate_min: number;
//   wifi_ssid: string;
//   wifi_pass: string;
//   auth_key: string;
// };
