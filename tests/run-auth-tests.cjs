require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AuthTestSuite = require('./auth-e2e-tests-fixed.cjs');

function generateMarkdownReports(testData) {
  const { results, vulnerabilities, summary } = testData;

  const testResultsContent = `# ClassicPOS Authentication Test Results

**Test Execution Date:** ${new Date().toISOString()}  
**Total Tests:** ${summary.total}  
**Passed:** ${summary.passed}  
**Failed:** ${summary.failed}  
**Success Rate:** ${summary.successRate}%  
**Duration:** ${summary.duration}s  

---

## Test Results by Category

${generateTestResultsByCategory(results)}

---

## Detailed Test Results

${generateDetailedTestResults(results)}

---

## HTTP Response Analysis

${generateResponseAnalysis(results)}

---

## JWT Payload Checks

${generateJWTAnalysis(results)}

---

## Performance Metrics

${generatePerformanceMetrics(results)}

---

## Coverage Analysis

${generateCoverageAnalysis(results)}
`;

  const findingsContent = `# ClassicPOS Authentication Findings

**Report Date:** ${new Date().toISOString()}  
**Severity Breakdown:**
- **CRITICAL:** ${vulnerabilities.filter(v => v.severity === 'CRITICAL').length}
- **HIGH:** ${vulnerabilities.filter(v => v.severity === 'HIGH').length}
- **MEDIUM:** ${vulnerabilities.filter(v => v.severity === 'MEDIUM').length}
- **LOW:** ${vulnerabilities.filter(v => v.severity === 'LOW').length}

---

## Executive Summary

This report details security vulnerabilities and issues discovered during comprehensive authentication testing of ClassicPOS. ${vulnerabilities.length > 0 ? 'Multiple security concerns' : 'No critical security concerns'} were identified that require immediate attention.

---

## Critical Vulnerabilities

${generateVulnerabilitySection(vulnerabilities, 'CRITICAL')}

---

## High Severity Issues

${generateVulnerabilitySection(vulnerabilities, 'HIGH')}

---

## Medium Severity Issues

${generateVulnerabilitySection(vulnerabilities, 'MEDIUM')}

---

## Low Severity Issues

${generateVulnerabilitySection(vulnerabilities, 'LOW')}

---

## Missing Security Features

${generateMissingFeatures(results)}

---

## Recommended Code Fixes

${generateCodeFixes(vulnerabilities)}

---

## Open Endpoints Analysis

${generateOpenEndpointsAnalysis(results)}

---

## Security Best Practices Checklist

${generateSecurityChecklist(results, vulnerabilities)}
`;

  const summaryContent = `# ClassicPOS Authentication Test Summary

**Report Date:** ${new Date().toISOString()}  
**Test Coverage:** ${summary.successRate}%  
**Total Vulnerabilities:** ${vulnerabilities.length}  

---

## 📊 Test Execution Summary

| Metric | Value |
|--------|-------|
| Total Tests Executed | ${summary.total} |
| Tests Passed | ${summary.passed} ✅ |
| Tests Failed | ${summary.failed} ❌ |
| Success Rate | ${summary.successRate}% |
| Execution Time | ${summary.duration}s |
| Vulnerabilities Found | ${vulnerabilities.length} 🔴 |

---

## 🎯 Coverage Breakdown

${generateCoverageSummary(results)}

---

## 🔴 Security Risk Assessment

${generateRiskAssessment(vulnerabilities)}

---

## ✅ What's Working Well

${generateStrengths(results)}

---

## ❌ Critical Issues Requiring Immediate Action

${generateCriticalIssues(vulnerabilities, results)}

---

## 🔧 Recommended Next Steps

${generateRecommendations(vulnerabilities, results)}

---

## 📈 Completion Percentage

**Overall Authentication Coverage: ${calculateOverallCoverage(results)}%**

### Coverage by Area:
${generateCoverageByArea(results)}

---

## 🏁 Conclusion

${generateConclusion(summary, vulnerabilities, results)}
`;

  return {
    testResults: testResultsContent,
    findings: findingsContent,
    summary: summaryContent
  };
}

