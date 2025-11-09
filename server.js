import express from "express";
import cors from "cors";
import crypto from "crypto";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// ✅ CORS setup (allow all origins for now)
app.use(
  cors({
    origin: "*", // allow all origins (you can later restrict to your frontend domain)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ✅ Environment variables (with defaults for testing)
const MERCHANT_ID = process.env.MERCHANT_ID ;
const SALT_KEY = process.env.SALT_KEY ;
const SALT_INDEX = process.env.SALT_INDEX ;
const PHONEPE_HOST =
  process.env.PHONEPE_HOST;

// 🔍 To confirm where it’s hitting
console.log("Using PHONEPE_HOST:", PHONEPE_HOST);

// ✅ Root route (so browser shows something if you visit backend URL)
app.get("/", (req, res) => {
  res.send("✅ PhonePe backend is running successfully on Render!");
});

// 💰 Payment initiation route
app.post("/pay", async (req, res) => {
  try {
    const { amount, name } = req.body;

    // ✅ Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res
        .status(400)
        .json({ error: "Invalid amount. Must be a positive number." });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    const MUID = "MUID-" + Date.now();
    const transactionId = "TID-" + Date.now();

    // ✅ Payment payload
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: MUID,
      amount: amountInPaise,
      redirectUrl: `https://my-backend-o7yd.onrender.com/status/${transactionId}`,
      redirectMode: "POST",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadStr = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadStr).toString("base64");

    // ✅ Signature
    const signature =
      crypto
        .createHash("sha256")
        .update(payloadBase64 + "/pg/v1/pay" + SALT_KEY)
        .digest("hex") +
      "###" +
      SALT_INDEX;

    // ✅ Send request to PhonePe
    const response = await fetch(`${PHONEPE_HOST}/pg/v1/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": signature,
        accept: "application/json",
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const data = await response.json();
    console.log("PhonePe Response:", data);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.message || "PhonePe API error" });
    }

    const redirectUrl = data?.data?.instrumentResponse?.redirectInfo?.url;
    res.json({ success: true, redirectUrl });
  } catch (err) {
    console.error("Error initiating payment:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🧾 Payment status route
app.post("/status/:id", (req, res) => {
  const { id } = req.params;
  res.send(`<h2>✅ Payment Processed for Transaction ID: ${id}</h2>`);
});

// 🚀 Port setup for both local & Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} (Render-ready)`)
);
