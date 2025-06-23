import projectModel from "../models/project.model.js";
import { generateGeminiResponse } from "./gemini.service.js";


import mongoose from "mongoose";

export const createProject = async ({ name, userId }) => {
  if (!name) {
    throw new Error("Project name is required");
  }
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const project = await projectModel.create({
      name,
      users: [userId],
    });
    return project; // ✅ return inside the try block
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Project name already exists");
    }
    throw error;
  }
};


export const getAllProjectsByUserId = async({userId})=>{
  if(!userId){
    throw new Error('User ID is required');
  }

  const allUserProjects = await projectModel.find({
    users: userId,
  })

  return allUserProjects;
}

export const addUserToProject = async({projectId, users, userId})=>{
  if(!projectId){
    throw new Error('Project ID is required');
  }

  if(!mongoose.Types.ObjectId.isValid(projectId)){
    throw new Error('Invalid Project ID');
  }
  if(!users){
    throw new Error('users are required ');
  }
  if(!Array.isArray(users)||users.some(userId=>!mongoose.Types.ObjectId.isValid(userId))){
    throw new Error('Invalid users array');
  }
  if(!userId){
    throw new Error('User ID is required');
  }

  const project= await projectModel.findOne({
    _id: projectId,
    users: userId
  });

  if(!project){
    throw new Error('Project not found or user not authorized');
  }
  const updatedProject = await projectModel.findOneAndUpdate({
    _id: projectId,

  },{
    $addToSet:{
      users: {
        $each: users
      }
    }
  },{
    new: true,
  })

  return updatedProject;
}

export const getProjectById = async({projectId})=>{
  if(!projectId){
    throw new Error('Project ID is required');
  }

  if(!mongoose.Types.ObjectId.isValid(projectId)){
    throw new Error('Invalid Project ID');
  }

  const project= await projectModel.findOne({
    _id: projectId,
  }).populate('users');
  
  return project;
}

/**
 * Adds a user message to a project, calls AI for response,
 * appends AI reply, then saves and returns updated messages.
 * 
 * @param {Object} params
 * @param {string} params.projectId - ID of the project
 * @param {string} params.userMessage - User's chat message
 * @returns {Array} Updated array of all messages in the project
 */
export const addMessageToProject = async ({ projectId, userMessage }) => {
  // Find the project by ID
  const project = await projectModel.findById(projectId);
  if (!project) throw new Error('Project not found');

  if (!project.users.includes(loggedInUser._id)) {
  throw new Error('Not authorized to access this project');
}

  // Add user message to messages array
  project.messages.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date(),
  });

  // Generate AI reply using Gemini API
  const aiReply = await generateGeminiResponse(userMessage);

  // Add AI message to messages array
  project.messages.push({
    role: 'assistant',
    content: aiReply,
    timestamp: new Date(),
  });

  // Save updated project with new messages
  await project.save();

  // Return all messages so frontend can update chat view
  return project.messages;
};

/**
 * Fetches all messages of a project by ID
 * 
 * @param {string} projectId - ID of the project
 * @returns {Array} Array of message objects
 */
export const getMessagesByProjectId = async (projectId) => {
  const project = await projectModel.findById(projectId);
  if (!project) throw new Error('Project not found');

  return project.messages;
};