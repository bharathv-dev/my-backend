import express from "express";
import cors from "cors";
import crypto from "crypto";
import fetch from "node-fetch";
import { error, log } from "console";
import dotenv from "dotenv";
const app = express();
app.use(cors());
app.use(express.json());


dotenv.config();

const MERCHANT_ID = process.env.MERCHANT_ID || "PGTESTPAYUAT86";
const SALT_KEY = process.env.SALT_KEY || "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = process.env.SALT_INDEX || "1";
const PHONEPE_HOST = process.env.PHONEPE_HOST || "https://api-preprod.phonepe.com/apis/hermes";

console.log("Using PHONEPE_HOST:", PHONEPE_HOST);

// Payment initiation route
app.post("/pay", async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount. Must be a positive number." });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const MUID = "MUID-" + Date.now();
    const transactionId = "TID-" + Date.now();

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: MUID,
      amount: amountInPaise,
      redirectUrl: "http://localhost:3001/status/" + transactionId,
      redirectMode: "POST",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadStr = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadStr).toString("base64");

    const signature = crypto
      .createHash("sha256")
      .update(payloadBase64 + "/pg/v1/pay" + SALT_KEY)
      .digest("hex") + "###" + SALT_INDEX;

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
      return res.status(response.status).json({ error: data.message || "PhonePe API error" });
    }

    const redirectUrl = data?.data?.instrumentResponse?.redirectInfo?.url;
    res.json({ ...data, redirectUrl });
  } catch (err) {
    console.error("Error initiating payment:", err);
    res.status(500).json({ error: err.message });
  }
});

// Payment status route
app.post("/status/:id", (req, res) => {
  const { id } = req.params;
  res.send(`<h2>✅ Payment Processed for Transaction ID: ${id}</h2>`);
});

app.listen(3001, () => console.log("🚀 Server running on http://localhost:3001"));
