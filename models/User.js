const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 6 },
    phone:     { type: String, default: null },
    address:   { type: String, default: null },
    city:      { type: String, default: null },
    pincode:   { type: String, default: null },
    isAdmin:   { type: Boolean, default: false },
    avatar:    { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id:        this._id,
    firstName: this.firstName,
    lastName:  this.lastName,
    email:     this.email,
    phone:     this.phone,
    address:   this.address,
    city:      this.city,
    pincode:   this.pincode,
    isAdmin:   this.isAdmin,
    avatar:    this.avatar,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);