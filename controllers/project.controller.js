import  projectModel from '../models/project.model.js';

import * as projectService from '../services/project.service.js';

import userModel from '../models/user.model.js';

import {validationResult} from 'express-validator';

import { generateGeminiResponse } from '../services/gemini.service.js';

import { generateProjectName } from '../services/gemini.service.js';

import { generateProjectCodeStructure } from '../services/gemini.service.js';
import Project from '../models/project.model.js';

export const createProject= async(req, res)=>{
  const errors = validationResult(req);

  if(!errors.isEmpty()){
    return res.status(400).json({errors: errors.array()});
  }
  try{
    const {name}= req.body;
    const loggedInUser= await userModel.findOne({email: req.user.email});
    const userId= loggedInUser._id;

    const newProject= await projectService.createProject({name, userId});

    res.status(201).json(newProject);
  }catch(err){
    console.error(err);
    res.status(400).json(err.message);
  }
}

export const getAllProjects= async(req, res)=>{
  try{
      const loggedInUser= await userModel.findOne({email: req.user.email});

      const allUserProjects= await projectService.getAllProjectsByUserId({
        userId: loggedInUser._id
        });

    return res.status(200).json({projects: allUserProjects});
  }catch(err){
     console.log(err);
     res.status(400).json(err.message);
  }
}

export const addUserToProject= async(req, res)=>{
  const errors= validationResult(req);
  if(!errors.isEmpty()){
    return res.status(400).json({errors: errors.array()});
  }

  try{
       const {projectId, users}= req.body;
       const loggedInUser= await userModel.findOne({email: req.user.email});

       const project= await projectService.addUserToProject({
         projectId,
         users,
         userId: loggedInUser._id
       });

       res.status(200).json({project});
  }
  catch(err){
    console.log(err);
    res.status(400).json({error: err.message});
  }
}

export const getProjectById= async(req, res)=>{
  const {projectId}= req.params;
  try{
    const project= await projectService.getProjectById({projectId});
    return res.status(200).json({project});
  }catch(err){
    console.log(err);
    res.status(400).json({error: err.message});
  }
}

export const createProjectWithMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required for this endpoint" });
    }
        
    const loggedInUser = await userModel.findOne({ email: req.user.email });
    const userId = loggedInUser._id;


    // Create project name from first 3 words of message
   // Generate project name from AI
    const name = await generateProjectName(message);

    // Optional: fallback to first 3 words if AI returns empty or invalid
    const safeName = name || message.trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase();

    const newProject = await projectModel.create({
      name: safeName,
      users: [userId],
      messages: [{ role: 'user', content: message }],
    });

    const aiResponse = await generateGeminiResponse(message);

    newProject.messages.push({
      role: 'assistant',
      content: aiResponse,
    });

    await newProject.save();

    res.status(201).json(newProject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



/**
 * POST /projects/:projectId/messages
 * Adds a user message, calls AI, saves both messages, returns updated messages
 */
export const addMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message } = req.body;
    const { projectId } = req.params;

    const loggedInUser = await userModel.findOne({ email: req.user.email });

    const project = await projectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Save user message
    project.messages.push({ role: 'user', content: message });

    // Get AI response
    const aiResponse = await generateGeminiResponse(message);

    // Save AI response
    project.messages.push({ role: 'assistant', content: aiResponse });

    await project.save();

    res.status(200).json({
      userMessage: { role: 'user', content: message },
      aiResponse: { role: 'assistant', content: aiResponse },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


/**
 * GET /projects/:projectId/messages
 * Returns all messages for a given project
 */
export const getMessages = async (req, res) => {
  try {
    const { projectId } = req.params;

    const loggedInUser = await userModel.findOne({ email: req.user.email });

    const project = await projectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(200).json({ messages: project.messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// In controllers/project.controller.js
// working 
// export const generateProjectCode = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const { message } = req.body;

//     const project = await projectModel.findById(projectId);
//     if (!project) {
//       return res.status(404).json({ error: 'Project not found' });
//     }

//     const files = await generateProjectCodeStructure(message);

//     // Clean and normalize content for MongoDB schema (expects string)
//     const cleanedFiles = Object.entries(files).map(([name, content]) => {
//       let actualContent = content;

//       // If content is an object with code key, extract it
//       if (typeof content === 'object' && content.code) {
//         actualContent = content.code;
//       }

//       // Ensure it's a string (fallback to empty string)
//       return {
//         name,
//         content: typeof actualContent === 'string' ? actualContent : '',
//       };
//     });

//     // Optional: Filter out empty content files
//     const nonEmptyFiles = cleanedFiles.filter(f => f.content.trim() !== '');

//     project.files = nonEmptyFiles;
//     await project.save();

//     res.status(200).json({ files: project.files });
//   } catch (err) {
//     console.error('Error generating project code:', err);
//     res.status(500).json({ error: 'Failed to generate code' });
//   }
// };

//working with history

// export const generateProjectCode = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const { message } = req.body;

//     const project = await projectModel.findById(projectId);
//     if (!project) {
//       return res.status(404).json({ error: 'Project not found' });
//     }

//     // Convert stored messages into Gemini-compatible history format
//     const history = project.messages.map(msg => ({
//   role: msg.role === 'assistant' ? 'model' : msg.role,
//   parts: [{ text: msg.content }],
// }));

// // Add the new user message
// history.push({
//   role: 'user',
//   parts: [{ text: message }],
// });


//     const files = await generateProjectCodeStructure(message, history);

//     const cleanedFiles = Object.entries(files).map(([name, content]) => {
//       let actualContent = content;
//       if (typeof content === 'object' && content.code) {
//         actualContent = content.code;
//       }
//       return {
//         name,
//         content: typeof actualContent === 'string' ? actualContent : '',
//       };
//     });

//     const nonEmptyFiles = cleanedFiles.filter(f => f.content.trim() !== '');

//     project.files = nonEmptyFiles;
//     await project.save();

//     res.status(200).json({ files: project.files });
//   } catch (err) {
//     console.error('Error generating project code:', err);
//     res.status(500).json({ error: 'Failed to generate code' });
//   }
// };

export const generateProjectCode = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    // Initial fetch to validate existence
    const project = await projectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Convert messages to Gemini-compatible format
    const history = project.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    // Add new user message to history
    history.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Generate new code files
    const files = await generateProjectCodeStructure(message, history);

    // Clean and validate the generated files
    const cleanedFiles = Object.entries(files).map(([name, content]) => {
      let actualContent = content;
      if (typeof content === 'object' && content.code) {
        actualContent = content.code;
      }
      return {
        name,
        content: typeof actualContent === 'string' ? actualContent : '',
      };
    });

    const nonEmptyFiles = cleanedFiles.filter(f => f.content.trim() !== '');

    // 🔒 SAFE: Re-fetch latest to avoid version duplication
    const freshProject = await projectModel.findById(projectId);
    const newVersion = freshProject.fileVersions.length;

    // Save new version
    freshProject.fileVersions.push({
      version: newVersion,
      files: nonEmptyFiles,
      timestamp: new Date(),
    });

    await freshProject.save();

    res.status(200).json({
      version: newVersion,
      files: nonEmptyFiles,
    });

  } catch (err) {
    console.error('Error generating project code:', err);
    res.status(500).json({ error: 'Failed to generate code' });
  }
};
