const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URL || 'mongodb://admin:password123@mongodb-service:27017/mydb?authSource=admin';

const db = mongoose.connection;
db.on('connected', () => console.log(`MongoDB CONNECTED → ${MONGO_URI}`));
db.on('disconnected', () => console.warn(`MongoDB DISCONNECTED → reconnecting...`));
db.on('error', err => console.error(`MongoDB ERROR →`, err.message));

// AUTO-RETRY CONNECTION
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      heartbeatFrequencyMS: 10000,
    });
  } catch (err) {
    console.error(`MongoDB connection failed → retrying in 5s...`, err.message);
    setTimeout(connectToMongoDB, 5000);
  }
};

// Schema & Model
const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  body: { type: String, required: true },
}, { timestamps: true });
const Message = mongoose.model('Message', messageSchema);

const getMessages = async () => Message.find().sort({ createdAt: -1 });
const setMessage = async (name, body) => {
  const msg = new Message({ name, body });
  await msg.save();
  return msg;
};
const isConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectToMongoDB, getMessages, setMessage, isConnected };