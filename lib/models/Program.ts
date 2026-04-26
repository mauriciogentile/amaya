import mongoose, { Schema } from "mongoose";

const ProgramDaySchema = new Schema({
  name:        { type: String, required: true },
  description: String,
  order:       { type: Number, default: 0 },
  exerciseIds: [{ type: Schema.Types.ObjectId, ref: "Exercise" }],
}, { _id: true });

const ProgramSchema = new Schema({
  userId:      { type: String, required: true },
  name:        { type: String, required: true },
  description: String,
  category:    String,
  location:    { type: String, enum: ["gym", "home", "outdoor"], default: "gym" },
  days:        [ProgramDaySchema],
  isPublic:    { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Program || mongoose.model("Program", ProgramSchema);
