import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    airtableUserId: {
      type: String,
      required: true,
      unique: true,
    },
    profile: {
      type: Object,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    tokenExpiresAt: {
      type: Date,
    },
    loginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