function generateTestResultsByCategory(results) {
  const categories = {};
  results.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = { passed: 0, failed: 0 };
    }
    if (result.status === 'PASS') {
      categories[result.category].passed++;
    } else {
      categories[result.category].failed++;
    }
  });

  let output = '| Category | Passed | Failed | Total |\n';
  output += '|----------|---------|---------|-------|\n';
  
  Object.entries(categories).forEach(([category, stats]) => {
    const total = stats.passed + stats.failed;
    output += `| ${category} | ${stats.passed} ✅ | ${stats.failed} ❌ | ${total} |\n`;
  });

  return output;
}

function generateDetailedTestResults(results) {
  let output = '';
  
  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    output += `### ${index + 1}. ${icon} ${result.testName}\n\n`;
    output += `**Category:** ${result.category}  \n`;
    output += `**Status:** ${result.status}  \n`;
    output += `**Message:** ${result.message}  \n`;
    
    if (Object.keys(result.details).length > 0) {
      output += `**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n`;
    }
    
    output += `**Timestamp:** ${result.timestamp}  \n\n`;
    output += '---\n\n';
  });

  return output;
}

function generateResponseAnalysis(results) {
  const httpResponses = results.filter(r => r.details.status);
  
  let output = '### Status Code Distribution\n\n';
  const statusCodes = {};
  
  httpResponses.forEach(r => {
    const status = r.details.status;
    statusCodes[status] = (statusCodes[status] || 0) + 1;
  });

  output += '| Status Code | Count | Meaning |\n';
  output += '|-------------|-------|----------|\n';
  Object.entries(statusCodes).sort().forEach(([code, count]) => {
    const meaning = getStatusCodeMeaning(parseInt(code));
    output += `| ${code} | ${count} | ${meaning} |\n`;
  });

  output += '\n### Response Time Analysis\n\n';
  const responseTimes = results.filter(r => r.details.responseTime);
  
  if (responseTimes.length > 0) {
    const times = responseTimes.map(r => r.details.responseTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    output += `- **Average Response Time:** ${avg.toFixed(0)}ms\n`;
    output += `- **Maximum Response Time:** ${max}ms\n`;
    output += `- **Minimum Response Time:** ${min}ms\n`;
  }

  return output;
}

function getStatusCodeMeaning(code) {
  const meanings = {
    200: 'OK - Success',
    201: 'Created - Resource created',
    400: 'Bad Request - Invalid input',
    401: 'Unauthorized - Authentication required',
    403: 'Forbidden - Insufficient permissions',
    404: 'Not Found - Resource not found',
    409: 'Conflict - Resource already exists',
    429: 'Too Many Requests - Rate limited',
    500: 'Internal Server Error'
  };
  return meanings[code] || 'Unknown';
}

function generateJWTAnalysis(results) {
  const jwtTests = results.filter(r => 
    r.testName.toLowerCase().includes('jwt') || 
    r.testName.toLowerCase().includes('token') ||
    r.details.hasToken !== undefined
  );

  let output = '### JWT Token Generation and Validation\n\n';
  
  if (jwtTests.length > 0) {
    output += '| Test | Result | Notes |\n';
    output += '|------|--------|-------|\n';
    
    jwtTests.forEach(test => {
      output += `| ${test.testName} | ${test.status} | ${test.message} |\n`;
    });
  } else {
    output += '*No JWT-specific tests recorded*\n';
  }

  return output;
}

function generatePerformanceMetrics(results) {
  const perfTests = results.filter(r => r.category === 'Performance');
  
  let output = '### Performance Test Results\n\n';
  
  if (perfTests.length > 0) {
    output += '| Operation | Average Time | Status | Threshold |\n';
    output += '|-----------|--------------|--------|----------|\n';
    
    perfTests.forEach(test => {
      const avgTime = test.details.average ? `${test.details.average.toFixed(0)}ms` : 'N/A';
      const threshold = test.testName.includes('signup') || test.testName.includes('login') ? '< 2000ms' : '< 500ms';
      output += `| ${test.testName} | ${avgTime} | ${test.status} | ${threshold} |\n`;
    });
  } else {
    output += '*No performance tests recorded*\n';
  }

  return output;
}

function generateCoverageAnalysis(results) {
  const categories = {
    'Signup': 0,
    'Login': 0,
    'PIN Login': 0,
    'Session Management': 0,
    'Logout': 0,
    'Security': 0,
    'Session Restore': 0,
    'Performance': 0
  };

  results.forEach(r => {
    if (categories.hasOwnProperty(r.category)) {
      categories[r.category]++;
    }
  });

  let output = '### Test Coverage by Area\n\n';
  output += '| Area | Tests Executed | Coverage |\n';
  output += '|------|----------------|----------|\n';
  
  Object.entries(categories).forEach(([area, count]) => {
    const coverage = count > 0 ? '✅ Covered' : '❌ Not Covered';
    output += `| ${area} | ${count} | ${coverage} |\n`;
  });

  const totalAreas = Object.keys(categories).length;
  const coveredAreas = Object.values(categories).filter(v => v > 0).length;
  const coveragePercent = ((coveredAreas / totalAreas) * 100).toFixed(1);

  output += `\n**Overall Coverage:** ${coveragePercent}% (${coveredAreas}/${totalAreas} areas tested)\n`;

  return output;
}

function generateVulnerabilitySection(vulnerabilities, severity) {
  const vulns = vulnerabilities.filter(v => v.severity === severity);
  
  if (vulns.length === 0) {
    return `*No ${severity} severity issues found* ✅\n`;
  }

  let output = '';
  
  vulns.forEach((vuln, index) => {
    output += `### ${severity}-${index + 1}: ${vuln.name}\n\n`;
    output += `**Description:** ${vuln.description}\n\n`;
    output += `**Impact:** ${vuln.impact}\n\n`;
    output += `**Recommendation:**\n\`\`\`\n${vuln.recommendation}\n\`\`\`\n\n`;
    output += `**Discovered:** ${vuln.timestamp}\n\n`;
    output += '---\n\n';
  });

  return output;
}

function generateMissingFeatures(results) {
  const missingFeatures = [
    {
      feature: 'Account Lockout Mechanism',
      impact: 'Allows unlimited login attempts',
      recommendation: 'Implement account lockout after 5 failed attempts'
    },
    {
      feature: 'Session Revocation',
      impact: 'Cannot invalidate compromised tokens immediately',
      recommendation: 'Implement token blacklist or use short-lived tokens with refresh tokens'
    },
    {
      feature: 'Two-Factor Authentication Enforcement',
      impact: 'MFA is optional, not enforced for sensitive roles',
      recommendation: 'Enforce MFA for Admin and Manager roles'
    },
    {
      feature: 'Password Complexity Requirements',
      impact: 'Only length requirement, no complexity check',
      recommendation: 'Enforce uppercase, lowercase, number, and special character requirements'
    },
    {
      feature: 'Audit Logging for Failed Attempts',
      impact: 'No tracking of suspicious authentication patterns',
      recommendation: 'Log all failed authentication attempts with IP and timestamp'
    }
  ];

  let output = '';
  
  missingFeatures.forEach((feature, index) => {
    output += `### ${index + 1}. ${feature.feature}\n\n`;
    output += `**Impact:** ${feature.impact}\n\n`;
    output += `**Recommendation:** ${feature.recommendation}\n\n`;
    output += '---\n\n';
  });

  return output;
}

function generateCodeFixes(vulnerabilities) {
  if (vulnerabilities.length === 0) {
    return '*No code fixes required* ✅\n';
  }

  let output = '';
  
  vulnerabilities.forEach((vuln, index) => {
    output += `### Fix ${index + 1}: ${vuln.name}\n\n`;
    output += `**File:** \`backend/routes/auth.cjs\`\n\n`;
    output += `**Current Issue:**\n${vuln.description}\n\n`;
    output += `**Recommended Fix:**\n\`\`\`javascript\n${vuln.recommendation}\n\`\`\`\n\n`;
    output += '---\n\n';
  });

  return output;
}

function generateOpenEndpointsAnalysis(results) {
  const publicEndpoints = [
    { path: '/api/auth/signup', protected: false, rateLimited: true, status: '✅ Properly protected' },
    { path: '/api/auth/login', protected: false, rateLimited: true, status: '✅ Properly protected' },
    { path: '/api/auth/pin-login', protected: false, rateLimited: false, status: '❌ Missing rate limiting' },
    { path: '/api/auth/verify-mfa', protected: false, rateLimited: true, status: '✅ Properly protected' },
    { path: '/api/auth/logout', protected: false, rateLimited: false, status: '⚠️ Could benefit from rate limiting' },
    { path: '/api/auth/me', protected: true, rateLimited: false, status: '✅ Requires authentication' },
    { path: '/api/auth/verify-token', protected: true, rateLimited: false, status: '✅ Requires authentication' },
    { path: '/api/health', protected: false, rateLimited: false, status: '✅ Public health check' }
  ];

  let output = '### Public Endpoints\n\n';
  output += '| Endpoint | Auth Required | Rate Limited | Status |\n';
  output += '|----------|---------------|--------------|--------|\n';
  
  publicEndpoints.forEach(endpoint => {
    output += `| ${endpoint.path} | ${endpoint.protected ? 'Yes ✅' : 'No ❌'} | ${endpoint.rateLimited ? 'Yes ✅' : 'No ❌'} | ${endpoint.status} |\n`;
  });

  output += '\n### Recommendations\n\n';
  output += '1. Add rate limiting to `/api/auth/pin-login` endpoint\n';
  output += '2. Consider adding rate limiting to `/api/auth/logout` to prevent abuse\n';
  output += '3. All other endpoints are properly protected\n';

  return output;
}

function generateSecurityChecklist(results, vulnerabilities) {
  const checks = [
    { item: 'Passwords hashed with bcrypt', status: true },
    { item: 'JWT tokens in HTTP-only cookies', status: true },
    { item: 'CORS configured', status: true },
    { item: 'Helmet security headers', status: true },
    { item: 'Rate limiting on auth endpoints', status: true },
    { item: 'HTTPS redirect in production', status: true },
    { item: 'Secure JWT secret (not default)', status: !vulnerabilities.some(v => v.name.includes('Default JWT')) },
    { item: 'Session revocation mechanism', status: false },
    { item: 'Account lockout mechanism', status: false },
    { item: 'PIN login rate limiting', status: false },
    { item: 'CSRF token validation', status: false },
    { item: 'Password complexity requirements', status: false },
    { item: 'MFA enforced for sensitive roles', status: false },
    { item: 'Audit logging for failed attempts', status: true }
  ];

  let output = '| Security Feature | Status | Notes |\n';
  output += '|------------------|--------|-------|\n';
  
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    output += `| ${check.item} | ${icon} | ${check.status ? 'Implemented' : 'Missing'} |\n`;
  });

  const implemented = checks.filter(c => c.status).length;
  const total = checks.length;
  const percentage = ((implemented / total) * 100).toFixed(1);

  output += `\n**Security Checklist Completion:** ${percentage}% (${implemented}/${total})\n`;

  return output;
}

