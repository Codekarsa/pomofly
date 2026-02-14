// Simple test for URL extraction logic
// This simulates what happens in the TaskDetailClient

// Mock window.location for different scenarios
const testCases = [
    { pathname: '/tasks/task-123', expected: 'task-123' },
    { pathname: '/tasks/abc-def-456', expected: 'abc-def-456' },
    { pathname: '/tasks/_', expected: '_' },
    { pathname: '/tasks/', expected: '' },
];

function extractTaskId(pathname) {
    const taskIdFromUrl = pathname.split('/tasks/')[1];
    return taskIdFromUrl || '';
}

testCases.forEach(({ pathname, expected }) => {
    const result = extractTaskId(pathname);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} ${pathname} -> "${result}" (expected: "${expected}")`);
});

console.log('\nURL extraction logic test complete');