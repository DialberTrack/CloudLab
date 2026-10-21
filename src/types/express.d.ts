import type { AccessTokenPayload } from "../utils/TokenManager.js";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}