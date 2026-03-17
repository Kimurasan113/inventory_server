const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./src/middleWare/errorHandler");

dotenv.config();
connectDB();

const app = express();

// 1. Security Middleware (အစောဆုံး)
app.use(helmet());

// 2. Rate Limiting (တစ် IP ကို request အရေအတွက် ကန့်သတ်)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ၁၅ မိနစ်
  max: 100, // တစ် IP က ၁၀၀ ခု
  message: { success: false, message: "Too many requests from this IP" },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Auth routes အတွက် တိတိကျကျ limit (login, register)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // ၅ မိနစ်
  max: 10, // ၁၀ ကြိမ်ပဲ ကြိုးစားခွင့်ရှိ
  skipSuccessfulRequests: true, // အောင်မြင်တဲ့ requests တွေကို မရေတွက်စေနဲ့
  message: { success: false, message: "Too many attempts, try later" },
});

// 4. CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Mobile app (origin မပါ) ဆိုရင် ခွင့်ပြု
    if (!origin) return callback(null, true);
    
    // Web app အတွက် ခွင့်ပြုထားတဲ့ origins
    const allowedOrigins = [
      process.env.CLIENT_URL,      // production web URL
      "http://localhost:3000",     // local development web
      "http://localhost:5000",      // တခြား local port
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000"
    ].filter(Boolean);             // undefined တွေကို ဖယ်
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true, 
};

app.use(cors(corsOptions));

// 5. Body Parser (size ကန့်သတ်)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 6. Routes
const authRoutes = require("./src/routes/authRoute");
const stockInRoutes = require("./src/routes/stockInRoute");
const stockOutRoutes = require("./src/routes/stockOutRoute");
const itemRoutes = require("./src/routes/itemRoute");
const inventoryRoutes = require("./src/routes/inventoryRoute");
const damageRoutes = require("./src/routes/damageRequestRoute");

// Routes အားလုံးကို limiter နဲ့သုံးပါ (auth routes ကလွဲရင်)
app.use("/auth", authLimiter, authRoutes);  // auth routes အတွက် တင်းကျပ်တဲ့ limit
app.use("/inventory", limiter, inventoryRoutes);
app.use("/stockin", limiter, stockInRoutes);
app.use("/stockout", limiter, stockOutRoutes);
app.use("/damage", limiter, damageRoutes);
app.use("/items", limiter, itemRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Inventory API is running ✅");
});

app.get("/auth", (req, res) => {
  res.send("✅ AUTH API is running");
});

// 7. 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// 8. Error Handler (နောက်ဆုံး)
app.use(errorHandler);

const PORT = process.env.PORT || 5006;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});