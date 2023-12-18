import express from 'express';
const app = express();
const port = 5006;

const ESPRESSO_BASE_URL = "https://espresso.tspre.org";

app.get('/espresso/:id', async (req, res) => {
  console.log(`Received request for [namespace='espresso', id='${req.params.id}']`)
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
