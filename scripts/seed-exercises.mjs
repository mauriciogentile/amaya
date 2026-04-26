import { readFileSync } from "fs";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("MONGODB_URI not set"); process.exit(1); }

const BASE_GIF = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/";
const BASE_IMG = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/";

const ExerciseSchema = new mongoose.Schema({
  exId: { type: String, index: true },
  name: { type: String, required: true },
  bodyPart: String,
  equipment: String,
  target: String,
  secondaryMuscles: [String],
  instructions: String,
  instructionSteps: [String],
  gifUrl: String,
  imageUrl: String,
  isCustom: { type: Boolean, default: false },
}, { timestamps: true });
ExerciseSchema.index({ name: "text", bodyPart: 1, target: 1 });

const Exercise = mongoose.models.Exercise || mongoose.model("Exercise", ExerciseSchema);

await mongoose.connect(MONGO_URI);
console.log("Connected to MongoDB");

const raw = JSON.parse(readFileSync("/tmp/exercises-dataset/data/exercises.json", "utf8"));
console.log(`Loaded ${raw.length} exercises from JSON`);

// Check existing count
const existing = await Exercise.countDocuments({ isCustom: false });
if (existing > 100) {
  console.log(`Already have ${existing} exercises. Skipping seed.`);
  await mongoose.disconnect();
  process.exit(0);
}

await Exercise.deleteMany({ isCustom: false });

const docs = raw.map(e => ({
  exId: e.id,
  name: e.name.charAt(0).toUpperCase() + e.name.slice(1),
  bodyPart: e.body_part || e.category || "",
  equipment: e.equipment || "",
  target: e.target || "",
  secondaryMuscles: e.secondary_muscles || [],
  instructions: (e.instructions?.en) || "",
  instructionSteps: (e.instruction_steps?.en) || [],
  gifUrl: e.gif_url ? BASE_GIF + e.gif_url.replace("videos/", "") : "",
  imageUrl: e.image ? BASE_IMG + e.image.replace("images/", "") : "",
  isCustom: false,
}));

const result = await Exercise.insertMany(docs, { ordered: false });
console.log(`Inserted ${result.length} exercises`);
await mongoose.disconnect();
console.log("Done!");
