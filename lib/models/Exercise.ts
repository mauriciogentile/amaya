import mongoose, { Schema, Document } from "mongoose";

export interface IExercise extends Document {
  name: string;
  muscleGroups: string[];
  equipment: string;
  movementType: string;
  instructions?: string;
  gifUrl?: string;
  isCustom: boolean;
  createdBy?: string; // clerkId
}

const ExerciseSchema = new Schema<IExercise>({
  name:         { type: String, required: true },
  muscleGroups: [String],
  equipment:    { type: String, default: "barbell" },
  movementType: { type: String, default: "compound" },
  instructions: String,
  gifUrl:       String,
  isCustom:     { type: Boolean, default: false },
  createdBy:    String,
}, { timestamps: true });

export default mongoose.models.Exercise || mongoose.model<IExercise>("Exercise", ExerciseSchema);
