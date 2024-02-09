import createClient from "openapi-fetch";
import { components, paths } from "./schema";
import { rollupServer } from ".";

type AdvanceRequestData = components["schemas"]["Advance"];
type InspectRequestData = components["schemas"]["Inspect"];
type RequestHandlerResult = components["schemas"]["Finish"]["status"];
type InspectRequestHandler = (data: InspectRequestData) => Promise<void>;
type AdvanceRequestHandler = (
  data: AdvanceRequestData
) => Promise<RequestHandlerResult>;

/**
 * Posts a notice
 * @param payload hex string to post as notice's payload
 */
const postNotice = async (payload: `0x${string}`) => {
  const { POST } = createClient<paths>({ baseUrl: rollupServer });
  const { response } = await POST("/notice", {
    body: { payload }
  });
  const json = await response.json();
  console.log(`Notice emitted with status ${response.status} and body ${JSON.stringify(json)}`);    
}

/**
 * DApp advance handler
 * @param data data to process, including metadata and payload
 * @returns "accept" or "reject"
 */
export const handleAdvance: AdvanceRequestHandler = async (data) => {
  try {
    await postNotice(data.payload);
    return "accept";
  } catch (error) {
    console.log(`Could not process advance request ${JSON.stringify(data)}`);
    console.log(JSON.stringify(error));
    return "reject";
  }
}

/**
 * DApp inspect handler
 * @param data data to process, including metadata and payload
 */
export const handleInspect: InspectRequestHandler = async (data) => {
  console.log("Received inspect request data " + JSON.stringify(data));
};
