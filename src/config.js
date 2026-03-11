// Central configuration for the Dead Man's Switch Miden integration
export const CONFIG = {
    // The deployed Account ID on the Miden Testnet
    CONTRACT_ACCOUNT_ID: '0x36f06d7c7efe8090301e04a7255956',

    // The RPC endpoint
    RPC_ENDPOINT: 'https://rpc.testnet.miden.io'
};

// Smart switch for API requests:
// On localhost, use empty string so requests go through Vite's /api proxy
// (avoids COOP/COEP cross-origin blocking).
// On production, point to your live Render backend.
export const API_BASE_URL = window.location.hostname === 'localhost'
    ? ''
    : 'https://dead-mans-switch-xa39.onrender.com'; // ⚠️ Replace this with your actual Render URL once deployed