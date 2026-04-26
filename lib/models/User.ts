import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  name: string;
  email: string;
  avatar?: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  goal?: "strength" | "hypertrophy" | "endurance" | "weight_loss" | "general";
  units: "metric" | "imperial";
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkId:   { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  email:     { type: String, required: true },
  avatar:    String,
  age:       Number,
  weightKg:  Number,
  heightCm:  Number,
  goal:      { type: String, enum: ["strength","hypertrophy","endurance","weight_loss","general"] },
  units:     { type: String, enum: ["metric","imperial"], default: "metric" },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
