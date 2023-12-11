import { HardhatUserConfig } from "hardhat/config";
import { HttpNetworkUserConfig } from "hardhat/types";
import { getSingletonFactoryInfo } from "@safe-global/safe-singleton-factory";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-deploy";
import path from "path";
import { Chain, sepolia } from "@wagmi/chains";

// read MNEMONIC from env variable
let mnemonic = process.env.MNEMONIC;

const networkConfig = (chain: Chain): HttpNetworkUserConfig => {
  let url = process.env.RPC_URL || chain.rpcUrls.public.http.at(0);

  // support for infura and alchemy URLs through env variables
  if (process.env.INFURA_ID && chain.rpcUrls.infura?.http) {
    url = `${chain.rpcUrls.infura.http}/${process.env.INFURA_ID}`;
  } else if (process.env.ALCHEMY_ID && chain.rpcUrls.alchemy?.http) {
    url = `${chain.rpcUrls.alchemy.http}/${process.env.ALCHEMY_ID}`;
  }

  return {
    chainId: chain.id,
    url,
    accounts: mnemonic ? { mnemonic } : undefined,
  };
};

const ppath = (packageName: string, pathname: string) => {
  return path.join(
    path.dirname(require.resolve(`${packageName}/package.json`)),
    pathname
  );
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: mnemonic ? { accounts: { mnemonic } } : {},
    localhost: {
      url: process.env.RPC_URL || "http://localhost:8545",
      accounts: mnemonic ? { mnemonic } : undefined,
    },
    sepolia: networkConfig(sepolia),
  },

  solidity: "0.8.18",

  external: {
    contracts: [
      {
        artifacts: ppath("@cartesi/util", "/export/artifacts"),
        deploy: ppath("@cartesi/util", "/dist/deploy"),
      },
      {
        artifacts: ppath("@cartesi/rollups", "/export/artifacts"),
        deploy: ppath("@cartesi/rollups", "/dist/deploy"),
      },
    ],
    deployments: {
      localhost: ["deployments/localhost"],
      sepolia: [
        ppath("@cartesi/util", "/deployments/sepolia"),
        ppath("@cartesi/rollups", "/deployments/sepolia"),
      ],
    },
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
  },

  deterministicDeployment: (network: string) => {
    // networks will use another deterministic deployment proxy
    // https://github.com/safe-global/safe-singleton-factory
    const chainId = parseInt(network);
    const info = getSingletonFactoryInfo(chainId);
    if (info) {
      return {
        factory: info.address,
        deployer: info.signerAddress,
        funding: (BigInt(info.gasPrice) * BigInt(info.gasLimit)).toString(),
        signedTx: info.transaction,
      };
    } else {
      console.warn(
        `unsupported deterministic deployment for network ${network}`
      );
      return undefined;
    }
  },

  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
