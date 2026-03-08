import http from 'http';

async function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- Testing Backend Auth Flow ---');

    const email = 'test' + Date.now() + '@miden.com';
    const password = 'midenpassword';

    // 1. Test Registration
    console.log('\\n1. Testing /api/register...');
    const regRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email, password });

    console.log('Status code:', regRes.status);
    console.log('Response:', regRes.body);
    if (regRes.status !== 201) throw new Error('Registration failed');

    const token = regRes.body.token;

    // 2. Test Login
    console.log('\\n2. Testing /api/login...');
    const loginRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email, password });

    console.log('Status code:', loginRes.status);
    console.log('Response:', loginRes.body);
    if (loginRes.status !== 200) throw new Error('Login failed');

    // 3. Test Bind Wallet
    console.log('\\n3. Testing /api/account/bind...');
    const bindRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/account/bind',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    }, { midenAccountId: '0x1234567890abcdef' });

    console.log('Status code:', bindRes.status);
    console.log('Response:', bindRes.body);
    if (bindRes.status !== 200) throw new Error('Bind failed');

    // 4. Test Fetch Account Config
    console.log('\\n4. Testing /api/account/me...');
    const meRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/account/me',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    console.log('Status code:', meRes.status);
    console.log('Response:', meRes.body);
    if (meRes.status !== 200 || meRes.body.miden_account_id !== '0x1234567890abcdef') throw new Error('Fetch bound account failed');

    // 5. Test Vite proxy
    console.log('\\n5. Testing Vite Dev Server /api/ proxy...');
    const proxyRes = await request({
        hostname: 'localhost',
        port: 5173,
        path: '/api/account/me',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });

    console.log('Vite Proxy Status:', proxyRes.status);
    console.log('Vite Proxy Response:', proxyRes.body);

    if (proxyRes.status !== 200) {
        console.error('Vite Proxy failed. The UI might not be able to talk to the backend!');
    } else {
        console.log('All backend and proxy tests PASSED. \\u2714\\ufe0f');
    }
}

runTests().catch(console.error);
