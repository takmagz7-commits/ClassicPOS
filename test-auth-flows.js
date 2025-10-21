#!/usr/bin/env node

const API_BASE = 'http://localhost:3001/api';
let authToken = null;
let testUserId = null;
let mfaUserId = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken && !options.skipAuth) {
    headers['Cookie'] = `authToken=${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.headers.get('set-cookie')) {
      const cookies = response.headers.get('set-cookie');
      const match = cookies.match(/authToken=([^;]+)/);
      if (match) {
        authToken = match[1];
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      response,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

const tests = {
  results: {
    passed: 0,
    failed: 0,
    tests: [],
  },

  async test(name, fn) {
    log(colors.cyan, `\n🧪 TEST: ${name}`);
    try {
      await fn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      log(colors.green, '✅ PASSED');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      log(colors.red, `❌ FAILED: ${error.message}`);
    }
  },

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  },

  assertTrue(value, message) {
    if (!value) {
      throw new Error(message || 'Expected true, got false');
    }
  },

  assertFalse(value, message) {
    if (value) {
      throw new Error(message || 'Expected false, got true');
    }
  },
};

async function runAuthenticationTests() {
  log(colors.blue, '\n' + '='.repeat(60));
  log(colors.blue, '🔐 ClassicPOS Authentication Test Suite');
  log(colors.blue, '='.repeat(60));

  await tests.test('1. Database Health Check', async () => {
    const result = await apiCall('/health/db');
    tests.assertEqual(result.status, 200, 'Database should be ready');
    tests.assertTrue(result.data.ready, 'Database ready flag should be true');
  });

  await tests.test('2. Check System Status', async () => {
    const result = await apiCall('/auth/system-status');
    tests.assertEqual(result.status, 200, 'System status should return 200');
    log(colors.yellow, '   System State:', JSON.stringify(result.data, null, 2));
  });

  await tests.test('3. Signup Should Be Locked (System Already Initialized)', async () => {
    const result = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'Test12345',
        businessName: 'Test Business',
        businessType: 'Retail',
        country: 'US',
      }),
    });
    tests.assertEqual(result.status, 403, 'Signup should be forbidden');
    tests.assertTrue(
      result.data.message.includes('already configured'),
      'Should indicate system is already configured'
    );
  });

  await tests.test('4. Login with Invalid Credentials Should Fail', async () => {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'wrong@test.com',
        password: 'wrongpassword',
      }),
    });
    tests.assertEqual(result.status, 401, 'Invalid credentials should return 401');
  });

  await tests.test('5. Login with Valid Credentials (if known)', async () => {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'captainoscar333@atomicmail.io',
        password: 'Password123!',
      }),
    });
    
    if (result.status === 200 || result.status === 401) {
      if (result.status === 200) {
        tests.assertTrue(result.data.user !== undefined, 'User should be returned');
        tests.assertTrue(authToken !== null, 'Auth token should be set');
        testUserId = result.data.user.id;
        log(colors.green, '   ✓ Login successful, token obtained');
      } else {
        log(colors.yellow, '   ⚠ Login failed (password may be different)');
      }
    }
  });

  await tests.test('6. PIN Login - Invalid PIN Should Fail', async () => {
    const result = await apiCall('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({
        pinCode: '0000',
      }),
    });
    tests.assertEqual(result.status, 401, 'Invalid PIN should return 401');
    tests.assertTrue(
      result.data.attemptsRemaining !== undefined,
      'Should include remaining attempts'
    );
  });

  await tests.test('7. PIN Login - Rate Limiting After Multiple Failures', async () => {
    for (let i = 0; i < 5; i++) {
      await apiCall('/auth/pin-login', {
        method: 'POST',
        body: JSON.stringify({ pinCode: '0000' }),
      });
    }

    const result = await apiCall('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({ pinCode: '0000' }),
    });
    
    tests.assertEqual(result.status, 429, 'Should be rate limited after 5 attempts');
    tests.assertTrue(
      result.data.message.includes('Too many'),
      'Should indicate too many attempts'
    );
  });

  if (authToken) {
    await tests.test('8. Get Current User (Auth Required)', async () => {
      const result = await apiCall('/auth/me');
      tests.assertEqual(result.status, 200, 'Should return current user');
      tests.assertTrue(result.data.user !== undefined, 'User object should exist');
    });

    await tests.test('9. Verify Token Endpoint', async () => {
      const result = await apiCall('/auth/verify-token');
      tests.assertEqual(result.status, 200, 'Token should be valid');
      tests.assertTrue(result.data.valid === true, 'Valid flag should be true');
    });

    await tests.test('10. Get Users List (Admin Required)', async () => {
      const result = await apiCall('/auth/users');
      if (result.status === 200) {
        tests.assertTrue(Array.isArray(result.data), 'Should return array of users');
        log(colors.yellow, `   Found ${result.data.length} users`);
      } else {
        log(colors.yellow, '   ⚠ User list access denied (may not be admin)');
      }
    });

    await tests.test('11. Logout', async () => {
      const result = await apiCall('/auth/logout', {
        method: 'POST',
      });
      tests.assertEqual(result.status, 200, 'Logout should succeed');
      authToken = null;
    });

    await tests.test('12. Access Protected Route After Logout Should Fail', async () => {
      const result = await apiCall('/auth/me');
      tests.assertTrue(
        result.status === 401 || result.status === 403,
        'Should be unauthorized after logout'
      );
    });
  }

  log(colors.blue, '\n' + '='.repeat(60));
  log(colors.blue, '📊 TEST RESULTS SUMMARY');
  log(colors.blue, '='.repeat(60));
  log(colors.green, `✅ Passed: ${tests.results.passed}`);
  log(colors.red, `❌ Failed: ${tests.results.failed}`);
  log(
    colors.yellow,
    `📈 Total: ${tests.results.passed + tests.results.failed}`
  );
  log(
    tests.results.failed === 0 ? colors.green : colors.red,
    `\n🎯 Overall: ${tests.results.failed === 0 ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ⚠️'}`
  );

  log(colors.blue, '\n' + '='.repeat(60));
  log(colors.cyan, '📋 DETAILED TEST RESULTS');
  log(colors.blue, '='.repeat(60));
  tests.results.tests.forEach((test, index) => {
    const symbol = test.status === 'PASSED' ? '✅' : '❌';
    const color = test.status === 'PASSED' ? colors.green : colors.red;
    log(color, `${index + 1}. ${symbol} ${test.name}`);
    if (test.error) {
      log(colors.red, `   Error: ${test.error}`);
    }
  });

  process.exit(tests.results.failed === 0 ? 0 : 1);
}

runAuthenticationTests().catch((error) => {
  log(colors.red, '\n💥 Test suite crashed:', error);
  process.exit(1);
});
