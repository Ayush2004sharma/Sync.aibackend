import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';

dotenv.config();

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    const projectId = socket.handshake.query.projectId;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error('Invalid or missing project ID'));
    }

    const project = await projectModel.findById(projectId);
    if (!project) {
      return next(new Error('Project not found'));
    }

    socket.project = project;

    if (!token) {
      return next(new Error('Authentication error - token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return next(new Error('Authentication error - token invalid'));
    }

    socket.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
});

io.on('connection', socket => {
  if (!socket.project || !socket.project._id) {
    console.error('socket.project is null or invalid — disconnecting...');
    socket.disconnect(true);
    return;
  }

  socket.roomId = socket.project._id.toString();
  console.log('New client connected to room:', socket.roomId);
  socket.join(socket.roomId);

  socket.on('project-message', data => {
    console.log('Message received:', data);
    socket.broadcast.to(socket.roomId).emit('project-message', data);
  });

  socket.on('disconnect', reason => {
    console.log(`Client disconnected from room ${socket.roomId}. Reason: ${reason}`);
    socket.leave(socket.roomId);
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