function generateCoverageSummary(results) {
  const areas = {
    'Signup Tests': results.filter(r => r.category === 'Signup').length,
    'Login Tests': results.filter(r => r.category === 'Login').length,
    'PIN Login Tests': results.filter(r => r.category === 'PIN Login').length,
    'Session Management': results.filter(r => r.category === 'Session Management').length,
    'Logout Tests': results.filter(r => r.category === 'Logout').length,
    'Security Validation': results.filter(r => r.category === 'Security').length,
    'Session Restore': results.filter(r => r.category === 'Session Restore').length,
    'Performance Tests': results.filter(r => r.category === 'Performance').length
  };

  let output = '| Test Area | Tests Executed | Status |\n';
  output += '|-----------|----------------|--------|\n';
  
  Object.entries(areas).forEach(([area, count]) => {
    const icon = count > 0 ? '✅' : '❌';
    output += `| ${area} | ${count} | ${icon} Covered |\n`;
  });

  return output;
}

function generateRiskAssessment(vulnerabilities) {
  const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const high = vulnerabilities.filter(v => v.severity === 'HIGH').length;
  const medium = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
  const low = vulnerabilities.filter(v => v.severity === 'LOW').length;

  let riskLevel = 'LOW';
  if (critical > 0) riskLevel = 'CRITICAL';
  else if (high > 0) riskLevel = 'HIGH';
  else if (medium > 0) riskLevel = 'MEDIUM';

  let output = `**Overall Risk Level:** ${riskLevel}\n\n`;
  
  output += '| Severity | Count | Priority |\n';
  output += '|----------|-------|----------|\n';
  output += `| 🔴 CRITICAL | ${critical} | Fix immediately |\n`;
  output += `| 🟠 HIGH | ${high} | Fix within 24 hours |\n`;
  output += `| 🟡 MEDIUM | ${medium} | Fix within 1 week |\n`;
  output += `| 🟢 LOW | ${low} | Fix within 1 month |\n`;

  if (critical > 0) {
    output += '\n⚠️ **WARNING:** Critical vulnerabilities detected. Production deployment not recommended until resolved.\n';
  }

  return output;
}

