import WalletConnect from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
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

//eslint-disable-next-line
const metamask = window.ethereum;
let walletconnect: WalletConnect;

const signIn = async (connector: Providers) => {
    let provider: ethers.providers.Web3Provider;

    /**
     * Connects to the wallet and starts a etherjs provider.
     */
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

    /** 
     * Try to resolve address ENS and updates the title accordingly.
     */
    let ens: string | null = null;
    try {
        ens = await provider.lookupAddress(address);
    } catch (error) {
        console.error(error);
    }

    /**
     * TODO: do on backend
     */
    const nonce = generateNonce()

    /**
     * Creates the message object
     */
    const message = new SiweMessage({
        domain: document.location.host,
        address,
        chainId: `${await provider.getNetwork().then(({ chainId }) => chainId)}`,
        uri: document.location.origin,
        version: '1',
        statement: 'Keychat test',
        type: SignatureType.PERSONAL_SIGNATURE,
        nonce,
    });

    /**
     * Generates the message to be signed and uses the provider to ask for a signature
     */
    const signature = await provider.getSigner().signMessage(message.signMessage());
    message.signature = signature;

    /**
     * Calls our sign_in endpoint to validate the message, if successful it will
     * save the message in the session and allow the user to store his text
     */
    fetch(`/api/sign_in`, {
        method: 'POST',
        body: JSON.stringify({ message, ens }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    }).then(async (res) => {
        if (res.status === 200) {
            res.json().then(({ text, address, ens }) => {
                console.log(text)
                console.log(address)
                console.log(ens)
                return;
            });
        } else {
            res.json().then((err) => {
                console.error(err);
            });
        }
    });
};

const signOut = async () => {
//
};
