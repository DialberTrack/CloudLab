import { Router } from 'express';
import { logger } from '../utils/logger.js';

export const internalRoutes: Router = Router();

internalRoutes.route('/workspace-auth').get((req, res) => {
    logger.info('Workspace authentication route accessed');
    res.status(200).json({ message: 'Workspace authentication route' });
});