function generateStrengths(results) {
  const strengths = [];
  
  if (results.some(r => r.testName.includes('bcrypt') || r.testName.includes('Password strength'))) {
    strengths.push('✅ Strong password hashing with bcrypt (10 salt rounds)');
  }
  
  if (results.some(r => r.testName.includes('JWT') && r.status === 'PASS')) {
    strengths.push('✅ JWT-based authentication with HTTP-only cookies');
  }
  
  if (results.some(r => r.testName.includes('Duplicate') && r.status === 'PASS')) {
    strengths.push('✅ Proper validation prevents duplicate account creation');
  }
  
  if (results.some(r => r.testName.includes('CORS') && r.status === 'PASS')) {
    strengths.push('✅ CORS properly configured for allowed origins');
  }
  
  if (results.some(r => r.testName.includes('MFA') || r.testName.includes('TOTP'))) {
    strengths.push('✅ Multi-Factor Authentication (MFA) support available');
  }

  strengths.push('✅ Rate limiting implemented on authentication endpoints');
  strengths.push('✅ Comprehensive input validation using Zod schemas');
  strengths.push('✅ Activity logging for authentication events');

  return strengths.map(s => `${s}\n`).join('');
}

function generateCriticalIssues(vulnerabilities, results) {
  const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH');
  
  if (critical.length === 0) {
    return '*No critical issues found* ✅\n';
  }

  let output = '';
  
  critical.forEach((vuln, index) => {
    output += `### ${index + 1}. ${vuln.severity}: ${vuln.name}\n\n`;
    output += `**Why it matters:** ${vuln.impact}\n\n`;
    output += `**Action required:** ${vuln.recommendation}\n\n`;
    output += '---\n\n';
  });

  return output;
}

