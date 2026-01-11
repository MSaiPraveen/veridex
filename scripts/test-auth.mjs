#!/usr/bin/env node
/**
 * Quick test script for auth-service endpoints
 */

const BASE_URL = 'http://localhost:3001';

async function test() {
  console.log('🧪 Testing Auth Service Endpoints\n');
  
  // Test 1: Health check
  console.log('1. Testing /health...');
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('   ✅ Health:', health.status);
  } catch (e) {
    console.log('   ❌ Health failed:', e.message);
    return;
  }
  
  // Test 2: Register
  const testEmail = `test${Date.now()}@example.com`;
  console.log(`\n2. Testing /auth/register with ${testEmail}...`);
  let tokens;
  try {
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123',
        firstName: 'Test',
        lastName: 'User',
      }),
    });
    const registerData = await registerRes.json();
    if (registerData.success) {
      console.log('   ✅ Registration successful');
      console.log('   User ID:', registerData.data.user.id);
      tokens = registerData.data.tokens;
    } else {
      console.log('   ❌ Registration failed:', registerData.error);
      return;
    }
  } catch (e) {
    console.log('   ❌ Registration failed:', e.message);
    return;
  }
  
  // Test 3: Login
  console.log('\n3. Testing /auth/login...');
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass123',
      }),
    });
    const loginData = await loginRes.json();
    if (loginData.success) {
      console.log('   ✅ Login successful');
      tokens = loginData.data.tokens;
    } else {
      console.log('   ❌ Login failed:', loginData.error);
    }
  } catch (e) {
    console.log('   ❌ Login failed:', e.message);
  }
  
  // Test 4: Get current user
  console.log('\n4. Testing /auth/me...');
  try {
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokens.accessToken}` },
    });
    const meData = await meRes.json();
    if (meData.success) {
      console.log('   ✅ Get current user successful');
      console.log('   Email:', meData.data.user.email);
      console.log('   Role:', meData.data.user.role);
    } else {
      console.log('   ❌ Get current user failed:', meData.error);
    }
  } catch (e) {
    console.log('   ❌ Get current user failed:', e.message);
  }
  
  // Test 5: Refresh tokens
  console.log('\n5. Testing /auth/refresh...');
  try {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: tokens.refreshToken,
      }),
    });
    const refreshData = await refreshRes.json();
    if (refreshData.success) {
      console.log('   ✅ Token refresh successful');
      tokens = refreshData.data.tokens;
    } else {
      console.log('   ❌ Token refresh failed:', refreshData.error);
    }
  } catch (e) {
    console.log('   ❌ Token refresh failed:', e.message);
  }
  
  // Test 6: Logout
  console.log('\n6. Testing /auth/logout...');
  try {
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({
        refreshToken: tokens.refreshToken,
      }),
    });
    const logoutData = await logoutRes.json();
    if (logoutData.success) {
      console.log('   ✅ Logout successful');
      console.log('   Revoked tokens:', logoutData.data.revokedCount);
    } else {
      console.log('   ❌ Logout failed:', logoutData.error);
    }
  } catch (e) {
    console.log('   ❌ Logout failed:', e.message);
  }
  
  // Test 7: Try using revoked refresh token
  console.log('\n7. Testing revoked token (should fail)...');
  try {
    const badRefreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: tokens.refreshToken,
      }),
    });
    const badRefreshData = await badRefreshRes.json();
    if (!badRefreshData.success) {
      console.log('   ✅ Correctly rejected revoked token');
    } else {
      console.log('   ❌ Should have rejected revoked token');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  console.log('\n✨ All tests completed!\n');
}

test().catch(console.error);
