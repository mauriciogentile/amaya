import mongoose, { Schema } from "mongoose";

const DayExerciseSchema = new Schema({
  exerciseId:  { type: Schema.Types.ObjectId, ref: "Exercise" },
  name:        { type: String, required: true },
  muscleGroup: String,
  sets:        { type: Number, default: 3 },
  minReps:     { type: Number, default: 8 },
  maxReps:     { type: Number, default: 12 },
  restSeconds: { type: Number, default: 90 },
  note:        String,
  order:       { type: Number, default: 0 },
}, { _id: true });

const ProgramDaySchema = new Schema({
  name:        { type: String, required: true },
  description: String,
  order:       { type: Number, default: 0 },
  exercises:   [DayExerciseSchema],
  notes:       String,
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
