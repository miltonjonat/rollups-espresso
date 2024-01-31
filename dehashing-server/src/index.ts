import express from 'express';
const app = express();
const port = 5006;

const ESPRESSO_BASE_URL = "https://espresso.tspre.org";
const GRAPHQL_URL = "http://127.0.0.1:8080/graphql";

app.get('/inputbox/:id', async (req, res) => {
  console.log(`Received request for [domain='inputbox', id='${req.params.id}']`)
  try {
    // parse id as Ethereum blockNumber + InputBox index
    const id = req.params.id;
    if (id.length != 130 || !id.startsWith("0x")) {
      throw(`Invalid id '${id}': must be a hex string with 32 bytes for ethBlockNumber and 32 bytes for the inputIndex`);
    }
    // TODO: use BigNumbers
    const ethBlockNumber = parseInt(id.slice(0,66));
    const inputIndex = parseInt("0x" + id.slice(66,130));

    // fetch specified input
    console.log(`Fetching InputBox input '${inputIndex}' at blockNumber '${ethBlockNumber}'`);
    const query = `{ "query": "{ input(index: ${inputIndex}) { blockNumber payload } }" }`;
    const fetched = await fetch(GRAPHQL_URL, {
      "method": "POST",
      "headers": { "Content-Type": "application/json" },
      "body": query
    });
    const json:any = await fetched.json();
    console.log(`Fetched data: '${JSON.stringify(json)}'`);

    // return payload if within requested scope
    const blockNumber = json?.data?.input?.blockNumber;
    const payload = json?.data?.input?.payload;
    if (payload === undefined) {
      res.status(404);
      res.send(`No valid payload found in: ${JSON.stringify(json)}`);
    } else if (blockNumber != ethBlockNumber) {
      res.status(404);
      res.send(`Input outside requested scope: requested blockNumber '${ethBlockNumber}', but found '${blockNumber}'`);
    } else {
      console.log(`Returning payload: '${payload}'`);
      res.send(payload);
    }
    
  } catch (error) {
    res.status(500);
    res.send(JSON.stringify(error));
  }
});

app.get('/espresso/:id', async (req, res) => {
  console.log(`Received request for [domain='espresso', id='${req.params.id}']`)
  try {
    const url = `${ESPRESSO_BASE_URL}/availability/block/hash/${req.params.id}`;
    console.log(`Fetching '${url}'`);
    const fetched = await fetch(url);
    const data:any = await fetched.json();
    console.log(`Fetched data: '${JSON.stringify(data)}'`);

    // TODO: should filter by VM ID instead of picking up the first one
    // - read dapp deployment file path (dapp.json) from env and extract VM ID from dapp address
    const payload = data?.payload?.transaction_nmt[0]?.payload;
    if (payload) {
      let payloadHex = `0x${Buffer.from(payload).toString("hex")}`
      console.log(`Returning payload: '${payloadHex}'`);
      res.send(payloadHex);
    } else {
      res.status(404);
      res.send(`No valid payload found in: ${JSON.stringify(data)}]`);
    }
    
  } catch (error) {
    res.status(500);
    res.send(JSON.stringify(error));
  }
});

app.listen(port, () => {
  // TODO: read 'port' from env
  return console.log(`Express is listening at http://localhost:${port}`);
});
