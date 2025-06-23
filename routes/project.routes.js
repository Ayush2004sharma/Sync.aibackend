import {Router} from 'express';

import {body} from 'express-validator';
import * as projectController from '../controllers/project.controller.js';

import { createProjectWithMessage } from '../controllers/project.controller.js';

import * as authMiddleware from '../middleware/auth.middleware.js';

const routes= Router();

routes.post('/create', 
  authMiddleware.authUser,
  body('name').isString().withMessage('Project name is required'),
  projectController.createProject
)

routes.get('/all',
  authMiddleware.authUser,
  projectController.getAllProjects
)

routes.put('/add-user',
  authMiddleware.authUser,
  body('projectId').isString().withMessage('Project ID is required'),
  body('users').isArray({min: 1}).withMessage('At least one user ID is required').custom((user)=> user.every(user=> typeof user=== 'string')).withMessage('User IDs must be strings'),
  projectController.addUserToProject
)

routes.get('/get-project/:projectId',
  authMiddleware.authUser,
  projectController.getProjectById
)

routes.post(
  '/create-with-message',
  body('message').notEmpty().withMessage('Message is required'),
  authMiddleware.authUser,
  createProjectWithMessage
);



// Fetch all messages for a project
routes.get(
  '/:projectId/messages',
  authMiddleware.authUser,
  projectController.getMessages
);

// Add a new message to a project, get AI reply, save both
routes.post(
  '/:projectId/messages',
  authMiddleware.authUser,
  body('message').notEmpty().withMessage('Message is required'),
  projectController.addMessage
);

routes.post(
  '/:projectId/generate-code',
   authMiddleware.authUser,
  body('message').notEmpty().withMessage('Prompt message is required'),
  projectController.generateProjectCode
)

export default routes;