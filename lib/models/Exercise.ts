import mongoose, { Schema, Document } from "mongoose";

export interface IExercise extends Document {
  exId: string;        // original dataset id e.g. "0001"
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string;
  instructionSteps: string[];
  gifUrl: string;
  imageUrl: string;
  isCustom: boolean;
  createdBy?: string;
}

const ExerciseSchema = new Schema<IExercise>({
  exId:             { type: String, index: true },
  name:             { type: String, required: true, index: true },
  bodyPart:         { type: String, default: "" },
  equipment:        { type: String, default: "" },
  target:           { type: String, default: "" },
  secondaryMuscles: [String],
  instructions:     { type: String, default: "" },
  instructionSteps: [String],
  gifUrl:           { type: String, default: "" },
  imageUrl:         { type: String, default: "" },
  isCustom:         { type: Boolean, default: false },
  createdBy:        String,
}, { timestamps: true });

ExerciseSchema.index({ name: "text", bodyPart: 1, target: 1 });

export default mongoose.models.Exercise || mongoose.model<IExercise>("Exercise", ExerciseSchema);
