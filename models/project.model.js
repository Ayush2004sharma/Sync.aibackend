import mongoose from 'mongoose';

const messageSchema= new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
})

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true  // Trim to avoid whitespace issues
  }
});

const fileVersionSchema = new mongoose.Schema({
  version: Number,
  files: [fileSchema],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const userMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const projectSchema = new mongoose.Schema({
  name:{
    type: String,
    lowercase: true,
    required: true,
    trim: true,
    unique: [true, 'Project name already exists'],
  },

  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    }
  ],
  messages: [messageSchema],
  // files: [fileSchema],
  fileVersions: [fileVersionSchema],
  userMessages: [userMessageSchema],
});



const Project = mongoose.model('project', projectSchema);

export default Project;