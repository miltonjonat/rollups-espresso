import express from 'express';
import fetchInputBox from './inputbox';
import fetchEspresso from './espresso';
const app = express();
const port = 5006;

app.get('/:domain/:id', async (req, res) => {
  console.log(`Received request for [domain='${req.params.domain}', id='${req.params.id}']`)
  try {
    let fetchFunc: (id: string) => Promise<[number, string]>;
    switch (req.params.domain) {
      case "inputbox":
        fetchFunc = fetchInputBox;
        break;
      case "espresso":
        fetchFunc = fetchEspresso;
        break;
      default:
        throw(`Unsupported domain '${req.params.domain}`);
    }
    const [status, data] = await fetchFunc(req.params.id);
    res.status(status);
    res.send(data);
  } catch (error) {
    res.status(500);
    res.send(JSON.stringify(error));
  }
});

app.get('/espresso/:id', async (req, res) => {
  console.log(`Received request for [domain='espresso', id='${req.params.id}']`)
  try {
    const [status, data] = await fetchEspresso(req.params.id);
    res.status(status);
    res.send(data);
  } catch (error) {
    res.status(500);
    res.send(JSON.stringify(error));
  }
});

app.listen(port, () => {
  // TODO: read 'port' from env
  return console.log(`Express is listening at http://localhost:${port}`);
});
