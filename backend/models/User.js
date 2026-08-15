const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
     googleId: {
      type: String,
      default: null,
    },

    facebookId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    }
);

// Social-auth users do not have a phone number. A partial unique index keeps
// phone numbers unique without treating every missing value as the same `null`.
userSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { phoneNumber: { $type: 'string' } },
  }
);

module.exports = mongoose.model('User', userSchema);
