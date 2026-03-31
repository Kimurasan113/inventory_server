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

// ⭐⭐ အရေးကြီးဆုံး - trust proxy ကို ဖွင့်ပေးရမယ် ⭐⭐
// Render က proxy နောက်ကွယ်မှာရှိတဲ့အတွက် ဒါလေးထည့်ပေးရမယ်
app.set('trust proxy', 1);

// ========== 1. Security Middleware with CSP ==========
// Helmet ကို CSP နဲ့ ပြင်ဆင်သုံးမယ်
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // ပုံမှန် resources တွေအတွက်
        defaultSrc: ["'self'"],
        
        // JavaScript အတွက် (Flutter web က inline script တွေသုံးတယ်)
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",  // Flutter web inline script အတွက် လိုအပ်
          "'unsafe-eval'",    // Flutter web eval အတွက် လိုအပ်
        ],
        
        // CSS အတွက်
        styleSrc: [
          "'self'",
          "'unsafe-inline'",  // Flutter web inline style အတွက် လိုအပ်
        ],
        
        // Images အတွက်
        imgSrc: [
          "'self'",
          "data:",            // base64 images အတွက်
          "https:",           // https images အတွက်
        ],
        
        // Fonts အတွက်
        fontSrc: [
          "'self'",
          "data:",            // base64 fonts အတွက်
        ],
        
        // API calls အတွက် (backend URL)
        connectSrc: [
          "'self'",
          process.env.CLIENT_URL,                    // Frontend URL
          process.env.BACKEND_URL,                   // Backend URL
          "https://inventory-server-i210.onrender.com", // တိုက်ရိုက်ထည့်လည်းရ
          "http://localhost:5006",                   // Local development
          "http://localhost:3000",                   // Local frontend
        ],
        
        // Frame အတွက် (clickjacking ကာကွယ်)
        frameAncestors: ["'none'"],
        
        // Form action အတွက်
        formAction: ["'self'"],
        
        // Base URI အတွက်
        baseUri: ["'self'"],
        
        // Manifest အတွက်
        manifestSrc: ["'self'"],
        
        // Worker အတွက်
        workerSrc: ["'self'", "blob:"],
        
        // Upgrade insecure requests (http → https)
        upgradeInsecureRequests: [],
      },
    },
    // Flutter web အတွက် လိုအပ်တဲ့ settings
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// 2. Auth Routes အတွက်ပဲ Limiter (Login/Register)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // ၅ မိနစ်
  max: 10, // ၁၀ ကြိမ်ပဲ ကြိုးစားခွင့်ရှိ
  skipSuccessfulRequests: true, // အောင်မြင်တဲ့ requests တွေကို မရေတွက်စေနဲ့
  message: { success: false, message: "Too many login attempts, try later" },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 3. CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      process.env.CLIENT_URL,
      "https://inventory-ui-51an.onrender.com",
      "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000"
    ].filter(Boolean);
    
    // Debug အတွက် log ထုတ်ပါ
    console.log(`🔍 Origin: ${origin}`);
    console.log(`📋 Allowed: ${allowedOrigins}`);
    
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed for: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked for: ${origin}`);
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// 4. Body Parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 5. Routes
const authRoutes = require("./src/routes/authRoute");
const stockInRoutes = require("./src/routes/stockInRoute");
const stockOutRoutes = require("./src/routes/stockOutRoute");
const itemRoutes = require("./src/routes/itemRoute");
const inventoryRoutes = require("./src/routes/inventoryRoute");
const damageRoutes = require("./src/routes/damageRequestRoute");

// ⭐ Auth routes မှာပဲ Limiter ထည့်မယ်
app.use("/auth", authLimiter, authRoutes);

// ⭐ တခြား routes တွေက Limiter မပါဘူး
app.use("/inventory", inventoryRoutes);
app.use("/stockin", stockInRoutes);
app.use("/stockout", stockOutRoutes);
app.use("/damage", damageRoutes);
app.use("/items", itemRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Inventory API is running ✅");
});

// 6. 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// 7. Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5006;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔒 CSP enabled with strict security policies`);
});