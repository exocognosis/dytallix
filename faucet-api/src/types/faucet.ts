export interface FaucetTokenRequest { symbol: string; amount: string; }
export interface FaucetRequestBody { address: string; tokens: FaucetTokenRequest[]; }
export interface DispensedToken { symbol: string; amount: string; txHash: string; }
export interface FaucetErrorPayload {
  code: string; httpStatus: number; message: string; details?: Record<string, unknown>;
}
export interface FaucetSuccessResponse {
  success: true; dispensed: DispensedToken[]; cooldowns: any; message: string;
}
export interface FaucetErrorResponse {
  success: false; dispensed: []; cooldowns: any; error: FaucetErrorPayload;
}