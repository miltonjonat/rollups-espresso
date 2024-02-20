import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { hexToString, numberToHex } from "viem";
import { fetchContext } from '../src/context';
import { fetchEspresso } from '../src/espresso'
import * as espressoPublic from '../src/espresso'

const espresso:any = espressoPublic;

if (process.env.TEST_LIVE) {
    describe("espresso live network", () => {
        test('fetchLatestEspressoBlockHeight', async () => {
            const result = await espresso.fetchLatestEspressoBlockHeight();
            expect(result).toBeTypeOf("bigint");
            expect(result).toBeGreaterThan(0);
        })    
    
        test('fetchEspressoHeader', async () => {
            const blockHeight = 10;
            const result = await espresso.fetchEspressoHeader(blockHeight);
            expect(result).toBeTypeOf("object");
            expect(result.height).toStrictEqual(blockHeight);
        })    
    
        test('fetchEspressoBlock', async () => {
            const blockHeight = 10;
            const result = await espresso.fetchEspressoBlock(blockHeight);
            expect(result).toBeTypeOf("object");
            expect(result.header.height).toStrictEqual(blockHeight);
        })    
    });
}

describe("fetchEspresso", () => {
    const context = {
        blockNumber: 100n,
        epoch: 1n,
        currentInput: 40n,
        currentInputBlockNumber: 90n,
        currentEpoch: 1n,
        espressoBlockHeight: 10000n,
        latestEspressoBlockHeight: 10000n
    }

    beforeEach(() => {
        vi.mock('../src/context', async (importOriginal) => {
            const mod = await importOriginal<typeof import('../src/context')>()
            return {
              ...mod,
              // replace some exports
              fetchContext: vi.fn(),
            }
        })
        vi.stubGlobal("fetch", vi.fn());
        vi.mocked(fetchContext).mockReturnValue(Promise.resolve(context));
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals();
    });

    const buildId = (context:any): `0x${string}` => {
        return numberToHex(context.blockNumber, { size: 32 }) + numberToHex(context.espressoBlockHeight, { size: 32 }).slice(2) as `0x${string}`;
    }

    const mockFetch = (context: any, headerData: any, blockData: any) => {
        const latestUrl = `${espresso.ESPRESSO_BASE_URL}/status/latest_block_height`;
        const headerUrl = `${espresso.ESPRESSO_BASE_URL}/availability/header/${context.latestEspressoBlockHeight}`;
        const blockUrl = `${espresso.ESPRESSO_BASE_URL}/availability/block/${context.espressoBlockHeight}`;
        vi.mocked(fetch).mockImplementation((arg) => {
            if (arg === latestUrl) {
                return Promise.resolve({
                    status: 200,
                    text: () => Promise.resolve(context.latestEspressoBlockHeight.toString())
                } as Response)
            } else if (arg === headerUrl) {
                return Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve(headerData)
                } as Response)
            } else if (arg === blockUrl) {
                return Promise.resolve({
                    status: 200,
                    json: () => Promise.resolve(blockData)
                } as Response)
            } else {
                return Promise.resolve({status: 500} as Response)
            }
        });
    }

    const assertResultWithData = (result: [number, string | undefined], data: any) => {
        expect(result[0]).toStrictEqual(200);
        expect(result[1]).toBeTypeOf("string");
        expect(result[1]?.startsWith("0x")).toBeTruthy();
        const resultJson = JSON.parse(hexToString(result[1] as `0x${string}`));
        expect(JSON.stringify(resultJson)).toStrictEqual(JSON.stringify(data));
    }

    test('invalid id', async () => {
        const result = await fetchEspresso("nothing");
        expect(result).toStrictEqual([404, undefined]);
    })    

    test('beyond epoch', async () => {
        // set context to have an epoch ahead of the current epoch
        vi.mocked(fetchContext).mockReturnValue(Promise.resolve({
            ...context,
            epoch: 2n,
            currentEpoch: 1n
        }));
        const id = buildId(context);
        const result = await fetchEspresso(id);
        expect(result).toStrictEqual([403, undefined]);
    })    

    test('espresso block not available at requested L1 blockNumber', async () => {
        // set context to have an espressoBlockHeight ahead of latest
        vi.mocked(fetchContext).mockReturnValue(Promise.resolve({
            ...context,
            espressoBlockHeight: 50000n,
            latestEspressoBlockHeight: 10000n
        }));
        const id = buildId(context);
        // set header to refer to a block number in the future
        const headerData = {
            l1_finalized: {
                number: Number(context.blockNumber + 1n)
            }
        }
        mockFetch(context, headerData, {});
        const result = await fetchEspresso(id);
        expect(result).toStrictEqual([404, undefined]);
    })    

    test('espresso block with undefined L1 blockNumber', async () => {
        const id = buildId(context);
        mockFetch(context, {}, {});
        const result = await fetchEspresso(id);
        expect(result).toStrictEqual([404, undefined]);
    })    

    test('espresso block beyond requested L1 blockNumber', async () => {
        const id = buildId(context);
        const blockData = {
            header: {
                l1_finalized: {
                    number: Number(context.blockNumber + 1n)
                }
            }
        }
        mockFetch(context, {}, blockData);
        const result = await fetchEspresso(id);
        expect(result).toStrictEqual([404, undefined]);
    })    

    test('espresso block with no data', async () => {
        const id = buildId(context);
        const blockData = {
            header: {
                l1_finalized: {
                    number: Number(context.blockNumber)
                }
            },
            payload: {
            }
        }
        mockFetch(context, {}, blockData);
        const result = await fetchEspresso(id);
        assertResultWithData(result, blockData);
    })    

    test('espresso block with no data after filtering', async () => {
        const id = buildId(context);
        const blockData = {
            header: {
                l1_finalized: {
                    number: Number(context.blockNumber)
                }
            },
            payload: {
                transaction_nmt: [{
                    vm: 100,
                    payload: [10,20,30]
                }]
            }
        }
        mockFetch(context, {}, blockData);
        const result = await fetchEspresso(id);
        const expectedData = { ...blockData, payload: { transaction_nmt: []}};
        assertResultWithData(result, expectedData);
    })    

    test('espresso block with data', async () => {
        const id = buildId(context);
        const blockData = {
            header: {
                l1_finalized: {
                    number: Number(context.blockNumber)
                }
            },
            payload: {
                transaction_nmt: [{
                    vm: espresso.VM_ID,
                    payload: [10,20,30]
                }]
            }
        }
        mockFetch(context, {}, blockData);
        const result = await fetchEspresso(id);
        assertResultWithData(result, blockData);
    })    

    test('espresso block with filtered data', async () => {
        const id = buildId(context);
        const blockData = {
            header: {
                l1_finalized: {
                    number: Number(context.blockNumber)
                }
            },
            payload: {
                transaction_nmt: [{
                    vm: espresso.VM_ID,
                    payload: [10,20,30]
                },{
                    vm: 100,
                    payload: [1000,2000,3000]
                }]
            }
        }
        mockFetch(context, {}, blockData);
        const result = await fetchEspresso(id);

        const expectedData = { ...blockData, payload: {
            transaction_nmt: [blockData.payload.transaction_nmt[0]]
        }};
        assertResultWithData(result, expectedData);
    })    
});

