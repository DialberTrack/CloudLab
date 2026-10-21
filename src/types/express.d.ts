import { JwtPayLoad } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayLoad & {
        id: string;
        role: string;
      };
    }
  }
}