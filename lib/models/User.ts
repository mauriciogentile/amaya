import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name:        { type: String },
  firstName:   { type: String },
  lastName:    { type: String },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, select: false },
  image:       { type: String },
  // Profile
  age:         Number,
  weightKg:    Number,
  heightCm:    Number,
  goal:        { type: String, enum: ["lose_fat","build_muscle","maintain","performance","general"], default: "general" },
  unitSystem:  { type: String, enum: ["metric","imperial"], default: "metric" },
  theme:       { type: String, enum: ["light","dark"], default: "light" },
  onboarded:   { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);
