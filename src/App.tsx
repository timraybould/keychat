import {useState} from 'react';
import './App.css';
import WalletConnect from '@walletconnect/web3-provider';
import { ethers, providers } from 'ethers';
import { SignatureType, SiweMessage, generateNonce } from 'siwe';

declare global {
  interface Window {
      ethereum: { request: (opt: { method: string }) => Promise<Array<string>> };
      web3: unknown;
  }
}

const enum Providers {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
}

const getInfuraUrl = (chainId: string) => {
  switch (Number.parseInt(chainId)) {
      case 1:
          return 'https://mainnet.infura.io/v3';
      case 3:
          return 'https://ropsten.infura.io/v3';
      case 4:
          return 'https://rinkeby.infura.io/v3';
      case 5:
          return 'https://goerli.infura.io/v3';
      case 137:
          return 'https://polygon-mainnet.infura.io/v3';
  }
};

export default function App() {
  const [ethAddress, setEthAddress] = useState("")
  const [ensString, setEnsString] = useState("")

  const metamask = window.ethereum;
  let walletconnect: WalletConnect;

  async function signIn(connector: Providers) {
    let provider: ethers.providers.Web3Provider;
    if (connector === 'metamask') {
        await metamask.request({
            method: 'eth_requestAccounts',
        });
        provider = new ethers.providers.Web3Provider(metamask);
    } else {
        walletconnect = new WalletConnect({
            infuraId: 'cf20dfc01b0f471192ceb55fdab69316',
        });
        walletconnect.enable();
        provider = new ethers.providers.Web3Provider(walletconnect);
    }
    const [address] = await provider.listAccounts();
    if (!address) {
        throw new Error('Address not found.');
    }
    const ens = await provider.lookupAddress(address) || "";
    setEthAddress(address);
    setEnsString(ens);

    /**
     * Gets a nonce from our backend, this will add this nonce to the session so
     * we can check it on sign in.
     */
    const nonce = generateNonce()

    const message = new SiweMessage({
        domain: document.location.host,
        address,
        chainId: `${await provider.getNetwork().then(({ chainId }) => chainId)}`,
        uri: document.location.origin,
        version: '1',
        statement: 'Some text that you will recognize',
        type: SignatureType.PERSONAL_SIGNATURE,
        nonce,
    });

    const signature = await provider.getSigner().signMessage(message.signMessage());
    message.signature = signature;

    const infuraProvider = new providers.JsonRpcProvider(
      {
          allowGzip: true,
          url: `${getInfuraUrl(message.chainId)}/8fcacee838e04f31b6ec145eb98879c8`,
          headers: {
              Accept: '*/*',
              Origin: `https://keychat.pages.dev`,
              'Accept-Encoding': 'gzip, deflate, br',
              'Content-Type': 'application/json',
          },
      },
      Number.parseInt(message.chainId),
    );

    // Returns a Promise which will stall until the network has heen established, ignoring errors due to the target node not being active yet. This can be used for testing or attaching scripts to wait until the node is up and running smoothly.
    await infuraProvider.ready;
    const validatedMessage: SiweMessage = await message.validate(infuraProvider);
    console.log(validatedMessage)
  };

  return (
      <div>
        <button onClick={() => signIn(Providers.METAMASK)}>Sign in with Metamask</button><br />
        <button onClick={() => signIn(Providers.WALLET_CONNECT)}>Sign in with WalletConnect</button>
        <p>address: {ethAddress}</p>
        <p>ens: {ensString}</p>
      </div>
  )
}