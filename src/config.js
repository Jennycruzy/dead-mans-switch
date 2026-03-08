// Central configuration for the Dead Man's Switch Miden integration
export const CONFIG = {
    // The deployed Account ID on the Miden Testnet
    CONTRACT_ACCOUNT_ID: '0x36f06d7c7efe8090301e04a7255956',

    // The RPC endpoint
    RPC_ENDPOINT: 'https://rpc.testnet.miden.io'
};

// Smart switch for API requests:
// Uses localhost when you are testing on your computer,
// and uses your live Render backend when hosted on Vercel.
export const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://YOUR_BACKEND_NAME.onrender.com'; // ⚠️ Replace this with your actual Render URL once deployed