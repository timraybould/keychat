import {useState} from 'react'
import './App.css'
import WalletConnect from '@walletconnect/web3-provider'
import { ethers } from 'ethers'
import { SignatureType, SiweMessage, generateNonce } from 'siwe'
import {ReactComponent as EthereumLogo} from './images/ethereum_logo.svg';

declare global {
  interface Window {
      ethereum: { request: (opt: { method: string }) => Promise<Array<string>> }
      web3: unknown
  }
}

const enum Connectors {
  WINDOW = 'window',
  WALLET_CONNECT = 'walletconnect',
}

// const replayAttack = new SiweMessage({
//   domain: "localhost:3000",
//   address: "0x85245E81C59aA83c43992B0162bC5B9f5c636F25",
//   chainId: "1",
//   uri: "http://localhost:3000",
//   version: "1",
//   statement: "Some text that you will recognize",
//   nonce: "O3NpjFMmZiyG1UnVK",
//   issuedAt: "2021-12-19T00:31:41.322Z",
//   signature: "0x7748200a3dd0cac1bccdd2838abf8fadaca5fb5dac59e93842bf72aae2236e9b12bb2f0393c4a7b47c00d42e5a427a604bad052eb549fa172734e35e169d66fc1c"
// })

export default function App() {
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [ethAddress, setEthAddress] = useState("")
  const [ensString, setEnsString] = useState("")

  // async function Replay () {
  //   const validation = await replayAttack.validate()
  //   console.log(validation)
  //   setEthAddress(replayAttack.address)
  // }

  async function generateSignValidateMessage(provider: ethers.providers.Web3Provider) {
    try {
      const [address] = await provider.listAccounts()
      if (!address) {
          throw new Error('Address not found.')
      }
      const ens = await provider.lookupAddress(address) || ""
      const nonce = generateNonce()
      const expiration = new Date(Date.now() + 5*60000)
      const notBefore = new Date()
      const message = new SiweMessage({
          domain: document.location.host,
          address,
          chainId: `${await provider.getNetwork().then(({ chainId }) => chainId)}`,
          uri: document.location.origin,
          version: '1',
          statement: 'Some text that you will recognize',
          type: SignatureType.PERSONAL_SIGNATURE,
          expirationTime: expiration.toISOString(),
          notBefore: notBefore.toISOString(),
          nonce,
      })
      const signature = await provider.getSigner().signMessage(message.signMessage())
      message.signature = signature
      console.log('signed', message)
      // need to pass a JsonRpcProvider to validate if https://eips.ethereum.org/EIPS/eip-1271 is needed
      const validation = await message.validate()
      console.log('validation', validation)
      setEthAddress(address)
      setEnsString(ens)
    } catch (error) {
      console.log(error)
    }
  }

  async function signIn(connector: Connectors) {
    setAwaitingVerification(true)
    if (connector === 'window') {
        await window.ethereum.request({method: 'eth_requestAccounts'})
        await generateSignValidateMessage(new ethers.providers.Web3Provider(window.ethereum))
        setAwaitingVerification(false)
    } else {
      try {
        const walletconnect = new WalletConnect({infuraId: 'cf20dfc01b0f471192ceb55fdab69316'})
        walletconnect.enable()
        await generateSignValidateMessage(new ethers.providers.Web3Provider(walletconnect))
        setAwaitingVerification(false)
        walletconnect.disconnect()
      } catch (error) {
        console.log(error)
        setAwaitingVerification(false)
      }
    }
  };

  return (
      <div>
        <h1>Keychat</h1>
        {awaitingVerification
          ?
            <h2>Awaiting verification...</h2>
          :
            ethAddress === ""
              ? 
                window.ethereum
                  ?
                    <div>
                      <h2>Give any Ethereum address a voice</h2>
                      <button className='button' onClick={() => signIn(Connectors.WINDOW)}>
                        <EthereumLogo />
                        <span>Sign in with Ethereum</span>
                      </button>
                      <button className='linkButton' onClick={() => signIn(Connectors.WALLET_CONNECT)}>Use a wallet outside of the browser?</button>
                    </div>
                  :
                    <div>
                      <h2>Give any Ethereum address a voice</h2>
                      <button className='button' onClick={() => signIn(Connectors.WALLET_CONNECT)}>
                        <EthereumLogo />
                        <span>Sign in with Ethereum</span>
                      </button>
                    </div>
              :   
                <div>
                  <h2>You control the following keychat IDs</h2>
                  <div className="keychatIdResults">
                    <span>@{ethAddress}:keychat.xyz</span>
                    <button className='linkButton'>Set or reset the password</button>
                  </div>
                  {ensString !== "" &&
                    <div className="keychatIdResults">
                      <span>@{ensString}:keychat.xyz</span>
                      <button className='linkButton'>Set or reset the password</button>
                    </div>
                  }
                </div>
        }
      </div>
  )
}