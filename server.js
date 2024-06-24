require("dotenv").config();
const WebSocket = require("ws");
const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT;

// Initialize a WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", function connection(ws) {
  ws.on("message", async function incoming(message) {
    console.log("Received: %s", message);

    try {
      // Fetch master trade details from the lambda function
      const masterTradeResponse = await axios.get(
        "https://pdzsl5xw2kwfmvauo5g77wok3q0yffpl.lambda-url.us-east-2.on.aws/"
      );
      const masterTrade = masterTradeResponse.data;
      console.log("Master Trade Details:", masterTrade);

      // Login to MT4 and get connection ID
      const loginResponse = await axios
        .get("https://mt4.mtapi.io/Connect", {
          params: {
            user: "44712225",
            password: "tfkp48",
            host: "18.209.126.198",
            port: "443",
          },
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          return error.response;
        });

      if (!loginResponse.data) {
        throw new Error("Failed to obtain connection ID from MT4 API");
      }

      const connectionId = loginResponse.data;
      console.log("Connection ID:", connectionId);

      // Replicate trade on the slave account
      const replicateResponse = await axios.get(
        "https://mt4.mtapi.io/OrderSend",
        {
          params: {
            id: connectionId, // Use connection ID obtained from the login response
            symbol: masterTrade.symbol,
            operation: masterTrade.operation,
            volume: masterTrade.volume,
            takeprofit: masterTrade.takeprofit,
            comment: masterTrade.comment,
          },
        }
      );

      // Construct the response object
      const responseObject = {
        id: connectionId, // Append the connection ID to the response
        symbol: masterTrade.symbol,
        operation: masterTrade.operation,
        volume: masterTrade.volume,
        takeprofit: masterTrade.takeprofit,
        comment: masterTrade.comment,
      };

      // Send the enriched trade details back to the frontend
      ws.send(JSON.stringify(responseObject));
    } catch (error) {
      console.error("Error during trade operation:", error.message);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Handle HTTP Upgrade Requests for WebSocket
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