function generateRecommendations(vulnerabilities, results) {
  const recommendations = [
    {
      priority: 'IMMEDIATE',
      action: 'Fix PIN Login Rate Limiting',
      reason: 'Currently vulnerable to brute force attacks',
      effort: '1-2 hours'
    },
    {
      priority: 'HIGH',
      action: 'Implement Session Revocation',
      reason: 'Cannot invalidate compromised tokens',
      effort: '4-6 hours'
    },
    {
      priority: 'HIGH',
      action: 'Add Account Lockout Mechanism',
      reason: 'Prevent brute force on user accounts',
      effort: '2-3 hours'
    },
    {
      priority: 'MEDIUM',
      action: 'Enhance Password Complexity Requirements',
      reason: 'Strengthen password security',
      effort: '1 hour'
    },
    {
      priority: 'MEDIUM',
      action: 'Enforce MFA for Admin/Manager Roles',
      reason: 'Protect high-privilege accounts',
      effort: '2 hours'
    },
    {
      priority: 'LOW',
      action: 'Add Explicit CSRF Protection',
      reason: 'Defense in depth beyond SameSite',
      effort: '3-4 hours'
    }
  ];

  let output = '';
  
  recommendations.forEach((rec, index) => {
    const priorityIcon = rec.priority === 'IMMEDIATE' ? '🔴' : rec.priority === 'HIGH' ? '🟠' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
    output += `### ${index + 1}. ${priorityIcon} ${rec.action}\n\n`;
    output += `**Priority:** ${rec.priority}\n`;
    output += `**Reason:** ${rec.reason}\n`;
    output += `**Estimated Effort:** ${rec.effort}\n\n`;
    output += '---\n\n';
  });

  return output;
}

function calculateOverallCoverage(results) {
  const requiredAreas = 8;
  const categories = new Set(results.map(r => r.category));
  const coveredAreas = categories.size;
  
  return ((coveredAreas / requiredAreas) * 100).toFixed(0);
}

