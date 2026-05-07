import mongoose, { Schema, Document } from "mongoose";

const SetSchema = new Schema({
  setNumber: Number,
  reps:      Number,
  weightKg:  Number,
  rpe:       Number,
  rir:       Number,
  type:      { type: String, enum: ["normal","warmup","dropset","failure"], default: "normal" },
  note:      String,
  completedAt: Date,
}, { _id: false });

const WorkoutExerciseSchema = new Schema({
  exerciseId:   { type: Schema.Types.ObjectId, ref: "Exercise" },
  exerciseName: String,
  sets:         [SetSchema],
  restSeconds:  { type: Number, default: 90 },
  note:         String,
  order:        Number,
  supersetGroup: Number,
}, { _id: false });

const WorkoutSchema = new Schema({
  userId:      { type: String, required: true },
  name:        { type: String, default: "Workout" },
  templateId: Schema.Types.ObjectId,
  exercises:   [WorkoutExerciseSchema],
  startedAt:   { type: Date, default: Date.now },
  finishedAt:  Date,
  durationMin: Number,
  note:        String,
  isComplete:  { type: Boolean, default: false },
  restTimerEndsAt: Date,
}, { timestamps: true });

export default mongoose.models.Workout || mongoose.model("Workout", WorkoutSchema);
