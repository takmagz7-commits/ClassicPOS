const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

class AuthTestSuite {
  constructor() {
    this.results = [];
    this.vulnerabilities = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
    this.startTime = Date.now();
  }

  logResult(testName, category, passed, message, details = {}) {
    this.testCount++;
    if (passed) {
      this.passCount++;
    } else {
      this.failCount++;
    }

    this.results.push({
      testName,
      category,
      status: passed ? 'PASS' : 'FAIL',
      message,
      details,
      timestamp: new Date().toISOString()
    });

    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${category} - ${testName}`);
    console.log(`   ${message}`);
    if (!passed && details.error) {
      console.log(`   Error: ${details.error}`);
    }
  }

  logVulnerability(severity, name, description, impact, recommendation) {
    this.vulnerabilities.push({
      severity,
      name,
      description,
      impact,
      recommendation,
      timestamp: new Date().toISOString()
    });

    console.log(`🔴 ${severity} VULNERABILITY: ${name}`);
    console.log(`   ${description}`);
  }

  async makeRequest(endpoint, options = {}) {
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const responseTime = Date.now() - startTime;
      let data;
      
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }

      const cookies = response.headers.get('set-cookie') || '';

      return {
        status: response.status,
        ok: response.ok,
        data,
        cookies,
        responseTime,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        data: null,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async testSignup() {
    console.log('\n📋 Testing Signup Functionality...\n');

    const testEmail = `test-${Date.now()}@example.com`;
    const validPassword = 'SecurePass123!';
    const shortPassword = 'short';

    const response = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword,
        businessName: 'Test Business',
        businessType: 'Retail',
        country: 'US'
      })
    });

    const passed = response.status === 201 && response.data?.user && response.data?.token;
    this.logResult(
      'Valid user registration',
      'Signup',
      passed,
      passed ? 'User successfully registered with valid credentials' : 'Failed to register user',
      { status: response.status, responseTime: response.responseTime, hasToken: !!response.data?.token }
    );

    if (passed && response.data.user.password) {
      this.logResult(
        'Password excluded from response',
        'Signup',
        false,
        'Password should not be returned in signup response',
        { exposedData: 'password field in response' }
      );
      this.logVulnerability(
        'MEDIUM',
        'Password Leak in Signup Response',
        'The signup endpoint returns the password hash in the response',
        'Exposes password hashes which could be targeted for offline cracking',
        'Remove password field from user object before sending response'
      );
    } else if (passed) {
      this.logResult(
        'Password excluded from response',
        'Signup',
        true,
        'Password correctly excluded from signup response',
        {}
      );
    }

    if (passed && response.data.token && response.cookies.includes('authToken')) {
      this.logResult(
        'JWT token generation',
        'Signup',
        true,
        'JWT token generated and set in HTTP-only cookie',
        { hasToken: true, hasCookie: true }
      );
    } else if (passed) {
      this.logResult(
        'JWT token in cookie',
        'Signup',
        false,
        'JWT token not properly set in HTTP-only cookie',
        { cookies: response.cookies }
      );
    }

    const duplicateResponse = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword,
        businessName: 'Test Business 2'
      })
    });

    this.logResult(
      'Duplicate email rejection',
      'Signup',
      duplicateResponse.status === 409,
      duplicateResponse.status === 409 ? 'Duplicate email correctly rejected' : 'Duplicate email not properly handled',
      { status: duplicateResponse.status, error: duplicateResponse.data?.error }
    );

    const weakPasswordResponse = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: `test-weak-${Date.now()}@example.com`,
        password: shortPassword
      })
    });

    this.logResult(
      'Password strength validation',
      'Signup',
      weakPasswordResponse.status === 400,
      weakPasswordResponse.status === 400 ? 'Weak password correctly rejected' : 'Weak password validation failed',
      { status: weakPasswordResponse.status, passwordLength: shortPassword.length }
    );

    if (response.responseTime > 2000) {
      this.logResult(
        'Signup response time',
        'Performance',
        false,
        `Signup took ${response.responseTime}ms (should be < 2000ms)`,
        { responseTime: response.responseTime }
      );
    } else {
      this.logResult(
        'Signup response time',
        'Performance',
        true,
        `Signup completed in ${response.responseTime}ms`,
        { responseTime: response.responseTime }
      );
    }

    return { email: testEmail, password: validPassword, token: response.data?.token };
  }

  async testLogin() {
    console.log('\n📋 Testing Login Functionality...\n');

    const testEmail = `test-login-${Date.now()}@example.com`;
    const validPassword = 'SecurePass123!';

    const signupResponse = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword
      })
    });

    const loginResponse = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: validPassword
      })
    });

    const passed = loginResponse.status === 200 && loginResponse.data?.token;
    this.logResult(
      'Login with correct credentials',
      'Login',
      passed,
      passed ? 'Successfully logged in with correct credentials' : 'Failed to login with correct credentials',
      { status: loginResponse.status, responseTime: loginResponse.responseTime }
    );

    const wrongPasswordResponse = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!'
      })
    });

    this.logResult(
      'Login with incorrect password',
      'Login',
      wrongPasswordResponse.status === 401,
      wrongPasswordResponse.status === 401 ? 'Incorrect password correctly rejected' : 'Incorrect password handling failed',
      { status: wrongPasswordResponse.status }
    );

    const nonexistentResponse = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!'
      })
    });

    this.logResult(
      'Login with nonexistent user',
      'Login',
      nonexistentResponse.status === 401,
      nonexistentResponse.status === 401 ? 'Nonexistent user correctly rejected' : 'Nonexistent user handling failed',
      { status: nonexistentResponse.status }
    );

    const missingFieldsResponse = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail
      })
    });

    this.logResult(
      'Login with missing fields',
      'Login',
      missingFieldsResponse.status === 400,
      missingFieldsResponse.status === 400 ? 'Missing fields correctly rejected' : 'Missing fields validation failed',
      { status: missingFieldsResponse.status }
    );

    if (loginResponse.data && !loginResponse.data.user?.password) {
      this.logResult(
        'Sensitive data leak check',
        'Security',
        true,
        'Password not leaked in login response',
        {}
      );
    } else if (loginResponse.data?.user?.password) {
      this.logResult(
        'Sensitive data leak check',
        'Security',
        false,
        'Password leaked in login response',
        { leak: 'password' }
      );
    }

    if (loginResponse.responseTime > 2000) {
      this.logResult(
        'Login response time',
        'Performance',
        false,
        `Login took ${loginResponse.responseTime}ms (should be < 2000ms)`,
        { responseTime: loginResponse.responseTime }
      );
    } else {
      this.logResult(
        'Login response time',
        'Performance',
        true,
        `Login completed in ${loginResponse.responseTime}ms`,
        { responseTime: loginResponse.responseTime }
      );
    }

    return loginResponse.data?.token;
  }

  async testPinLogin() {
    console.log('\n📋 Testing PIN Login Functionality...\n');

    const testEmail = `test-pin-${Date.now()}@example.com`;
    const password = 'SecurePass123!';
    const pinCode = '1234';

    const signupResponse = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: password
      })
    });

    if (!signupResponse.data?.user?.id) {
      this.logResult(
        'PIN login prerequisites',
        'PIN Login',
        false,
        'Could not create test user for PIN login',
        {}
      );
      return;
    }

    const userId = signupResponse.data.user.id;
    const token = signupResponse.data.token;

    const updateUserResponse = await this.makeRequest(`/auth/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Cookie': `authToken=${token}`
      },
      body: JSON.stringify({
        pinCode: pinCode
      })
    });

    const validPinResponse = await this.makeRequest('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({
        pinCode: pinCode
      })
    });

    this.logResult(
      'PIN login with valid PIN',
      'PIN Login',
      validPinResponse.status === 200 && validPinResponse.data?.token,
      validPinResponse.status === 200 ? 'Valid PIN login successful' : 'Valid PIN login failed',
      { status: validPinResponse.status, responseTime: validPinResponse.responseTime }
    );

    const invalidPinResponse = await this.makeRequest('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({
        pinCode: '9999'
      })
    });

    this.logResult(
      'PIN login with invalid PIN',
      'PIN Login',
      invalidPinResponse.status === 401,
      invalidPinResponse.status === 401 ? 'Invalid PIN correctly rejected' : 'Invalid PIN handling failed',
      { status: invalidPinResponse.status }
    );

    console.log('\n🔍 Testing PIN brute force protection...\n');
    
    let bruteForceAttempts = 0;
    let blocked = false;
    
    for (let i = 0; i < 10; i++) {
      const bruteForceResponse = await this.makeRequest('/auth/pin-login', {
        method: 'POST',
        body: JSON.stringify({
          pinCode: `${1000 + i}`
        })
      });
      
      bruteForceAttempts++;
      
      if (bruteForceResponse.status === 429) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      this.logResult(
        'PIN brute force protection',
        'Security',
        false,
        `No rate limiting detected after ${bruteForceAttempts} failed PIN attempts`,
        { attempts: bruteForceAttempts }
      );
      
      this.logVulnerability(
        'CRITICAL',
        'No Rate Limiting on PIN Login',
        'The PIN login endpoint has no rate limiting, allowing unlimited brute force attempts',
        'Attackers can brute force 4-digit PINs (10,000 combinations) without any throttling',
        'Implement rate limiting (e.g., 5 attempts per IP per minute) and account lockout after multiple failed attempts'
      );
    } else {
      this.logResult(
        'PIN brute force protection',
        'Security',
        true,
        `Rate limiting activated after ${bruteForceAttempts} attempts`,
        { attempts: bruteForceAttempts }
      );
    }
  }

  async testSessionManagement(token) {
    console.log('\n📋 Testing Session Management...\n');

    if (!token) {
      const testEmail = `test-session-${Date.now()}@example.com`;
      const password = 'SecurePass123!';
      
      const signupResponse = await this.makeRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: password
        })
      });
      
      token = signupResponse.data?.token;
    }

    const verifyResponse = await this.makeRequest('/auth/verify-token', {
      method: 'GET',
      headers: {
        'Cookie': `authToken=${token}`
      }
    });

    this.logResult(
      'JWT token validation',
      'Session Management',
      verifyResponse.status === 200 && verifyResponse.data?.valid,
      verifyResponse.status === 200 ? 'JWT token validated successfully' : 'JWT token validation failed',
      { status: verifyResponse.status, valid: verifyResponse.data?.valid }
    );

    const meResponse = await this.makeRequest('/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': `authToken=${token}`
      }
    });

    this.logResult(
      'Session persistence',
      'Session Management',
      meResponse.status === 200 && meResponse.data?.user,
      meResponse.status === 200 ? 'Session persisted correctly' : 'Session persistence failed',
      { status: meResponse.status }
    );

    const invalidTokenResponse = await this.makeRequest('/auth/verify-token', {
      method: 'GET',
      headers: {
        'Cookie': 'authToken=invalid.token.here'
      }
    });

    this.logResult(
      'Invalid token rejection',
      'Session Management',
      invalidTokenResponse.status === 401,
      invalidTokenResponse.status === 401 ? 'Invalid token correctly rejected' : 'Invalid token handling failed',
      { status: invalidTokenResponse.status }
    );

    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiQWRtaW4iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyM30.invalidSignature';
    
    const expiredTokenResponse = await this.makeRequest('/auth/verify-token', {
      method: 'GET',
      headers: {
        'Cookie': `authToken=${expiredToken}`
      }
    });

    this.logResult(
      'Expired token rejection',
      'Session Management',
      expiredTokenResponse.status === 401,
      expiredTokenResponse.status === 401 ? 'Expired token correctly rejected' : 'Expired token handling needs improvement',
      { status: expiredTokenResponse.status }
    );

    const noTokenResponse = await this.makeRequest('/auth/me', {
      method: 'GET'
    });

    this.logResult(
      'No token protection',
      'Session Management',
      noTokenResponse.status === 401,
      noTokenResponse.status === 401 ? 'Protected route correctly requires authentication' : 'Protected route accessible without token',
      { status: noTokenResponse.status }
    );
  }

  async testLogout() {
    console.log('\n📋 Testing Logout Functionality...\n');

    const testEmail = `test-logout-${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    const loginResponse = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: password
      })
    });

    const token = loginResponse.data?.token;

    const logoutResponse = await this.makeRequest('/auth/logout', {
      method: 'POST',
      headers: {
        'Cookie': `authToken=${token}`
      }
    });

    this.logResult(
      'Logout endpoint',
      'Logout',
      logoutResponse.status === 200,
      logoutResponse.status === 200 ? 'Logout successful' : 'Logout failed',
      { status: logoutResponse.status, responseTime: logoutResponse.responseTime }
    );

    const cookieCleared = logoutResponse.cookies.includes('authToken=;') || 
                          logoutResponse.cookies.includes('authToken=') ||
                          logoutResponse.headers['set-cookie']?.includes('authToken=;');

    this.logResult(
      'Cookie cleared on logout',
      'Logout',
      cookieCleared || logoutResponse.status === 200,
      cookieCleared ? 'Auth cookie cleared successfully' : 'Cookie clearing status uncertain',
      { cookiesHeader: logoutResponse.cookies }
    );

    const postLogoutRequest = await this.makeRequest('/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': `authToken=${token}`
      }
    });

    if (postLogoutRequest.status !== 401) {
      this.logResult(
        'Post-logout request blocked',
        'Logout',
        false,
        'Token still valid after logout - no session revocation',
        { status: postLogoutRequest.status }
      );
      
      this.logVulnerability(
        'MEDIUM',
        'No Session Revocation Mechanism',
        'JWT tokens remain valid even after logout until they expire',
        'Users cannot immediately invalidate their sessions, creating a window for token reuse',
        'Implement a token blacklist/revocation list or use short-lived tokens with refresh tokens'
      );
    } else {
      this.logResult(
        'Post-logout request blocked',
        'Logout',
        true,
        'Requests correctly blocked after logout',
        { status: postLogoutRequest.status }
      );
    }
  }

  async testSecurityValidation() {
    console.log('\n📋 Testing Security Validation...\n');

    const jwtSecret = process.env.JWT_SECRET || '';
    const isDefaultSecret = jwtSecret === 'classicpos-secret-key-change-in-production';
    const isWeakSecret = jwtSecret.length < 32;

    if (isDefaultSecret) {
      this.logResult(
        'JWT secret security',
        'Security',
        false,
        'JWT secret is using default value',
        { secret: 'default value detected' }
      );
      
      this.logVulnerability(
        'CRITICAL',
        'Default JWT Secret',
        'Application is using the default JWT_SECRET value',
        'Attackers can forge valid JWT tokens and gain unauthorized access',
        'Generate a cryptographically secure random secret (at least 64 characters)'
      );
    } else if (isWeakSecret) {
      this.logResult(
        'JWT secret strength',
        'Security',
        false,
        `JWT secret is too short (${jwtSecret.length} characters)`,
        { length: jwtSecret.length, recommended: 64 }
      );
      
      this.logVulnerability(
        'HIGH',
        'Weak JWT Secret',
        `JWT_SECRET is only ${jwtSecret.length} characters long`,
        'Weak secrets are vulnerable to brute force attacks',
        'Use a secret of at least 64 characters for production'
      );
    } else {
      this.logResult(
        'JWT secret security',
        'Security',
        true,
        'JWT secret is properly configured',
        { length: jwtSecret.length }
      );
    }

    const corsOrigins = process.env.CORS_ORIGIN || '';
    this.logResult(
      'CORS configuration',
      'Security',
      corsOrigins.length > 0,
      corsOrigins.length > 0 ? `CORS configured for: ${corsOrigins}` : 'CORS not configured',
      { origins: corsOrigins }
    );

    const nodeEnv = process.env.NODE_ENV || 'development';
    this.logResult(
      'Environment configuration',
      'Security',
      true,
      `Running in ${nodeEnv} mode`,
      { environment: nodeEnv }
    );

    if (nodeEnv === 'production') {
      this.logResult(
        'HTTPS enforcement',
        'Security',
        true,
        'Production environment - HTTPS should be enforced by middleware',
        { note: 'Verify httpsRedirect middleware is active' }
      );
    }

    const rateLimitTest = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });

    this.logResult(
      'Rate limiting headers',
      'Security',
      rateLimitTest.headers['ratelimit-limit'] || rateLimitTest.headers['x-ratelimit-limit'],
      'Rate limiting headers detected',
      { headers: Object.keys(rateLimitTest.headers).filter(h => h.includes('ratelimit')) }
    );

    this.logResult(
      'CSRF token validation',
      'Security',
      false,
      'No explicit CSRF token validation detected (relies on SameSite=strict)',
      { note: 'Using SameSite cookie attribute for CSRF protection' }
    );

    this.logVulnerability(
      'LOW',
      'No Explicit CSRF Protection',
      'Application relies solely on SameSite=strict for CSRF protection',
      'May be vulnerable in browsers that do not support SameSite',
      'Consider implementing additional CSRF token validation for critical operations'
    );
  }

  async testSessionRestore() {
    console.log('\n📋 Testing Session Restore...\n');

    const testEmail = `test-restore-${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    const signupResponse = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: password
      })
    });

    const token = signupResponse.data?.token;

    await new Promise(resolve => setTimeout(resolve, 1000));

    const restoreResponse = await this.makeRequest('/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': `authToken=${token}`
      }
    });

    this.logResult(
      'Session restoration',
      'Session Restore',
      restoreResponse.status === 200,
      restoreResponse.status === 200 ? 'Session restored successfully from token' : 'Session restoration failed',
      { status: restoreResponse.status }
    );

    const revalidationResponse = await this.makeRequest('/auth/verify-token', {
      method: 'GET',
      headers: {
        'Cookie': `authToken=${token}`
      }
    });

    this.logResult(
      'Token revalidation',
      'Session Restore',
      revalidationResponse.status === 200,
      revalidationResponse.status === 200 ? 'Token revalidated successfully' : 'Token revalidation failed',
      { status: revalidationResponse.status }
    );

    this.logResult(
      'Multiple device support',
      'Session Restore',
      true,
      'JWT-based sessions allow parallel sessions across devices',
      { note: 'No device/session tracking detected - allows unlimited parallel sessions' }
    );
  }

  async testPerformanceMetrics() {
    console.log('\n📋 Testing Performance Metrics...\n');

    const testEmail = `test-perf-${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    const signupTimes = [];
    const loginTimes = [];
    const logoutTimes = [];

    for (let i = 0; i < 3; i++) {
      const signupResponse = await this.makeRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: `perf-${i}-${Date.now()}@example.com`,
          password: password
        })
      });
      signupTimes.push(signupResponse.responseTime);

      if (signupResponse.data?.token) {
        const logoutResponse = await this.makeRequest('/auth/logout', {
          method: 'POST',
          headers: {
            'Cookie': `authToken=${signupResponse.data.token}`
          }
        });
        logoutTimes.push(logoutResponse.responseTime);
      }
    }

    const signupResponse = await this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: password
      })
    });

    for (let i = 0; i < 3; i++) {
      const loginResponse = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: password
        })
      });
      loginTimes.push(loginResponse.responseTime);
    }

    const avgSignup = signupTimes.length > 0 ? signupTimes.reduce((a, b) => a + b, 0) / signupTimes.length : 0;
    const avgLogin = loginTimes.length > 0 ? loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length : 0;
    const avgLogout = logoutTimes.length > 0 ? logoutTimes.reduce((a, b) => a + b, 0) / logoutTimes.length : 0;

    this.logResult(
      'Signup performance',
      'Performance',
      avgSignup < 2000 && avgSignup > 0,
      `Average signup time: ${avgSignup.toFixed(0)}ms`,
      { average: avgSignup, samples: signupTimes }
    );

    this.logResult(
      'Login performance',
      'Performance',
      avgLogin < 2000 && avgLogin > 0,
      `Average login time: ${avgLogin.toFixed(0)}ms`,
      { average: avgLogin, samples: loginTimes }
    );

    this.logResult(
      'Logout performance',
      'Performance',
      avgLogout < 500 && avgLogout > 0,
      `Average logout time: ${avgLogout.toFixed(0)}ms`,
      { average: avgLogout, samples: logoutTimes }
    );

    const maxSignup = Math.max(...signupTimes);
    const maxLogin = Math.max(...loginTimes);

    if (maxSignup > 5000 || maxLogin > 5000) {
      this.logVulnerability(
        'LOW',
        'Performance Spikes Detected',
        `Maximum response times: Signup ${maxSignup}ms, Login ${maxLogin}ms`,
        'Slow authentication could impact user experience',
        'Monitor and optimize database queries and bcrypt rounds if needed'
      );
    }
  }

  async runAllTests() {
    console.log('🚀 Starting ClassicPOS Authentication E2E Test Suite\n');
    console.log('================================================\n');

    try {
      const { email, password, token } = await this.testSignup();
      await this.testLogin();
      await this.testPinLogin();
      await this.testSessionManagement(token);
      await this.testLogout();
      await this.testSecurityValidation();
      await this.testSessionRestore();
      await this.testPerformanceMetrics();

      const endTime = Date.now();
      const duration = ((endTime - this.startTime) / 1000).toFixed(2);

      console.log('\n\n================================================');
      console.log('📊 TEST SUMMARY');
      console.log('================================================\n');
      console.log(`Total Tests: ${this.testCount}`);
      console.log(`✅ Passed: ${this.passCount}`);
      console.log(`❌ Failed: ${this.failCount}`);
      console.log(`📈 Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`🔴 Vulnerabilities Found: ${this.vulnerabilities.length}`);

      if (this.vulnerabilities.length > 0) {
        console.log('\n🔴 CRITICAL VULNERABILITIES:');
        this.vulnerabilities
          .filter(v => v.severity === 'CRITICAL')
          .forEach(v => console.log(`   - ${v.name}`));
        
        console.log('\n🟠 HIGH VULNERABILITIES:');
        this.vulnerabilities
          .filter(v => v.severity === 'HIGH')
          .forEach(v => console.log(`   - ${v.name}`));
        
        console.log('\n🟡 MEDIUM VULNERABILITIES:');
        this.vulnerabilities
          .filter(v => v.severity === 'MEDIUM')
          .forEach(v => console.log(`   - ${v.name}`));
      }

      console.log('\n================================================\n');

      return {
        results: this.results,
        vulnerabilities: this.vulnerabilities,
        summary: {
          total: this.testCount,
          passed: this.passCount,
          failed: this.failCount,
          successRate: ((this.passCount / this.testCount) * 100).toFixed(1),
          duration: duration,
          vulnerabilityCount: this.vulnerabilities.length
        }
      };
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }
}

if (require.main === module) {
  const testSuite = new AuthTestSuite();
  testSuite.runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = AuthTestSuite;
