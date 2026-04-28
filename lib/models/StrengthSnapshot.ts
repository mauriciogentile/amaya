import mongoose, { Schema } from "mongoose";

const MuscleScoreSchema = new Schema({
  muscle: String,
  score: Number,
  bestExercise: String,
  estimated1RM: Number,
}, { _id: false });

const StrengthSnapshotSchema = new Schema({
  userId:       { type: String, required: true, index: true },
  weekStart:    { type: Date, required: true },
  overallScore: Number,
  muscles:      [MuscleScoreSchema],
}, { timestamps: true });

StrengthSnapshotSchema.index({ userId: 1, weekStart: -1 });

export default mongoose.models.StrengthSnapshot
  || mongoose.model("StrengthSnapshot", StrengthSnapshotSchema);
