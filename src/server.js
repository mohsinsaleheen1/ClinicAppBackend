require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

if (!process.env.JWT_SECRET) {
  console.error(
    "JWT_SECRET is not set. Copy .env.example to .env and fill it in.",
  );
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.use(async (req, res, next) => {
  try {
    await connectDB().then(() => {
      app.listen(PORT, () =>
        console.log(
          `Server running on port ${PORT} (${process.env.NODE_ENV || "development"})`,
        ),
      );
    });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});