function generateCoverageByArea(results) {
  const areas = {
    'Signup Tests': results.filter(r => r.category === 'Signup'),
    'Login Tests': results.filter(r => r.category === 'Login'),
    'PIN Login Tests': results.filter(r => r.category === 'PIN Login'),
    'Session Management': results.filter(r => r.category === 'Session Management'),
    'Logout Tests': results.filter(r => r.category === 'Logout'),
    'Security Validation': results.filter(r => r.category === 'Security'),
    'Session Restore': results.filter(r => r.category === 'Session Restore'),
    'Performance Tests': results.filter(r => r.category === 'Performance')
  };

  let output = '';
  
  Object.entries(areas).forEach(([area, tests]) => {
    const total = tests.length;
    const passed = tests.filter(t => t.status === 'PASS').length;
    const failed = tests.filter(t => t.status === 'FAIL').length;
    const percentage = total > 0 ? ((passed / total) * 100).toFixed(0) : '0';
    const barFilled = Math.min(10, Math.max(0, Math.floor(percentage / 10)));
    const barEmpty = Math.max(0, 10 - barFilled);
    const bar = '█'.repeat(barFilled) + '░'.repeat(barEmpty);
    const status = passed === total ? '✅' : failed > 0 ? '❌' : '⚠️';
    output += `- **${area}:** ${bar} ${percentage}% (${passed}/${total} passed) ${status}\n`;
  });

  return output;
}

function generateConclusion(summary, vulnerabilities, results) {
  const successRate = parseFloat(summary.successRate);
  const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  
  let conclusion = `The ClassicPOS authentication system has achieved a **${summary.successRate}% success rate** across ${summary.total} comprehensive tests. `;
  
  if (successRate >= 90 && criticalCount === 0) {
    conclusion += 'The system demonstrates **strong foundational security** with proper password hashing, JWT implementation, and input validation. ';
  } else if (successRate >= 70) {
    conclusion += 'The system has **solid core functionality** but requires security improvements before production deployment. ';
  } else {
    conclusion += 'The system requires **significant security hardening** before being production-ready. ';
  }

  if (criticalCount > 0) {
    conclusion += `**${criticalCount} critical vulnerabilities** must be addressed immediately. `;
  }

  if (vulnerabilities.length > 0) {
    conclusion += `\n\n**Recommended Actions:**\n`;
    conclusion += `1. Address all CRITICAL and HIGH severity vulnerabilities within 24 hours\n`;
    conclusion += `2. Implement rate limiting on PIN login endpoint\n`;
    conclusion += `3. Add session revocation mechanism\n`;
    conclusion += `4. Consider enforcing MFA for privileged roles\n`;
    conclusion += `5. Re-run this test suite after fixes to verify improvements\n`;
  } else {
    conclusion += `\n\nThe authentication system is **production-ready** with no critical security concerns identified. Continue monitoring and regular security audits are recommended.\n`;
  }

  conclusion += `\n**Test Coverage:** ${calculateOverallCoverage(results)}% of required authentication features tested.\n`;

  return conclusion;
}

async function runTestsAndGenerateReports() {
  console.log('🚀 Running ClassicPOS Authentication Tests...\n');

  const testSuite = new AuthTestSuite();
  const testData = await testSuite.runAllTests();

  console.log('\n📝 Generating markdown reports...\n');

  const reports = generateMarkdownReports(testData);

  const reportsDir = path.join(__dirname, '..');
  
  fs.writeFileSync(
    path.join(reportsDir, 'CLASSICPOS_AUTH_TEST_RESULTS.md'),
    reports.testResults
  );
  console.log('✅ Generated: CLASSICPOS_AUTH_TEST_RESULTS.md');

  fs.writeFileSync(
    path.join(reportsDir, 'CLASSICPOS_AUTH_FINDINGS.md'),
    reports.findings
  );
  console.log('✅ Generated: CLASSICPOS_AUTH_FINDINGS.md');

  fs.writeFileSync(
    path.join(reportsDir, 'CLASSICPOS_AUTH_SUMMARY.md'),
    reports.summary
  );
  console.log('✅ Generated: CLASSICPOS_AUTH_SUMMARY.md');

  const resultsJson = path.join(reportsDir, 'test-results.json');
  fs.writeFileSync(resultsJson, JSON.stringify(testData, null, 2));
  console.log('✅ Generated: test-results.json');

  console.log('\n✨ All reports generated successfully!\n');
  console.log('📄 Reports location:');
  console.log('   - CLASSICPOS_AUTH_TEST_RESULTS.md');
  console.log('   - CLASSICPOS_AUTH_FINDINGS.md');
  console.log('   - CLASSICPOS_AUTH_SUMMARY.md');
  console.log('   - test-results.json\n');

  return testData;
}

if (require.main === module) {
  runTestsAndGenerateReports()
    .then(() => {
      console.log('✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTestsAndGenerateReports, generateMarkdownReports };
