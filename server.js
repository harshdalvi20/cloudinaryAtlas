// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import the cors middleware
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const axios = require('axios');

const app = express();

// Enable CORS for all requests
app.use(cors());

// MongoDB Atlas connection
mongoose.connect('mongodb+srv://cataract:Cataract123@cluster0.4eagq2b.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB Atlas'));

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'dn38byosw',
  api_key: '891473364547868',
  api_secret: 'kTjKYCynZk-zd-FISGD76OXvjIY'
});

// Multer storage configuration for multiple files
const storage = multer.diskStorage({});

// Multer upload instance with multiple files support
const upload = multer({ storage, limits: { files: 2 } }); // Limiting to 2 files

// MongoDB Schema with an array of image URLs
const userSchema = new mongoose.Schema({
  name: String,
  pid: Number,
  imageUrls: [String] // Array to store multiple image URLs
});
const User = mongoose.model('User', userSchema);

// Routes
app.post('/upload', upload.array('images', 2), async (req, res) => { // Use upload.array to handle multiple files
  try {
    // Check if a user with the same PID already exists
    const existingUser = await User.findOne({ pid: req.body.pid });
    if (existingUser) {
      return res.status(400).json({ message: 'User with the same PID already exists' });
    }

    // Specify the folder where you want to upload the images
    const folder = 'cataract';

    const uploadedImages = [];

    // Upload images to Cloudinary with specified folder
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, { folder });
      uploadedImages.push(result.secure_url);
    }

    // Create user in MongoDB
    const user = new User({
      name: req.body.name,
      pid: req.body.pid,
      imageUrls: uploadedImages // Storing multiple image URLs in the array
    });
    await user.save();

    res.status(201).json({ message: 'Upload successful', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Route handler to serve images by user ID
app.get('/images/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Respond with the array of image URLs
    res.json({ imageUrls: user.imageUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route handler to find image by PID
app.get('/images', async (req, res) => {
  const pid = req.query.pid;

  try {
    const user = await User.findOne({ pid });

    if (user) {
      res.json({ imageUrls: user.imageUrls });
    } else {
      res.status(404).json({ message: 'No images found for the provided PID.' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
