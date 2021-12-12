import {useState} from 'react'
import './App.css'
import WalletConnect from '@walletconnect/web3-provider'
import { ethers, providers } from 'ethers'
import { SignatureType, SiweMessage, generateNonce } from 'siwe'
//@ts-ignore

declare global {
  interface Window {
      ethereum: { request: (opt: { method: string }) => Promise<Array<string>> }
      web3: unknown
  }
}

const enum Providers {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
}

const getInfuraUrl = (chainId: string) => {
  switch (Number.parseInt(chainId)) {
      case 1:
          return 'wss://mainnet.infura.io/ws/v3'
      case 3:
          return 'wss://ropsten.infura.io/ws/v3'
      case 4:
          return 'wss://rinkeby.infura.io/ws/v3'
      case 5:
          return 'wss://goerli.infura.io/ws/v3'
      case 137:
          return 'wss://polygon-mainnet.infura.io/ws/v3'
  }
}

export default function App() {
  const [ethAddress, setEthAddress] = useState("")
  const [ensString, setEnsString] = useState("")

  const metamask = window.ethereum
  let walletconnect: WalletConnect

  // function infuraTest() {
  //   const options = {
  //     jsonrpc: "2.0",
  //     method: "eth_getBalance",
  //     params: ["0xBf4eD7b27F1d666546E30D74d50d173d20bca754", "latest"],
  //     id: 1
  //   }
  //   fetch("https://mainnet.infura.io/v3/cf20dfc01b0f471192ceb55fdab69316",{
  //     method:"POST",
  //     headers: { 'content-type': 'application/json' },
  //     body: JSON.stringify(options)
  //   }).then(response => {
  //     return response.json()
  //   }).then(data => {
  //     console.log(data)
  //   })
  // }

  async function generateAndSignMessage(provider: ethers.providers.Web3Provider): Promise<SiweMessage> {
    const [address] = await provider.listAccounts()
    if (!address) {
        throw new Error('Address not found.')
    }
    const ens = await provider.lookupAddress(address) || ""
    setEthAddress(address)
    setEnsString(ens)
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
    })
    const signature = await provider.getSigner().signMessage(message.signMessage())
    message.signature = signature
    return message
  }

  async function signIn(connector: Providers) {
    let provider: ethers.providers.Web3Provider
    if (connector === 'metamask') {
        await metamask.request({method: 'eth_requestAccounts'})
        provider = new ethers.providers.Web3Provider(metamask)
        const message = await generateAndSignMessage(provider)
        try {
          await message.validate()
        } catch (error) {
          console.log(error)
        }
    } else {
        walletconnect = new WalletConnect({infuraId: 'cf20dfc01b0f471192ceb55fdab69316'})
        walletconnect.enable()
        provider = new ethers.providers.Web3Provider(walletconnect)
        const message = await generateAndSignMessage(provider)
        const infuraProvider = new providers.JsonRpcProvider(
          {
              allowGzip: true,
              url: `${getInfuraUrl(message.chainId)}/cf20dfc01b0f471192ceb55fdab69316`,
              // headers: {
              //     Accept: '*/*',
              //     Origin: `https://keychat.pages.dev`,
              //     'Accept-Encoding': 'gzip, deflate, br',
              //     'Content-Type': 'application/json',
              // },
          },
          Number.parseInt(message.chainId),
        );
        await infuraProvider.ready
        try {
          await message.validate(infuraProvider)
        } catch (error) {
          console.log(error)
        }
        walletconnect.disconnect()
    }
  };

  return (
      <div>
        <button onClick={() => signIn(Providers.METAMASK)}>Sign in with Metamask</button><br />
        <button onClick={() => signIn(Providers.WALLET_CONNECT)}>Sign in with WalletConnect</button><br />
        <p>address: {ethAddress}</p>
        <p>ens: {ensString}</p>
      </div>
  )
}